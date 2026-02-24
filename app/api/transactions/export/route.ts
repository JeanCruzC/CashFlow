import { NextRequest, NextResponse } from "next/server";
import { requireOrgActorContext } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import { assertRateLimit } from "@/lib/server/rate-limit";
import {
    sanitizeIsoDate,
    sanitizeSearchTerm,
    sanitizeUuid,
} from "@/lib/server/input-sanitizers";

export const dynamic = "force-dynamic";

function escapeCsv(value: unknown) {
    const raw = value == null ? "" : String(value).replace(/[\u0000-\u001F\u007F]/g, " ");
    const maybeFormula = /^[=+\-@]/.test(raw) || raw.startsWith("\t");
    const safeRaw = maybeFormula ? `'${raw}` : raw;
    if (safeRaw.includes(",") || safeRaw.includes('"') || safeRaw.includes("\n")) {
        return `"${safeRaw.replaceAll('"', '""')}"`;
    }
    return safeRaw;
}

interface ExportTransactionRow {
    date: string;
    description: string;
    amount: number | string;
    currency: string;
    accounts: { name: string } | { name: string }[] | null;
    categories_gl: { name: string } | { name: string }[] | null;
}

export async function GET(request: NextRequest) {
    try {
        const { supabase, orgId, user } = await requireOrgActorContext();
        assertRateLimit({
            key: `export-transactions:${user.id}`,
            limit: 10,
            windowMs: 60_000,
            message: "Has alcanzado el límite de exportaciones por minuto.",
        });

        const searchParams = request.nextUrl.searchParams;
        const search = sanitizeSearchTerm(searchParams.get("search") ?? undefined, 120);
        const accountId = sanitizeUuid(searchParams.get("accountId") ?? undefined);
        const categoryId = sanitizeUuid(searchParams.get("categoryId") ?? undefined);
        const direction = searchParams.get("direction");
        const dateFrom = sanitizeIsoDate(searchParams.get("dateFrom") ?? undefined);
        const dateTo = sanitizeIsoDate(searchParams.get("dateTo") ?? undefined);

        let query = supabase
            .from("transactions")
            .select("date, description, amount, currency, accounts(name), categories_gl(name)")
            .eq("org_id", orgId)
            .order("date", { ascending: false })
            .limit(5000);

        if (search) {
            query = query.ilike("description", `%${search}%`);
        }
        if (accountId) {
            query = query.eq("account_id", accountId);
        }
        if (categoryId) {
            query = query.eq("category_gl_id", categoryId);
        }
        if (direction === "income") {
            query = query.gt("amount", 0);
        } else if (direction === "expense") {
            query = query.lt("amount", 0);
        }
        if (dateFrom) query = query.gte("date", dateFrom);
        if (dateTo) query = query.lte("date", dateTo);

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []) as ExportTransactionRow[];
        const header = ["fecha", "descripcion", "monto", "moneda", "cuenta", "categoria"];
        const csvLines = [header.join(",")];

        for (const row of rows) {
            const accountName =
                row.accounts && !Array.isArray(row.accounts) ? row.accounts.name : "";
            const categoryName =
                row.categories_gl && !Array.isArray(row.categories_gl)
                    ? row.categories_gl.name
                    : "";

            csvLines.push(
                [
                    escapeCsv(row.date),
                    escapeCsv(row.description),
                    escapeCsv(row.amount),
                    escapeCsv(row.currency),
                    escapeCsv(accountName),
                    escapeCsv(categoryName),
                ].join(",")
            );
        }

        const csv = csvLines.join("\n");
        const fileName = `cashflow-transacciones-${new Date().toISOString().slice(0, 10)}.csv`;

        return new NextResponse(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${fileName}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        logError("Error exporting transactions", error);
        return NextResponse.json(
            { error: "No se pudieron exportar las transacciones" },
            { status: 500 }
        );
    }
}
