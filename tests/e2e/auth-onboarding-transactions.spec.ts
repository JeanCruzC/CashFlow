import { expect, test } from "@playwright/test";

const authEmail = process.env.E2E_USER_EMAIL;
const authPassword = process.env.E2E_USER_PASSWORD;

test.describe("Auth + onboarding + transactions (optional)", () => {
    test.skip(
        !authEmail || !authPassword,
        "Define E2E_USER_EMAIL y E2E_USER_PASSWORD para habilitar este flujo completo"
    );

    test("usuario autenticado puede completar onboarding y crear/eliminar transacción", async ({ page }) => {
        const uniqueDescription = `E2E tx ${Date.now()}`;

        page.on("dialog", (dialog) => dialog.accept());

        await page.goto("/login");
        await page.getByLabel("Correo electrónico").fill(authEmail!);
        await page.getByLabel("Contraseña").fill(authPassword!);
        await page.getByRole("button", { name: /Ingresar/i }).click();

        await page.waitForURL(/\/(dashboard|onboarding\/select-profile)/, { timeout: 45_000 });

        if (page.url().includes("/onboarding/select-profile")) {
            await page.getByRole("button", { name: /Personal/i }).click();
            await page.getByRole("button", { name: /Continuar con perfil personal/i }).click();
            await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
        }

        await page.goto("/dashboard/transactions/new");

        const accountSelect = page.getByRole("combobox").first();
        const accountOptions = accountSelect.locator("option");
        const optionCount = await accountOptions.count();

        test.skip(
            optionCount <= 1,
            "No hay cuentas disponibles para crear transacciones; crea una cuenta de prueba"
        );

        await page.getByPlaceholder("0.00").fill("123.45");
        await page.getByPlaceholder("Ej. Compra de supermercado o cobro de servicio").fill(uniqueDescription);

        await page.getByRole("button", { name: /Crear transacción/i }).click();

        await page.waitForURL(/\/dashboard\/transactions/, { timeout: 45_000 });

        const row = page.locator("tr", { hasText: uniqueDescription });
        await expect(row).toBeVisible();

        await row.getByRole("button", { name: "Eliminar" }).click();

        await expect(row).not.toBeVisible({ timeout: 20_000 });
    });
});
