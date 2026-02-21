import fs from "node:fs";
import path from "node:path";

function normalizeValue(raw) {
    const value = raw.trim();
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }
    return value;
}

export function loadLocalEnv(cwd = process.cwd()) {
    const files = [".env", ".env.local"];

    for (const file of files) {
        const fullPath = path.join(cwd, file);
        if (!fs.existsSync(fullPath)) {
            continue;
        }

        const content = fs.readFileSync(fullPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
                continue;
            }

            const idx = trimmed.indexOf("=");
            if (idx <= 0) {
                continue;
            }

            const key = trimmed.slice(0, idx).trim();
            const value = normalizeValue(trimmed.slice(idx + 1));

            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    }
}
