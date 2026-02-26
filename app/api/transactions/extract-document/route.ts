import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { requireOrgActorContext } from "@/lib/server/context";
import { rejectCrossOrigin } from "@/lib/server/http-security";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { logError } from "@/lib/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INCOME_KINDS = new Set(["income", "revenue", "other_income"]);

const MIME_BY_EXTENSION: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    heic: "image/heic",
    heif: "image/heif",
};

const ALLOWED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

const extractionSchema = z.object({
    date: z.string().trim().nullable().optional(),
    description: z.string().trim().max(240).nullable().optional(),
    amount: z.number().nullable().optional(),
    direction: z.enum(["income", "expense"]).nullable().optional(),
    currency: z.string().trim().max(3).nullable().optional(),
    account_hint: z.string().trim().max(120).nullable().optional(),
    category_hint: z.string().trim().max(120).nullable().optional(),
    counterparty: z.string().trim().max(120).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
});

type ExtractedObject = z.infer<typeof extractionSchema>;

type AccountRow = {
    id: string;
    name: string;
    currency: string;
    is_active: boolean;
};

type CategoryRow = {
    id: string;
    name: string;
    kind: string;
    is_active: boolean;
};

function normalizeText(value: string) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
}

function normalizeIsoDate(value: string | null | undefined) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return null;
    return trimmed;
}

function extractJsonObject(raw: string) {
    const trimmed = raw.trim();
    const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
        throw new Error("No se encontró un JSON válido en la respuesta del modelo.");
    }

    return withoutFence.slice(start, end + 1);
}

function getMimeType(file: File) {
    if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    return MIME_BY_EXTENSION[extension] || "";
}

function inferDirection(source: ExtractedObject, fallbackDirection: "income" | "expense") {
    if (source.direction) return source.direction;

    const text = normalizeText(
        [source.description, source.notes, source.counterparty]
            .filter((value): value is string => Boolean(value && value.trim().length > 0))
            .join(" ")
    );

    const incomeKeywords = [
        "ingreso",
        "deposito",
        "abono",
        "transferencia recibida",
        "pago recibido",
        "venta",
        "reembolso recibido",
        "cobro",
    ];
    const expenseKeywords = [
        "compra",
        "consumo",
        "pago",
        "transferencia enviada",
        "yape",
        "plin",
        "debito",
        "retiro",
        "comision",
        "boleta",
        "factura",
    ];

    if (incomeKeywords.some((keyword) => text.includes(keyword))) return "income";
    if (expenseKeywords.some((keyword) => text.includes(keyword))) return "expense";
    return fallbackDirection;
}

function sanitizeCurrency(input: string | null | undefined, fallbackCurrency: string) {
    const value = (input || "").trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(value)) return value;
    return fallbackCurrency.toUpperCase();
}

function pickAccountByHint(
    accounts: AccountRow[],
    source: ExtractedObject,
    selectedAccountId: string | null
) {
    if (selectedAccountId && accounts.some((account) => account.id === selectedAccountId)) {
        return accounts.find((account) => account.id === selectedAccountId) || null;
    }

    const haystack = normalizeText(
        [source.account_hint, source.description, source.notes]
            .filter((value): value is string => Boolean(value && value.trim().length > 0))
            .join(" ")
    );

    if (haystack) {
        const match = accounts.find((account) => {
            const normalizedName = normalizeText(account.name);
            return haystack.includes(normalizedName) || normalizedName.includes(haystack);
        });
        if (match) return match;
    }

    return accounts[0] || null;
}

function pickCategoryByHint(
    categories: CategoryRow[],
    source: ExtractedObject,
    direction: "income" | "expense"
) {
    const directional = categories.filter((category) => {
        if (direction === "income") return INCOME_KINDS.has(category.kind);
        return !INCOME_KINDS.has(category.kind);
    });

    const categoryHint = normalizeText(source.category_hint || "");
    const descriptionHint = normalizeText(
        [source.description, source.notes, source.counterparty]
            .filter((value): value is string => Boolean(value && value.trim().length > 0))
            .join(" ")
    );

    if (categoryHint) {
        const exact = directional.find((category) => normalizeText(category.name) === categoryHint);
        if (exact) return exact;
    }

    if (categoryHint) {
        const partial = directional.find((category) => {
            const normalizedName = normalizeText(category.name);
            return normalizedName.includes(categoryHint) || categoryHint.includes(normalizedName);
        });
        if (partial) return partial;
    }

    if (descriptionHint) {
        const byDescription = directional.find((category) => {
            const normalizedName = normalizeText(category.name);
            return normalizedName.length >= 4 && descriptionHint.includes(normalizedName);
        });
        if (byDescription) return byDescription;
    }

    return directional[0] || null;
}

