import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/components/ui/Select";

describe("components/ui/Select", () => {
    it("renderiza label, opciones y permite seleccionar valor", async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();

        render(
            <Select label="Cuenta" onChange={onChange} defaultValue="">
                <option value="">Selecciona una cuenta</option>
                <option value="bank-main">Cuenta principal</option>
            </Select>
        );

        expect(screen.getByText("Cuenta")).toBeInTheDocument();

        const select = screen.getByRole("combobox");
        await user.selectOptions(select, "bank-main");

        expect(onChange).toHaveBeenCalledTimes(1);
        expect((select as HTMLSelectElement).value).toBe("bank-main");
    });

    it("muestra mensaje de error cuando recibe prop error", () => {
        render(
            <Select error="Campo obligatorio">
                <option value="">Selecciona</option>
            </Select>
        );

        expect(screen.getByText("Campo obligatorio")).toBeInTheDocument();
    });
});
