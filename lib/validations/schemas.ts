import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = loginSchema
    .extend({
        confirmPassword: z.string(),
        fullName: z.string().min(2, "Name must be at least 2 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

// Onboarding schemas
export const personalConfigSchema = z.object({
    country: z.string().min(2),
    base_currency: z.string().length(3),
    timezone: z.string().min(1),
    preferred_locale: z.string().min(2),
    start_date: z.string(),
});

export const businessConfigSchema = z.object({
    legal_name: z.string().min(2),
    tax_id: z.string().min(1),
    country: z.string().min(2),
    functional_currency: z.string().length(3),
    fiscal_year_start_month: z.number().min(1).max(12),
    accounting_basis: z.enum(["cash_basis", "accrual_basis"]),
    preferred_locale: z.string().min(2),
    timezone: z.string().min(1),
});

export const accountSchema = z.object({
    name: z.string().min(1, "Account name is required"),
    account_type: z.enum(["cash", "bank", "credit_card", "loan", "investment"]),
    currency: z.string().length(3),
    opening_balance: z.number(),
    credit_limit: z.number().optional(),
    interest_rate_apr: z.number().min(0).max(100).optional(),
});

export const categorySchema = z.object({
    name: z.string().min(1, "Category name is required"),
    kind: z.string().min(1),
    fixed_cost: z.boolean().default(false),
    variable_cost: z.boolean().default(false),
});

export const transactionSchema = z.object({
    date: z.string().min(1, "Date is required"),
    description: z.string().min(1, "Description is required"),
    account_id: z.string().uuid("Account is required"),
    category_gl_id: z.string().uuid().optional(),
    counterparty_id: z.string().uuid().optional(),
    cost_center_id: z.string().uuid().optional(),
    amount: z.number().refine((v) => v !== 0, "Amount cannot be zero"),
    currency: z.string().length(3),
    tax_amount: z.number().optional(),
    is_transfer: z.boolean().default(false),
    transfer_group_id: z.string().uuid().optional(),
    detraccion_rate: z.number().min(0).max(100).optional(),
    detraccion_amount: z.number().optional(),
    notes: z.string().optional(),
});

export const budgetSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
    category_gl_id: z.string().uuid(),
    cost_center_id: z.string().uuid().optional(),
    amount: z.number().min(0),
});

export const forecastSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/),
    revenue_growth_rate: z.number().optional(),
    revenue_amount: z.number().optional(),
    cogs_percent: z.number().min(0).max(100).optional(),
    fixed_opex: z.number().optional(),
    variable_opex_percent: z.number().min(0).max(100).optional(),
    one_off_amount: z.number().optional(),
    note: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PersonalConfigInput = z.infer<typeof personalConfigSchema>;
export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type ForecastInput = z.infer<typeof forecastSchema>;