function fallbackDescription(source: ExtractedObject, fileName: string) {
    const direct = (source.description || "").trim();
    if (direct.length > 0) return direct.slice(0, 240);

    const counterparty = (source.counterparty || "").trim();
    if (counterparty.length > 0) {
        return `Movimiento con ${counterparty}`.slice(0, 240);
    }

    const cleanName = fileName.replace(/\.[^./\\]+$/, "").replace(/[_-]+/g, " ").trim();
    if (cleanName.length > 0) {
        return `Movimiento desde ${cleanName}`.slice(0, 240);
    }

    return "Movimiento detectado por comprobante";
}

function buildNotes(source: ExtractedObject, fileName: string) {
    const lines: string[] = [];
    if (source.notes && source.notes.trim()) lines.push(source.notes.trim());
    lines.push(`Fuente automática: ${fileName}`);
    if (typeof source.confidence === "number") {
        lines.push(`Confianza IA: ${Math.round(source.confidence * 100)}%`);
    }
    return lines.join(" | ").slice(0, 500);
}

function getGoogleApiKey() {
    return (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        ""
    );
}

export async function POST(request: Request) {
    try {
        const csrfResponse = rejectCrossOrigin(request, "Origen no permitido para analizar documentos");
        if (csrfResponse) return csrfResponse;

        const { supabase, orgId, user } = await requireOrgActorContext();

        assertRateLimit({
            key: `extract-transaction-document:${user.id}`,
            limit: 12,
            windowMs: 60_000,
        });

        const formData = await request.formData();
        const file = formData.get("file");
        const selectedAccountIdRaw = String(formData.get("selected_account_id") || "").trim();
        const selectedDirectionRaw = String(formData.get("selected_direction") || "expense").trim();

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: "Archivo no válido." }, { status: 400 });
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ error: "El archivo excede 10MB." }, { status: 400 });
        }

        const mimeType = getMimeType(file);
        if (!mimeType) {
            return NextResponse.json(
                { error: "Formato no compatible. Usa JPG, PNG, WEBP, HEIC o PDF." },
                { status: 400 }
            );
        }

        const googleApiKey = getGoogleApiKey();
        if (!googleApiKey) {
            return NextResponse.json(
                {
                    error:
                        "La API de Google AI no está configurada en el servidor. Define GOOGLE_GENERATIVE_AI_API_KEY.",
                },
                { status: 503 }
            );
        }

        const [accountsResult, categoriesResult, orgResult] = await Promise.all([
            supabase
                .from("accounts")
                .select("id, name, currency, is_active")
                .eq("org_id", orgId)
                .eq("is_active", true),
            supabase
                .from("categories_gl")
                .select("id, name, kind, is_active")
                .eq("org_id", orgId)
                .eq("is_active", true),
            supabase
                .from("orgs")
                .select("currency")
                .eq("id", orgId)
                .maybeSingle(),
        ]);

        if (accountsResult.error || categoriesResult.error || orgResult.error) {
            logError("Error loading metadata for document extraction", {
                accountsError: accountsResult.error,
                categoriesError: categoriesResult.error,
                orgError: orgResult.error,
            });
            return NextResponse.json({ error: "No se pudieron cargar datos base para analizar." }, { status: 500 });
        }

        const accounts = (accountsResult.data || []) as AccountRow[];
        const categories = (categoriesResult.data || []) as CategoryRow[];

        if (accounts.length === 0) {
            return NextResponse.json(
                { error: "No hay cuentas activas para registrar el movimiento." },
                { status: 400 }
            );
        }

        const orgCurrency = String(orgResult.data?.currency || accounts[0]?.currency || "USD").toUpperCase();

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileBase64 = fileBuffer.toString("base64");

        const fallbackDirection = selectedDirectionRaw === "income" ? "income" : "expense";
        const selectedAccountId = UUID_REGEX.test(selectedAccountIdRaw) ? selectedAccountIdRaw : null;

        const modelName = process.env.GEMINI_DOCUMENT_MODEL || "gemini-2.5-flash";
        const genAI = new GoogleGenerativeAI(googleApiKey);
        const model = genAI.getGenerativeModel({ model: modelName });

        const extractionPrompt = `
Analiza el archivo adjunto (comprobante Yape/Plin, boleta, recibo o estado bancario) y extrae UNA transacción principal.

Responde SOLO JSON, sin markdown, con esta estructura exacta:
{
  "date": "YYYY-MM-DD | null",
  "description": "string | null",
  "amount": number | null,
  "direction": "income" | "expense" | null,
  "currency": "ISO-4217 | null",
  "account_hint": "string | null",
  "category_hint": "string | null",
  "counterparty": "string | null",
  "notes": "string | null",
  "confidence": number | null
}

Reglas:
- amount debe ser positivo (sin signo).
- date en formato YYYY-MM-DD cuando sea visible; de lo contrario null.
- direction = income si el dinero entra al usuario, expense si sale.
- account_hint puede incluir nombre de banco/medio de pago visible (BCP, Interbank, BBVA, Yape, Plin, etc).
- category_hint puede ser un tipo de gasto/ingreso (ej: supermercado, transporte, sueldo, venta, servicios).
- confidence entre 0 y 1.
`;

        const response = await model.generateContent([
            extractionPrompt,
            {
                inlineData: {
                    data: fileBase64,
                    mimeType,
                },
            },
        ]);

        const rawText = response.response.text();
        const parsedJson = JSON.parse(extractJsonObject(rawText));
        const extracted = extractionSchema.parse(parsedJson);

        const direction = inferDirection(extracted, fallbackDirection);
        const account = pickAccountByHint(accounts, extracted, selectedAccountId);
        const category = pickCategoryByHint(categories, extracted, direction);
        const todayIso = new Date().toISOString().slice(0, 10);

        const date = normalizeIsoDate(extracted.date) || todayIso;
        const description = fallbackDescription(extracted, file.name);
        const amount = Math.max(Number(extracted.amount || 0), 0);
        const currency = sanitizeCurrency(extracted.currency, account?.currency || orgCurrency);

        const warnings: string[] = [];
        if (amount <= 0) warnings.push("No se detectó monto exacto. Revisa antes de guardar.");
        if (!normalizeIsoDate(extracted.date)) warnings.push("Se usó la fecha de hoy por falta de fecha clara en el documento.");
        if (!category) warnings.push("No se encontró categoría exacta; selecciona una manualmente si aplica.");

        const confidence = typeof extracted.confidence === "number" ? extracted.confidence : 0.65;

        return NextResponse.json({
            success: true,
            extracted: {
                date,
                description,
                amount,
                direction,
                currency,
                account_id: account?.id || "",
                account_name: account?.name || null,
                category_gl_id: category?.id || "",
                category_name: category?.name || null,
                notes: buildNotes(extracted, file.name),
                confidence,
                ready_to_save: Boolean(account?.id && description && amount > 0),
            },
            warnings,
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "No autorizado") {
                return NextResponse.json({ error: "No autorizado" }, { status: 401 });
            }
            if (error.message.startsWith("Demasiadas solicitudes")) {
                return NextResponse.json({ error: error.message }, { status: 429 });
            }

            const normalized = error.message.toLowerCase();
            if (
                normalized.includes("api key") ||
                normalized.includes("permission") ||
                normalized.includes("quota")
            ) {
                return NextResponse.json(
                    { error: "No se pudo analizar el documento por configuración/permisos de Google AI." },
                    { status: 503 }
                );
            }
        }

        logError("Error extracting transaction from document", error);
        return NextResponse.json(
            {
                error:
                    "No se pudo analizar el comprobante. Puedes completar el movimiento manualmente o intentar con otra imagen más nítida.",
            },
            { status: 500 }
        );
    }
}
