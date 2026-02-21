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
import LoginPage from "@/app/login/page";

describe("app/login/page", () => {
    const push = vi.fn();
    const refresh = vi.fn();
    const signInWithPassword = vi.fn();

    const useRouterMock = vi.mocked(useRouter);
    const createClientMock = vi.mocked(createClient);

    beforeEach(() => {
        push.mockReset();
        refresh.mockReset();
        signInWithPassword.mockReset();

        useRouterMock.mockReturnValue({ push, refresh } as never);
        createClientMock.mockReturnValue({
            auth: { signInWithPassword },
        } as never);
});

    it("autentica usuario y navega al dashboard", async () => {
        signInWithPassword.mockResolvedValue({ error: null });
        const user = userEvent.setup();

        render(<LoginPage />);

        await user.type(screen.getByLabelText("Correo electrónico"), "test@cashflow.dev");
        await user.type(screen.getByLabelText("Contraseña"), "password123");
        await user.click(screen.getByRole("button", { name: /Ingresar/i }));

        await waitFor(() => {
            expect(signInWithPassword).toHaveBeenCalledWith({
                email: "test@cashflow.dev",
                password: "password123",
            });
        });
        expect(push).toHaveBeenCalledWith("/dashboard");
        expect(refresh).toHaveBeenCalled();
    });

    it("muestra mensaje cuando Supabase devuelve error", async () => {
        signInWithPassword.mockResolvedValue({ error: { message: "Credenciales inválidas" } });
        const user = userEvent.setup();

        render(<LoginPage />);

        await user.type(screen.getByLabelText("Correo electrónico"), "test@cashflow.dev");
        await user.type(screen.getByLabelText("Contraseña"), "password123");
        await user.click(screen.getByRole("button", { name: /Ingresar/i }));

        expect(await screen.findByText("Credenciales inválidas")).toBeInTheDocument();
        expect(push).not.toHaveBeenCalled();
    });
});
