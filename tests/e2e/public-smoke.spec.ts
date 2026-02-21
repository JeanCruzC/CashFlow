import { expect, test } from "@playwright/test";

test.describe("Public routes smoke", () => {
    test("landing carga textos clave y navega a registro", async ({ page }) => {
        await page.goto("/");

        await expect(page.getByRole("heading", { name: /El control de tu dinero/i })).toBeVisible();
        await expect(page.getByText("CashFlow centraliza transacciones, cuentas, categorías y presupuesto")).toBeVisible();

        await page.getByRole("link", { name: "Crear cuenta" }).first().click();
        await expect(page).toHaveURL(/\/register(\?.*)?$/);
        await expect(page.getByRole("heading", { name: /Empieza con CashFlow/i })).toBeVisible();
    });

    test("registro conserva returnTo y vuelve al ancla de seguridad", async ({ page }) => {
        await page.goto("/#seguridad");

        await page.getByRole("link", { name: "Crear cuenta" }).first().click();
        await expect(page).toHaveURL(/\/register\?returnTo=%2F%23seguridad$/);

        const backLink = page.getByRole("link", { name: "Volver" });
        await expect(backLink).toHaveAttribute("href", "/#seguridad");

        await backLink.click();
        await expect(page).toHaveURL(/\/#seguridad$/);
    });

    test("login renderiza formulario", async ({ page }) => {
        await page.goto("/login");

        await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toBeVisible();
        await expect(page.getByLabel("Correo electrónico")).toBeVisible();
        await expect(page.locator("#password")).toBeVisible();
        await expect(page.getByRole("button", { name: /Ingresar/i })).toBeVisible();
    });
});
