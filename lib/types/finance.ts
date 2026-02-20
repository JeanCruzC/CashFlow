// Domain types for CashFlow

export type OrgType = "personal" | "business";
export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type AccountType = "cash" | "bank" | "credit_card" | "loan" | "investment";
export type CategoryKindPersonal = "income" | "expense" | "transfer";
export type CategoryKindBusiness = "revenue" | "cogs" | "opex" | "other_income" | "other_expense" | "tax" | "transfer";
export type CategoryKind = CategoryKindPersonal | CategoryKindBusiness;
export type AccountingBasis = "cash_basis" | "accrual_basis";
export type CounterpartyType = "customer" | "vendor" | "other";
export type DocumentType = "invoice" | "receipt" | "payment" | "journal_entry";
export type ImportStatus = "pending" | "processed" | "failed";
export type ImportRowStatus = "ok" | "error" | "skipped";

export interface Org {
    id: string;
    type: OrgType;
    name: string;
    country: string;
    currency: string;
    fiscal_year_start: number;
    accounting_basis: AccountingBasis | null;
    timezone: string;
    preferred_locale: string;
    detracciones_enabled: boolean;
    created_at: string;
}

export interface OrgMember {
    org_id: string;
    user_id: string;
    role: MemberRole;
    created_at: string;
}

export interface OnboardingState {
    id: string;
    org_id: string;
    user_id: string;
    profile_type: OrgType;
    step: number;
    answers: Record<string, unknown>;
    completed_at: string | null;
    created_at: string;
}

export interface Account {
    id: string;
    org_id: string;
    name: string;
    account_type: AccountType;
    currency: string;
    opening_balance: number;
    credit_limit: number | null;
    interest_rate_apr: number | null;
    is_restricted_cash: boolean;
    is_active: boolean;
    created_at: string;
}

export interface CategoryGL {
    id: string;
    org_id: string;
    name: string;
    kind: CategoryKind;
    fixed_cost: boolean;
    variable_cost: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface CostCenter {
    id: string;
    org_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface Counterparty {
    id: string;
    org_id: string;
    type: CounterpartyType;
    name: string;
    tax_id: string | null;
    payment_terms: string | null;
    created_at: string;
}

export interface Transaction {
    id: string;
    org_id: string;
    date: string;
    description: string;
    document_type: DocumentType | null;
    document_number: string | null;
    account_id: string;
    category_gl_id: string | null;
    counterparty_id: string | null;
    cost_center_id: string | null;
    project_id: string | null;
    amount: number;
    currency: string;
    tax_amount: number | null;
    is_transfer: boolean;
    transfer_group_id: string | null;
    detraccion_rate: number | null;
    detraccion_amount: number | null;
    status: string | null;
    attachment_url: string | null;
    import_batch_id: string | null;
    external_id: string | null;
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface Budget {
    id: string;
    org_id: string;
    month: string;
    category_gl_id: string;
    cost_center_id: string | null;
    amount: number;
    created_at: string;
}

export interface ForecastAssumption {
    id: string;
    org_id: string;
    month: string;
    revenue_growth_rate: number | null;
    revenue_amount: number | null;
    cogs_percent: number | null;
    fixed_opex: number | null;
    variable_opex_percent: number | null;
    one_off_amount: number | null;
    note: string | null;
    created_at: string;
}

// KPI Types
export interface PersonalKPIs {
    netCashFlow: number;
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    netWorth: number;
    emergencyFundMonths: number;
    budgetUtilization: { category: string; budget: number; actual: number; variance: number }[];
}

export interface BusinessKPIs {
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    fixedCosts: number;
    variableCosts: number;
    operatingIncome: number;
    operatingMargin: number;
    budgetVsActual: { glAccount: string; budget: number; actual: number; variance: number; variancePct: number }[];
    forecastRevenue: number;
    forecastEBIT: number;
}
