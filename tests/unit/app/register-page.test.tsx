import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(),
}));

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RegisterPage from "@/app/register/page";

describe("app/register/page", () => {
    const push = vi.fn();
    const refresh = vi.fn();
    const signUp = vi.fn();

    const useRouterMock = vi.mocked(useRouter);
    const createClientMock = vi.mocked(createClient);

    beforeEach(() => {
        push.mockReset();
        refresh.mockReset();
        signUp.mockReset();

        window.history.pushState({}, "", "/register?returnTo=%2F%23seguridad");

        useRouterMock.mockReturnValue({ push, refresh } as never);
        createClientMock.mockReturnValue({
            auth: { signUp },
        } as never);
    });

    it("conserva returnTo en enlace Volver", async () => {
        render(<RegisterPage />);

        const backLink = await screen.findByRole("link", { name: /Volver/i });
        expect(backLink).toHaveAttribute("href", "/#seguridad");
    });

    it("registra usuario y redirige a onboarding", async () => {
        signUp.mockResolvedValue({ error: null });
        const user = userEvent.setup();

        render(<RegisterPage />);

        await user.type(screen.getByLabelText("Nombre completo"), "Ana Torres");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@cashflow.dev");
        await user.type(screen.getByLabelText("Contraseña"), "password123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "password123");
        await user.click(screen.getByRole("button", { name: /Crear cuenta/i }));

        await waitFor(() => {
            expect(signUp).toHaveBeenCalledWith({
                email: "ana@cashflow.dev",
                password: "password123",
                options: { data: { full_name: "Ana Torres" } },
            });
        });
        expect(push).toHaveBeenCalledWith("/onboarding/select-profile");
        expect(refresh).toHaveBeenCalled();
    });

    it("muestra validación cuando las contraseñas no coinciden", async () => {
        const user = userEvent.setup();
        render(<RegisterPage />);

        await user.type(screen.getByLabelText("Nombre completo"), "Ana Torres");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@cashflow.dev");
        await user.type(screen.getByLabelText("Contraseña"), "password123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "password456");
        await user.click(screen.getByRole("button", { name: /Crear cuenta/i }));

        expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
        expect(signUp).not.toHaveBeenCalled();
    });
});
