import { NextResponse } from "next/server";

export function rejectCrossOrigin(request: Request, message = "Origen no permitido") {
    const origin = request.headers.get("origin");
    if (!origin) return null;

    const requestOrigin = (() => {
        try {
            return new URL(request.url).origin;
        } catch {
            return null;
        }
    })();

    if (!requestOrigin) {
        return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }

    if (origin !== requestOrigin) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    return null;
}
