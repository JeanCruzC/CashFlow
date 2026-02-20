import { expect, test } from "@playwright/test";

test.describe("Public routes smoke", () => {
    test("landing carga textos clave y navega a registro", async ({ page }) => {
        await page.goto("/");

        await expect(page.getByRole("heading", { name: /El control de tu dinero/i })).toBeVisible();
        await expect(page.getByText("CashFlow centraliza transacciones, cuentas, categorías y presupuesto")).toBeVisible();

        await page.getByRole("link", { name: "Crear cuenta" }).first().click();
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole("heading", { name: /Crea tu cuenta/i })).toBeVisible();
    });

    test("login renderiza formulario", async ({ page }) => {
        await page.goto("/login");

        await expect(page.getByRole("heading", { name: /Bienvenido de nuevo/i })).toBeVisible();
        await expect(page.getByLabel("Correo electrónico")).toBeVisible();
        await expect(page.locator("#password")).toBeVisible();
        await expect(page.getByRole("button", { name: /Ingresar/i })).toBeVisible();
    });
});
