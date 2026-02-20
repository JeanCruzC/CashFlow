import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

vi.mock("@/app/actions/transactions", () => ({
    createTransaction: vi.fn(),
}));

import { useRouter } from "next/navigation";
import { createTransaction } from "@/app/actions/transactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Account, CategoryGL } from "@/lib/types/finance";

const ACCOUNTS: Account[] = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        org_id: "org-1",
        name: "Banco principal",
        account_type: "bank",
        currency: "USD",
        opening_balance: 1000,
        credit_limit: null,
        interest_rate_apr: null,
        is_restricted_cash: false,
        is_active: true,
        created_at: "2026-02-01T00:00:00.000Z",
    },
];

const CATEGORIES: CategoryGL[] = [
    {
        id: "22222222-2222-4222-8222-222222222222",
        org_id: "org-1",
        name: "Alimentación",
        kind: "expense",
        fixed_cost: false,
        variable_cost: true,
        is_active: true,
        sort_order: 1,
        created_at: "2026-02-01T00:00:00.000Z",
    },
    {
        id: "33333333-3333-4333-8333-333333333333",
        org_id: "org-1",
        name: "Ventas",
        kind: "revenue",
        fixed_cost: false,
        variable_cost: false,
        is_active: true,
        sort_order: 2,
        created_at: "2026-02-01T00:00:00.000Z",
    },
];

describe("components/transactions/TransactionForm", () => {
    const push = vi.fn();
    const refresh = vi.fn();
    const back = vi.fn();

    const useRouterMock = vi.mocked(useRouter);
    const createTransactionMock = vi.mocked(createTransaction);

    beforeEach(() => {
        push.mockReset();
        refresh.mockReset();
        back.mockReset();
        createTransactionMock.mockReset();

        useRouterMock.mockReturnValue({ push, refresh, back } as never);
        createTransactionMock.mockResolvedValue({ success: true });
    });

    it("envía gasto con monto negativo y redirige al listado", async () => {
        const user = userEvent.setup();

        render(<TransactionForm accounts={ACCOUNTS} categories={CATEGORIES} />);

        await user.type(screen.getByPlaceholderText("0.00"), "150");
        await user.type(
            screen.getByPlaceholderText("e.g. Grocery Store, Client Payment"),
            "Compra supermercado"
        );

        const selects = screen.getAllByRole("combobox");
        await user.selectOptions(selects[1], "22222222-2222-4222-8222-222222222222");

        await user.click(screen.getByRole("button", { name: "Create Transaction" }));

        await waitFor(() => {
            expect(createTransactionMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: -150,
                    description: "Compra supermercado",
                    account_id: "11111111-1111-4111-8111-111111111111",
                    category_gl_id: "22222222-2222-4222-8222-222222222222",
                })
            );
        });

        expect(push).toHaveBeenCalledWith("/dashboard/transactions");
        expect(refresh).toHaveBeenCalled();
    });

    it("envía ingreso con monto positivo", async () => {
        const user = userEvent.setup();

        render(<TransactionForm accounts={ACCOUNTS} categories={CATEGORIES} />);

        await user.click(screen.getByRole("button", { name: "Income" }));
        await user.type(screen.getByPlaceholderText("0.00"), "2800");
        await user.type(
            screen.getByPlaceholderText("e.g. Grocery Store, Client Payment"),
            "Pago cliente"
        );

        const selects = screen.getAllByRole("combobox");
        await user.selectOptions(selects[1], "33333333-3333-4333-8333-333333333333");

        await user.click(screen.getByRole("button", { name: "Create Transaction" }));

        await waitFor(() => {
            expect(createTransactionMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 2800,
                    category_gl_id: "33333333-3333-4333-8333-333333333333",
                })
            );
        });
    });

    it("muestra validación local cuando monto es inválido", async () => {
        const user = userEvent.setup();

        render(<TransactionForm accounts={ACCOUNTS} categories={CATEGORIES} />);

        await user.type(screen.getByPlaceholderText("0.00"), "0");
        await user.type(
            screen.getByPlaceholderText("e.g. Grocery Store, Client Payment"),
            "Intento inválido"
        );
        await user.click(screen.getByRole("button", { name: "Create Transaction" }));

        expect(await screen.findByText("Please enter a valid amount")).toBeInTheDocument();
        expect(createTransactionMock).not.toHaveBeenCalled();
    });
});
