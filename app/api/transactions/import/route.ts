import { NextResponse } from "next/server";
import { transactionSchema } from "@/lib/validations/schemas";
import { requireOrgActorContext } from "@/lib/server/context";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function normalizeHeader(header: string) {
    return header
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
}

function splitCsvLine(line: string, delimiter: string) {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            i += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    result.push(current.trim());
    return result;
}

function parseNumber(raw: string) {
    if (!raw) return NaN;
    const normalized = raw.replace(/\s/g, "").replace(",", ".");
    return Number(normalized);
}

export async function POST(request: Request) {
    try {
        const { supabase, orgId, user } = await requireOrgActorContext();
        assertRateLimit({
            key: `import-transactions:${user.id}`,
            limit: 5,
            windowMs: 60_000,
            message: "Has alcanzado el límite de importaciones por minuto.",
        });

        const formData = await request.formData();
        const file = formData.get("file");

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: "Archivo no válido" }, { status: 400 });
        }
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "El archivo excede el máximo permitido de 5MB" },
                { status: 400 }
            );
        }

        const text = await file.text();
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length < 2) {
            return NextResponse.json(
                { error: "El archivo CSV no contiene suficientes filas" },
                { status: 400 }
            );
        }

        const delimiter = lines[0].includes(";") ? ";" : ",";
        const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

        const { data: accounts, error: accountsError } = await supabase
            .from("accounts")
            .select("id, name")
            .eq("org_id", orgId);
        if (accountsError) throw accountsError;

        const { data: categories, error: categoriesError } = await supabase
            .from("categories_gl")
            .select("id, name")
            .eq("org_id", orgId);
        if (categoriesError) throw categoriesError;

        const accountByName = new Map(
            (accounts || []).map((account) => [account.name.trim().toLowerCase(), account.id])
        );
        const categoryByName = new Map(
            (categories || []).map((category) => [category.name.trim().toLowerCase(), category.id])
        );

        const toInsert: Record<string, unknown>[] = [];
        const errors: string[] = [];

        for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
            const values = splitCsvLine(lines[rowIndex], delimiter);
            const row = headers.reduce<Record<string, string>>((acc, header, index) => {
                acc[header] = values[index] ?? "";
                return acc;
            }, {});

            const accountId =
                row.account_id ||
                row.cuenta_id ||
                accountByName.get((row.account_name || row.cuenta || "").toLowerCase()) ||
                "";

            const categoryId =
                row.category_gl_id ||
                row.categoria_id ||
                categoryByName.get((row.category_name || row.categoria || "").toLowerCase()) ||
                undefined;

            const parsed = transactionSchema.safeParse({
                date: row.date || row.fecha,
                description: row.description || row.descripcion,
                amount: parseNumber(row.amount || row.monto),
                account_id: accountId,
                category_gl_id: categoryId,
                currency: (row.currency || row.moneda || "USD").toUpperCase(),
                is_transfer: false,
            });

            if (!parsed.success) {
                errors.push(
                    `Fila ${rowIndex + 1}: ${parsed.error.issues[0]?.message || "Datos inválidos"}`
                );
                continue;
            }

            toInsert.push({
                ...parsed.data,
                org_id: orgId,
                created_by: user.id,
            });
        }

        if (toInsert.length > 0) {
            const { error: insertError } = await supabase
                .from("transactions")
                .insert(toInsert as never[]);

            if (insertError) {
                throw insertError;
            }

            revalidatePath("/dashboard");
            revalidatePath("/dashboard/transactions");
        }

        return NextResponse.json({
            success: true,
            inserted: toInsert.length,
            errors,
        });
    } catch (error) {
        logError("Error importing transactions", error);
        return NextResponse.json(
            { error: "No se pudieron importar las transacciones" },
            { status: 500 }
        );
    }
}
