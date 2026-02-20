import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accesibilidad básica", () => {
    test("landing sin violaciones críticas/serias", async ({ page }) => {
        await page.goto("/");

        const results = await new AxeBuilder({ page }).analyze();
        const blockingViolations = results.violations.filter(
            (violation) => violation.impact === "critical" || violation.impact === "serious"
        );

        expect(
            blockingViolations,
            `Violaciones detectadas: ${blockingViolations.map((v) => `${v.id}:${v.impact}`).join(", ")}`
        ).toEqual([]);
    });
});
