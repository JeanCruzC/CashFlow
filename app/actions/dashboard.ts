"use server";

import { getOrgContextOrNull, requireOrgContext } from "@/lib/server/context";
import { logError } from "@/lib/server/logger";
import { calculateBusinessKPIs, calculatePersonalKPIs } from "@/lib/utils/kpi";
import {
    Account,
    Budget,
    CategoryGL,
    Transaction,
    SavingsGoal,
    OrgFinancialProfile,
    SavingsPriority,
} from "@/lib/types/finance";
import { computeBusinessForecast } from "@/lib/server/forecast-engine";

export interface PersonalDashboardKPIs {
    netCashFlow: number;
    savingsRatePct: number;
    assets: number;
    liabilities: number;
    netWorth: number;
    emergencyFundMonths: number;
    avgMonthlyExpenses: number;
    expenseMonthsObserved: number;
    liquidCash: number;
    budgetVariance: number;
}

export interface BusinessDashboardKPIs {
    revenue: number;
    cogs: number;
    opex: number;
    operatingIncome: number;
    operatingMarginPct: number;
    budgetVariance: number;
    forecastRevenue: number;
    forecastEbit: number;
    restrictedCash: number;
}

export interface MonthlyTrendPoint {
    month: string;
    income: number;
    expenses: number;
}

export interface DashboardKPIs {
    orgType: "personal" | "business";
    currency: string;
    locale: "es" | "en";
    monthlyTrend: MonthlyTrendPoint[];
    savingsGoals?: SavingsGoal[];
    financialProfile?: OrgFinancialProfile | null;
    personalSavingsPlan?: {
        consolidatedIncome: number;
        monthlySavingsPool: number;
        savingsPct: number;
        savingsPriorities: SavingsPriority[];
    } | null;
    summary?: {
        accounts: number;
        categories: number;
        budgetsMonth: number;
        transactions12m: number;
    };
    budgetUsed?: number;
    budgetTotal?: number;
    personalCycle?: {
        startDate: string | null;
        cycleDay: number;
        incomePaymentDays: number[];
        partnerIncomePaymentDays: number[];
        cardSchedules: Array<{
            name: string;
            paymentDay: number;
            strategy: "full" | "minimum" | "fixed";
            expectedPayment: number;
            currentBalance: number;
        }>;
        subscriptionSchedules: Array<{
            name: string;
            billingDay: number;
            monthlyCost: number;
        }>;
        fixedPlanned: number;
        variablePlanned: number;
        fullCardPayments: number;
        revolvingMinimumPayments: number;
        operationalCommitment: number;
        plannedSavings: number;
        projectedFreeCash: number;
        fixedBreakdown: Array<{
            name: string;
            amount: number;
        }>;
        variableBreakdown: Array<{
            name: string;
            amount: number;
        }>;
        scheduleReview: {
            summary: {
                needsAttention: number;
                overdue: number;
                confirmed: number;
                upcoming: number;
            };
            items: Array<{
                id: string;
                kind: "income" | "expense";
                title: string;
                subtitle: string;
                amount: number;
                dueDate: string;
                nextDate: string | null;
                status: "confirmed" | "due_today" | "upcoming" | "overdue";
                matchedDate: string | null;
                matchedAmount: number | null;
                note: string;
                ctaLabel: string;
                ctaHref: string;
            }>;
        };
    };
    personal?: PersonalDashboardKPIs;
    business?: BusinessDashboardKPIs;
}

function resolveCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function computeMonthlyTrend(transactions: Transaction[]): MonthlyTrendPoint[] {
    const byMonth = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        const month = t.date.slice(0, 7);
        const bucket = byMonth.get(month) || { income: 0, expenses: 0 };
        if (t.amount >= 0) {
            bucket.income += t.amount;
        } else {
            bucket.expenses += Math.abs(t.amount);
        }
        byMonth.set(month, bucket);
    }
    return Array.from(byMonth.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);
}

function resolveWindowStart(monthsBack: number) {
    const start = new Date();
    start.setMonth(start.getMonth() - monthsBack);
    return start.toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
    if (value == null) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return 0;
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function clampDay(value: number | null | undefined, fallback: number) {
    if (value == null) return fallback;
    if (!Number.isFinite(value)) return fallback;
    return Math.min(31, Math.max(1, Math.round(value)));
}

function startOfDayDate(value: Date) {
    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

function addDays(value: Date, days: number) {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return copy;
}

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

function buildMonthDate(base: Date, day: number) {
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return startOfDayDate(new Date(year, month, Math.min(clampDay(day, 1), daysInMonth)));
}

function buildNextMonthDate(base: Date, day: number) {
    const year = base.getFullYear();
    const month = base.getMonth() + 1;
    const nextYear = month > 11 ? year + 1 : year;
    const normalizedMonth = month > 11 ? 0 : month;
    const daysInMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate();
    return startOfDayDate(new Date(nextYear, normalizedMonth, Math.min(clampDay(day, 1), daysInMonth)));
}

function differenceInDays(later: Date, earlier: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((startOfDayDate(later).getTime() - startOfDayDate(earlier).getTime()) / msPerDay);
}

function normalizeMatchText(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

type ReviewEventSeed = {
    id: string;
    kind: "income" | "expense";
    title: string;
    subtitle: string;
    amount: number;
    dueDate: Date;
    expectedDay: number;
    matchTokens: string[];
};

function buildPersonalScheduleReview({
    today,
    cycle,
    financialProfile,
    transactions,
    dismissedKeys,
}: {
    today: Date;
    cycle: NonNullable<DashboardKPIs["personalCycle"]>;
    financialProfile: OrgFinancialProfile | null | undefined;
    transactions: Transaction[];
    dismissedKeys: Set<string>;
}) {
    const todayStart = startOfDayDate(today);
    const reviewSeeds: ReviewEventSeed[] = [];

    const pushReviewSeed = (seed: Omit<ReviewEventSeed, "id">) => {
        reviewSeeds.push({
            ...seed,
            id: `${seed.title}-${toIsoDate(seed.dueDate)}-${reviewSeeds.length}`,
        });
    };

    const addIncomeSeed = (args: {
        title: string;
        subtitle: string;
        amount: number | null | undefined;
        expectedDay: number;
        tokens: string[];
    }) => {
        const amount = round2(Math.max(Number(args.amount || 0), 0));
        if (amount <= 0) return;
        pushReviewSeed({
            kind: "income",
            title: args.title,
            subtitle: args.subtitle,
            amount,
            dueDate: buildMonthDate(today, args.expectedDay),
            expectedDay: clampDay(args.expectedDay, 1),
            matchTokens: args.tokens,
        });
    };

    const salaryFrequency = financialProfile?.salary_frequency || "monthly";
    if (salaryFrequency === "biweekly") {
        addIncomeSeed({
            title: "Deposito de sueldo",
            subtitle: "Titular · 1ra quincena",
            amount: financialProfile?.first_fortnight_amount,
            expectedDay: financialProfile?.salary_payment_day_2 || cycle.incomePaymentDays[0] || 15,
            tokens: ["sueldo", "quincena", "pago"],
        });
        addIncomeSeed({
            title: "Deposito de sueldo",
            subtitle: "Titular · 2da quincena",
            amount: financialProfile?.second_fortnight_amount,
            expectedDay: financialProfile?.salary_payment_day_1 || cycle.incomePaymentDays[1] || 30,
            tokens: ["sueldo", "quincena", "pago"],
        });
    } else if (cycle.incomePaymentDays[0]) {
        addIncomeSeed({
            title: "Deposito de sueldo",
            subtitle: "Titular",
            amount: financialProfile?.monthly_income_net,
            expectedDay: cycle.incomePaymentDays[0],
            tokens: ["sueldo", "pago", "deposito"],
        });
    }

    const hasPartnerIncome = Number(financialProfile?.partner_contribution || 0) > 0;
    if (hasPartnerIncome) {
        const partnerFrequency = financialProfile?.partner_salary_frequency || "monthly";
        if (partnerFrequency === "biweekly") {
            addIncomeSeed({
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe · 1ra quincena",
                amount: financialProfile?.partner_first_fortnight_amount,
                expectedDay:
                    financialProfile?.partner_salary_payment_day_2 || cycle.partnerIncomePaymentDays[0] || 15,
                tokens: ["pareja", "aporte", "compartido"],
            });
            addIncomeSeed({
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe · 2da quincena",
                amount: financialProfile?.partner_second_fortnight_amount,
                expectedDay:
                    financialProfile?.partner_salary_payment_day_1 || cycle.partnerIncomePaymentDays[1] || 30,
                tokens: ["pareja", "aporte", "compartido"],
            });
        } else if (cycle.partnerIncomePaymentDays[0]) {
            addIncomeSeed({
                title: "Deposito compartido",
                subtitle: "Pareja/coparticipe",
                amount: financialProfile?.partner_contribution,
                expectedDay: cycle.partnerIncomePaymentDays[0],
                tokens: ["pareja", "aporte", "compartido"],
            });
        }
    }

    for (const card of cycle.cardSchedules) {
        const amount = round2(Math.max(card.expectedPayment, 0));
        if (amount <= 0) continue;
        pushReviewSeed({
            kind: "expense",
            title: `Pago tarjeta ${card.name}`,
            subtitle: card.strategy === "full" ? "Pago total" : card.strategy === "minimum" ? "Pago minimo" : "Pago fijo",
            amount,
            dueDate: buildMonthDate(today, card.paymentDay),
            expectedDay: clampDay(card.paymentDay, 30),
            matchTokens: [card.name, "tarjeta", "pago"],
        });
    }

    for (const subscription of cycle.subscriptionSchedules) {
        const amount = round2(Math.max(subscription.monthlyCost, 0));
        if (amount <= 0) continue;
        pushReviewSeed({
            kind: "expense",
            title: `Pago suscripcion ${subscription.name}`,
            subtitle: "Cobro recurrente",
            amount,
            dueDate: buildMonthDate(today, subscription.billingDay),
            expectedDay: clampDay(subscription.billingDay, 1),
            matchTokens: [subscription.name, "suscripcion", "membresia"],
        });
    }

    const reviewWindowStart = addDays(buildMonthDate(today, 1), -10);
    const reviewWindowEnd = addDays(buildNextMonthDate(today, 1), 7);
    const reviewTransactions = transactions
        .filter((transaction) => {
            const txDate = startOfDayDate(new Date(transaction.date));
            return txDate >= reviewWindowStart && txDate <= reviewWindowEnd;
        })
        .map((transaction) => ({
            ...transaction,
            absoluteAmount: round2(Math.abs(Number(transaction.amount || 0))),
            normalizedDescription: normalizeMatchText(transaction.description || ""),
            txDate: startOfDayDate(new Date(transaction.date)),
        }));

    const usedTransactionIds = new Set<string>();
    const items = reviewSeeds
        .filter((seed) => !dismissedKeys.has(seed.id))
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .map((seed) => {
            const tolerance = Math.max(5, round2(seed.amount * 0.12));
            const directionMatches = (transactionAmount: number) =>
                seed.kind === "income" ? transactionAmount > 0 : transactionAmount < 0;

            const candidates = reviewTransactions
                .filter((transaction) => !usedTransactionIds.has(transaction.id))
                .filter((transaction) => directionMatches(transaction.amount))
                .filter((transaction) => Math.abs(transaction.absoluteAmount - seed.amount) <= tolerance)
                .filter((transaction) => {
                    const diff = differenceInDays(transaction.txDate, seed.dueDate);
                    return diff >= -10 && diff <= 7;
                })
                .map((transaction) => {
                    const tokenHit = seed.matchTokens.some((token) => {
                        const normalizedToken = normalizeMatchText(token);
                        return normalizedToken.length >= 3 && transaction.normalizedDescription.includes(normalizedToken);
                    })
                        ? 1
                        : 0;
                    const dayPenalty = Math.abs(differenceInDays(transaction.txDate, seed.dueDate)) * 100;
                    const amountPenalty = Math.abs(transaction.absoluteAmount - seed.amount);
                    return {
                        transaction,
                        score: dayPenalty + amountPenalty - tokenHit * 25,
                    };
                })
                .sort((a, b) => a.score - b.score);

            const match = candidates[0]?.transaction || null;
            if (match) {
                usedTransactionIds.add(match.id);
            }

            const nextDate = buildNextMonthDate(seed.dueDate, seed.expectedDay);
            const baseHref = `/dashboard/transactions/new?date=${encodeURIComponent(toIsoDate(seed.dueDate))}&description=${encodeURIComponent(seed.title)}&amount=${encodeURIComponent(seed.amount.toFixed(2))}&direction=${seed.kind}`;

            if (match) {
                const dayDelta = differenceInDays(match.txDate, seed.dueDate);
                const note =
                    dayDelta === 0
                        ? `Confirmado el ${toIsoDate(match.txDate)}.`
                        : dayDelta > 0
                            ? `Confirmado el ${toIsoDate(match.txDate)} con ${dayDelta} dias de retraso.`
                            : `Confirmado el ${toIsoDate(match.txDate)} antes de la fecha prevista.`;

                return {
                    id: seed.id,
                    kind: seed.kind,
                    title: seed.title,
                    subtitle: seed.subtitle,
                    amount: seed.amount,
                    dueDate: toIsoDate(seed.dueDate),
                    nextDate: null,
                    status: "confirmed" as const,
                    matchedDate: toIsoDate(match.txDate),
                    matchedAmount: match.absoluteAmount,
                    note,
                    ctaLabel: "Ver registro",
                    ctaHref: "/dashboard/transactions",
                };
            }

            const dayGap = differenceInDays(todayStart, seed.dueDate);
            const status: "due_today" | "overdue" | "upcoming" =
                dayGap === 0 ? "due_today" : dayGap > 0 ? "overdue" : "upcoming";
            const note =
                status === "due_today"
                    ? "Toca confirmarlo hoy para que el saldo real y la agenda no se desalineen."
                    : status === "overdue"
                        ? `No hay movimiento confirmado. Se reprograma al ${toIsoDate(nextDate)} hasta que registres el real.`
                        : `Programado para ${toIsoDate(seed.dueDate)}. Si lo registras a tiempo, se confirmara automaticamente.`;

            return {
                id: seed.id,
                kind: seed.kind,
                title: seed.title,
                subtitle: seed.subtitle,
                amount: seed.amount,
                dueDate: toIsoDate(seed.dueDate),
                nextDate: status === "overdue" ? toIsoDate(nextDate) : null,
                status,
                matchedDate: null,
                matchedAmount: null,
                note,
                ctaLabel: seed.kind === "income" ? "Registrar ingreso" : "Registrar pago",
                ctaHref: baseHref,
            };
        })
        .sort((a, b) => {
            const rank: Record<"overdue" | "due_today" | "upcoming" | "confirmed", number> = {
                overdue: 0,
                due_today: 1,
                upcoming: 2,
                confirmed: 3,
            };
            const statusDelta = rank[a.status as keyof typeof rank] - rank[b.status as keyof typeof rank];
            if (statusDelta !== 0) return statusDelta;
            return a.dueDate.localeCompare(b.dueDate);
        });

    return {
        summary: {
            needsAttention: items.filter((item) => item.status === "overdue" || item.status === "due_today").length,
            overdue: items.filter((item) => item.status === "overdue").length,
            confirmed: items.filter((item) => item.status === "confirmed").length,
            upcoming: items.filter((item) => item.status === "upcoming").length,
        },
        items,
    };
}

function parseIsoDate(value: unknown) {
    if (typeof value !== "string") return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
    return value.trim();
}

function extractOnboardingStartDate(rawAnswers: unknown) {
    if (!rawAnswers || typeof rawAnswers !== "object") return null;
    const answers = rawAnswers as Record<string, unknown>;
    return parseIsoDate(answers.startDate) ?? parseIsoDate(answers.start_date);
}

function extractOnboardingSubscriptions(rawAnswers: unknown) {
    if (!rawAnswers || typeof rawAnswers !== "object") return [] as Array<{
        name: string;
        billingDay: number;
        monthlyCost: number;
    }>;

    const answers = rawAnswers as Record<string, unknown>;
    const rawSubscriptions = answers.subscriptions;
    if (!Array.isArray(rawSubscriptions)) {
        return [] as Array<{
            name: string;
            billingDay: number;
            monthlyCost: number;
        }>;
    }

    return rawSubscriptions
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
            name: String(item.name || "Suscripcion"),
            billingDay: clampDay(toNumber(item.billingDay), 1),
            monthlyCost: round2(Math.max(toNumber(item.monthlyCost), 0)),
        }))
        .filter((item) => item.monthlyCost > 0)
        .sort((a, b) => a.billingDay - b.billingDay);
}

function normalizeCategoryLabel(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

const FIXED_BUDGET_KEYWORDS = [
    "vivienda",
    "housing",
    "rent",
    "alquiler",
    "hipoteca",
    "mortgage",
    "salud",
    "health",
    "insurance",
    "seguro",
    "utilities",
    "servicios",
    "internet",
    "telefono",
    "subscription",
    "suscripcion",
    "debt",
    "deuda",
    "loan",
    "prestamo",
];

const SAVINGS_BUDGET_KEYWORDS = [
    "ahorro",
    "ahorros",
    "meta",
    "metas",
    "savings",
    "saving",
    "goal",
    "goals",
    "fondo de emergencia",
    "emergency fund",
    "inversion",
    "inversiones",
    "investment",
    "investments",
];

function isLikelyFixedBudgetCategory(name: string) {
    const normalized = normalizeCategoryLabel(name);
    return FIXED_BUDGET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isLikelySavingsBudgetCategory(name: string) {
    const normalized = normalizeCategoryLabel(name);
    return SAVINGS_BUDGET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function mapTransactions(raw: Array<Record<string, unknown>>): Transaction[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        date: String(item.date),
        description: String(item.description ?? ""),
        document_type: (item.document_type as Transaction["document_type"]) ?? null,
        document_number: (item.document_number as string) ?? null,
        account_id: String(item.account_id),
        category_gl_id: (item.category_gl_id as string) ?? null,
        counterparty_id: (item.counterparty_id as string) ?? null,
        cost_center_id: (item.cost_center_id as string) ?? null,
        project_id: (item.project_id as string) ?? null,
        amount: toNumber(item.amount),
        currency: String(item.currency ?? "USD"),
        tax_amount: item.tax_amount == null ? null : toNumber(item.tax_amount),
        is_transfer: Boolean(item.is_transfer),
        transfer_group_id: (item.transfer_group_id as string) ?? null,
        savings_goal_id: (item.savings_goal_id as string) ?? null,
        detraccion_rate: item.detraccion_rate == null ? null : toNumber(item.detraccion_rate),
        detraccion_amount: item.detraccion_amount == null ? null : toNumber(item.detraccion_amount),
        status: (item.status as string) ?? null,
        attachment_url: (item.attachment_url as string) ?? null,
        import_batch_id: (item.import_batch_id as string) ?? null,
        external_id: (item.external_id as string) ?? null,
        notes: (item.notes as string) ?? null,
        created_by: String(item.created_by),
        created_at: String(item.created_at ?? new Date().toISOString()),
        updated_at: String(item.updated_at ?? new Date().toISOString()),
    }));
}

function mapCategories(raw: Array<Record<string, unknown>>): CategoryGL[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        name: String(item.name),
        kind: item.kind as CategoryGL["kind"],
        fixed_cost: Boolean(item.fixed_cost),
        variable_cost: Boolean(item.variable_cost),
        is_active: Boolean(item.is_active ?? true),
        sort_order: Number(item.sort_order ?? 0),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

function mapAccounts(raw: Array<Record<string, unknown>>): Account[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        name: String(item.name),
        account_type: item.account_type as Account["account_type"],
        currency: String(item.currency ?? "USD"),
        opening_balance: toNumber(item.opening_balance),
        credit_limit: item.credit_limit == null ? null : toNumber(item.credit_limit),
        interest_rate_apr: item.interest_rate_apr == null ? null : toNumber(item.interest_rate_apr),
        payment_day: item.payment_day == null ? null : toNumber(item.payment_day),
        card_payment_strategy:
            item.card_payment_strategy === "full" ||
                item.card_payment_strategy === "minimum" ||
                item.card_payment_strategy === "fixed"
                ? item.card_payment_strategy
                : null,
        minimum_payment_amount:
            item.minimum_payment_amount == null ? null : toNumber(item.minimum_payment_amount),
        is_restricted_cash: Boolean(item.is_restricted_cash),
        is_active: Boolean(item.is_active ?? true),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

function mapBudgets(raw: Array<Record<string, unknown>>): Budget[] {
    return raw.map((item) => ({
        id: String(item.id),
        org_id: String(item.org_id),
        month: String(item.month),
        category_gl_id: String(item.category_gl_id),
        cost_center_id: (item.cost_center_id as string) ?? null,
        amount: toNumber(item.amount),
        created_at: String(item.created_at ?? new Date().toISOString()),
    }));
}

const DEFAULT_SAVINGS_PRIORITIES: SavingsPriority[] = [
    "fixed_expenses",
    "debt_payments",
    "savings_goals",
];

function mapFinancialProfile(
    raw: Record<string, unknown> | null
): OrgFinancialProfile | null {
    if (!raw) return null;

    const prioritiesRaw = Array.isArray(raw.savings_priorities)
        ? raw.savings_priorities
        : [];
    const normalizedPriorities = prioritiesRaw
        .filter(
            (value): value is SavingsPriority =>
                value === "fixed_expenses" ||
                value === "debt_payments" ||
                value === "savings_goals"
        )
        .slice(0, 3);
    for (const priority of DEFAULT_SAVINGS_PRIORITIES) {
        if (!normalizedPriorities.includes(priority)) {
            normalizedPriorities.push(priority);
        }
    }

    return {
        org_id: String(raw.org_id),
        monthly_income_net: toNumber(raw.monthly_income_net),
        additional_income: toNumber(raw.additional_income),
        partner_contribution: toNumber(raw.partner_contribution),
        consolidated_income: toNumber(raw.consolidated_income),
        salary_frequency:
            raw.salary_frequency === "monthly" || raw.salary_frequency === "biweekly"
                ? raw.salary_frequency
                : undefined,
        salary_payment_day_1:
            raw.salary_payment_day_1 == null ? undefined : toNumber(raw.salary_payment_day_1),
        salary_payment_day_2:
            raw.salary_payment_day_2 == null ? undefined : toNumber(raw.salary_payment_day_2),
        first_fortnight_amount:
            raw.first_fortnight_amount == null ? undefined : toNumber(raw.first_fortnight_amount),
        second_fortnight_amount:
            raw.second_fortnight_amount == null ? undefined : toNumber(raw.second_fortnight_amount),
        partner_salary_frequency:
            raw.partner_salary_frequency === "monthly" || raw.partner_salary_frequency === "biweekly"
                ? raw.partner_salary_frequency
                : undefined,
        partner_salary_payment_day_1:
            raw.partner_salary_payment_day_1 == null
                ? undefined
                : toNumber(raw.partner_salary_payment_day_1),
        partner_salary_payment_day_2:
            raw.partner_salary_payment_day_2 == null
                ? undefined
                : toNumber(raw.partner_salary_payment_day_2),
        partner_first_fortnight_amount:
            raw.partner_first_fortnight_amount == null
                ? undefined
                : toNumber(raw.partner_first_fortnight_amount),
        partner_second_fortnight_amount:
            raw.partner_second_fortnight_amount == null
                ? undefined
                : toNumber(raw.partner_second_fortnight_amount),
        distribution_rule: (raw.distribution_rule as OrgFinancialProfile["distribution_rule"]) ?? "50_30_20",
        needs_pct: toNumber(raw.needs_pct),
        wants_pct: toNumber(raw.wants_pct),
        savings_pct: toNumber(raw.savings_pct),
        debt_pct: toNumber(raw.debt_pct),
        savings_priorities: normalizedPriorities,
        created_at: String(raw.created_at ?? new Date().toISOString()),
        updated_at: String(raw.updated_at ?? new Date().toISOString()),
    };
}

function isMissingTableError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const value = error as { code?: unknown; message?: unknown; details?: unknown };
    const code = typeof value.code === "string" ? value.code : "";
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const details = typeof value.details === "string" ? value.details.toLowerCase() : "";
    return code === "42P01" || message.includes("does not exist") || details.includes("does not exist");
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
    const context = await getOrgContextOrNull();
    if (!context) {
        return {
            orgType: "personal",
            currency: "USD",
            locale: "es",
            monthlyTrend: [],
            personal: {
                netCashFlow: 0,
                savingsRatePct: 0,
                assets: 0,
                liabilities: 0,
                netWorth: 0,
                emergencyFundMonths: 0,
                avgMonthlyExpenses: 0,
                expenseMonthsObserved: 0,
                liquidCash: 0,
                budgetVariance: 0,
            },
        };
    }

    const { supabase, orgId } = context;
    const month = resolveCurrentMonth();
    const fromDate = resolveWindowStart(12);

    const [
        orgResult,
        accountsResult,
        categoriesResult,
        budgetsResult,
        transactionsResult,
        forecastResult,
        savingsGoalsResult,
        financialProfileResult,
        onboardingStateResult,
        dismissedEventsResult,
    ] = await Promise.all([
        supabase
            .from("orgs")
            .select("type, currency, preferred_locale")
            .eq("id", orgId)
            .maybeSingle(),
        supabase.from("accounts").select("*").eq("org_id", orgId),
        supabase.from("categories_gl").select("*").eq("org_id", orgId).eq("is_active", true),
        supabase.from("budgets").select("*").eq("org_id", orgId).eq("month", month),
        supabase
            .from("transactions")
            .select("*")
            .eq("org_id", orgId)
            .gte("date", fromDate),
        supabase
            .from("forecast_assumptions")
            .select("*")
            .eq("org_id", orgId)
            .eq("month", month)
            .maybeSingle(),
        supabase.from("savings_goals").select("*").eq("org_id", orgId),
        supabase.from("org_financial_profile").select("*").eq("org_id", orgId).maybeSingle(),
        supabase
            .from("onboarding_state")
            .select("answers, completed_at, created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("dismissed_schedule_events")
            .select("event_key")
            .eq("org_id", orgId)
            .eq("cycle_month", `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`),
    ]);

    if (orgResult.error || !orgResult.data) {
        logError("Error fetching org data for dashboard", orgResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (accountsResult.error) {
        logError("Error fetching accounts for dashboard", accountsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (categoriesResult.error) {
        logError("Error fetching categories for dashboard", categoriesResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (budgetsResult.error) {
        logError("Error fetching budgets for dashboard", budgetsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (transactionsResult.error) {
        logError("Error fetching transactions for dashboard", transactionsResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (forecastResult.error) {
        logError("Error fetching forecast assumptions for dashboard", forecastResult.error, { orgId });
        throw new Error("No se pudo cargar el dashboard");
    }
    if (savingsGoalsResult.error) {
        logError("Error fetching savings goals", savingsGoalsResult.error, { orgId });
        // Don't throw for savings goals specifically to avoid breaking the whole dashboard
    }
    if (financialProfileResult.error && !isMissingTableError(financialProfileResult.error)) {
        logError("Error fetching org financial profile", financialProfileResult.error, { orgId });
    }
    if (onboardingStateResult.error) {
        logError("Error fetching onboarding state", onboardingStateResult.error, { orgId });
    }

    const accounts = mapAccounts((accountsResult.data || []) as Array<Record<string, unknown>>);
    const categories = mapCategories((categoriesResult.data || []) as Array<Record<string, unknown>>);
    const budgets = mapBudgets((budgetsResult.data || []) as Array<Record<string, unknown>>);
    const transactions = mapTransactions((transactionsResult.data || []) as Array<Record<string, unknown>>);
    const savingsGoals = (savingsGoalsResult.data || []) as SavingsGoal[];
    const financialProfile = mapFinancialProfile(
        (financialProfileResult.data || null) as Record<string, unknown> | null
    );
    const personalSavingsPlan = financialProfile
        ? {
            consolidatedIncome: financialProfile.consolidated_income,
            monthlySavingsPool:
                (financialProfile.consolidated_income * financialProfile.savings_pct) / 100,
            savingsPct: financialProfile.savings_pct,
            savingsPriorities: financialProfile.savings_priorities,
        }
        : null;
    const onboardingAnswers =
        (onboardingStateResult.data?.answers as Record<string, unknown> | undefined) ?? null;
    const onboardingStartDate = extractOnboardingStartDate(onboardingAnswers);
    const onboardingSubscriptions = extractOnboardingSubscriptions(onboardingAnswers);
    const dismissedKeys = new Set((dismissedEventsResult.data || []).map((row) => String(row.event_key)));
    const summary = {
        accounts: accounts.length,
        categories: categories.length,
        budgetsMonth: budgets.length,
        transactions12m: transactions.length,
    };

    const orgType = orgResult.data.type;
    const currency = orgResult.data.currency || "USD";
    const locale = orgResult.data.preferred_locale === "en" ? "en" : "es";

    const budgetByCategory = budgets.map((budget) => ({
        amount: Number(budget.amount || 0),
        category:
            categories.find((category) => category.id === budget.category_gl_id) || null,
    }));

    const fixedBreakdownMap = new Map<string, number>();
    const variableBreakdownMap = new Map<string, number>();

    for (const row of budgetByCategory) {
        const amount = round2(Math.abs(Number(row.amount || 0)));
        if (amount <= 0) continue;

        const categoryName = (row.category?.name || "Sin categoria").trim() || "Sin categoria";
        const isSavingsCategory =
            orgType === "personal" &&
            row.category != null &&
            isLikelySavingsBudgetCategory(row.category.name);
        if (isSavingsCategory) continue;

        const isFixedCategory = row.category
            ? orgType === "business"
                ? Boolean(row.category.fixed_cost)
                : isLikelyFixedBudgetCategory(row.category.name)
            : false;

        const targetMap = isFixedCategory ? fixedBreakdownMap : variableBreakdownMap;
        targetMap.set(categoryName, round2((targetMap.get(categoryName) || 0) + amount));
    }

    const fixedBreakdown = Array.from(fixedBreakdownMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    const variableBreakdown = Array.from(variableBreakdownMap.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

    const fixedPlanned = round2(
        budgetByCategory.reduce((sum, row) => {
            if (!row.category) return sum;
            if (orgType === "business") {
                return row.category.fixed_cost ? sum + row.amount : sum;
            }
            if (isLikelySavingsBudgetCategory(row.category.name)) return sum;
            return isLikelyFixedBudgetCategory(row.category.name) ? sum + row.amount : sum;
        }, 0)
    );
    const variablePlanned = round2(
        budgetByCategory.reduce((sum, row) => {
            if (!row.category) return sum + row.amount;
            if (orgType === "business") {
                if (row.category.fixed_cost) return sum;
                return sum + row.amount;
            }
            if (isLikelySavingsBudgetCategory(row.category.name)) return sum;
            return isLikelyFixedBudgetCategory(row.category.name) ? sum : sum + row.amount;
        }, 0)
    );

    const creditCardSchedules = accounts
        .filter((account) => account.account_type === "credit_card")
        .map((account) => {
            const strategy =
                account.card_payment_strategy ||
                (Number(account.minimum_payment_amount || 0) > 0 ? "minimum" : "full");
            const currentBalance = round2(Math.abs(Number(account.opening_balance || 0)));
            const expectedPayment =
                strategy === "full"
                    ? currentBalance
                    : round2(
                        Number(account.minimum_payment_amount || 0) > 0
                            ? Number(account.minimum_payment_amount || 0)
                            : currentBalance * 0.05
                    );

            return {
                name: account.name,
                paymentDay: clampDay(account.payment_day ?? null, 30),
                strategy,
                currentBalance,
                expectedPayment,
            };
        });

    const fullCardPayments = round2(
        creditCardSchedules
            .filter((card) => card.strategy === "full")
            .reduce((sum, card) => sum + card.expectedPayment, 0)
    );
    const revolvingMinimumPayments = round2(
        creditCardSchedules
            .filter((card) => card.strategy !== "full")
            .reduce((sum, card) => sum + card.expectedPayment, 0)
    );
    const operationalCommitment = round2(
        fixedPlanned + variablePlanned + fullCardPayments + revolvingMinimumPayments
    );
    const plannedSavings = round2(personalSavingsPlan?.monthlySavingsPool ?? 0);
    const projectedFreeCash = round2(
        Math.max((personalSavingsPlan?.consolidatedIncome ?? 0) - operationalCommitment - plannedSavings, 0)
    );

    const incomePaymentDays =
        financialProfile?.salary_frequency === "biweekly"
            ? [
                clampDay(financialProfile.salary_payment_day_2, 15),
                clampDay(financialProfile.salary_payment_day_1, 30),
            ]
            : [clampDay(financialProfile?.salary_payment_day_1, 30)];
    const partnerIncomePaymentDays =
        (financialProfile?.partner_contribution || 0) > 0
            ? financialProfile?.partner_salary_frequency === "biweekly"
                ? [
                    clampDay(financialProfile.partner_salary_payment_day_2, 15),
                    clampDay(financialProfile.partner_salary_payment_day_1, 30),
                ]
                : [clampDay(financialProfile?.partner_salary_payment_day_1, 30)]
            : [];

    const scheduleReview = buildPersonalScheduleReview({
        today: new Date(),
        cycle: {
            startDate: onboardingStartDate,
            cycleDay: 1,
            incomePaymentDays,
            partnerIncomePaymentDays,
            cardSchedules: creditCardSchedules,
            subscriptionSchedules: onboardingSubscriptions,
            fixedPlanned,
            variablePlanned,
            fullCardPayments,
            revolvingMinimumPayments,
            operationalCommitment,
            plannedSavings,
            projectedFreeCash,
            fixedBreakdown,
            variableBreakdown,
            scheduleReview: {
                summary: {
                    needsAttention: 0,
                    overdue: 0,
                    confirmed: 0,
                    upcoming: 0,
                },
                items: [],
            },
        },
        financialProfile,
        transactions,
        dismissedKeys,
    });

    const cycleDay = clampDay(
        onboardingStartDate
            ? Number.parseInt(onboardingStartDate.slice(-2), 10)
            : null,
        1
    );

    const monthlyTrend = computeMonthlyTrend(transactions);
    const budgetTotalAmount = round2(budgetByCategory.reduce((s, r) => s + r.amount, 0));

    if (orgType === "business") {
        const business = calculateBusinessKPIs(transactions, categories, budgets, month);
        const budgetVariance = business.budgetVsActual.reduce((sum, item) => sum + item.variance, 0);
        const restrictedCash = accounts
            .filter((account) => account.is_restricted_cash)
            .reduce((sum, account) => sum + Number(account.opening_balance || 0), 0);

        const businessForecast = computeBusinessForecast({
            targetMonth: month,
            horizonMonths: 3,
            categories,
            transactions,
            assumptions: {
                revenue_growth_rate: forecastResult.data?.revenue_growth_rate ?? null,
                revenue_amount: forecastResult.data?.revenue_amount ?? null,
                cogs_percent: forecastResult.data?.cogs_percent ?? null,
                fixed_opex: forecastResult.data?.fixed_opex ?? null,
                variable_opex_percent: forecastResult.data?.variable_opex_percent ?? null,
                one_off_amount: forecastResult.data?.one_off_amount ?? null,
            },
        });
        const firstProjection = businessForecast.projections[0];
        const budgetUsedBiz = round2(business.budgetVsActual.reduce((s, i) => s + i.actual, 0));

        return {
            orgType,
            currency,
            locale,
            monthlyTrend,
            savingsGoals,
            financialProfile,
            personalSavingsPlan,
            summary,
            budgetUsed: budgetUsedBiz,
            budgetTotal: budgetTotalAmount,
            business: {
                revenue: business.revenue,
                cogs: business.cogs,
                opex: business.opex,
                operatingIncome: business.operatingIncome,
                operatingMarginPct: business.operatingMargin * 100,
                budgetVariance,
                forecastRevenue: firstProjection?.revenue ?? 0,
                forecastEbit: firstProjection?.ebit ?? 0,
                restrictedCash,
            },
        };
    }

    const personal = calculatePersonalKPIs(transactions, categories, accounts, budgets, month);
    const budgetVariance = personal.budgetUtilization.reduce((sum, item) => sum + item.variance, 0);

    const budgetUsedPersonal = round2(personal.budgetUtilization.reduce((s, i) => s + i.actual, 0));

    return {
        orgType,
        currency,
        locale,
        monthlyTrend,
        savingsGoals,
        financialProfile,
        personalSavingsPlan,
        summary,
        budgetUsed: budgetUsedPersonal,
        budgetTotal: budgetTotalAmount,
        personalCycle: {
            startDate: onboardingStartDate,
            cycleDay,
            incomePaymentDays,
            partnerIncomePaymentDays,
            cardSchedules: creditCardSchedules,
            subscriptionSchedules: onboardingSubscriptions,
            fixedPlanned,
            variablePlanned,
            fullCardPayments,
            revolvingMinimumPayments,
            operationalCommitment,
            plannedSavings,
            projectedFreeCash,
            fixedBreakdown,
            variableBreakdown,
            scheduleReview,
        },
        personal: {
            netCashFlow: personal.netCashFlow,
            savingsRatePct: personal.savingsRate * 100,
            assets: personal.assets,
            liabilities: personal.liabilities,
            netWorth: personal.netWorth,
            emergencyFundMonths: personal.emergencyFundMonths,
            avgMonthlyExpenses: personal.avgMonthlyExpenses,
            expenseMonthsObserved: personal.expenseMonthsObserved,
            liquidCash: personal.liquidCash,
            budgetVariance,
        },
    };
}

export async function getRecentTransactions() {
    const context = await getOrgContextOrNull();
    if (!context) return [];
    const { supabase, orgId } = context;

    const { data, error } = await supabase
        .from("transactions")
        .select("*, accounts(name), categories_gl(name)")
        .eq("org_id", orgId)
        .order("date", { ascending: false })
        .limit(20);
    if (error) {
        logError("Error fetching recent transactions", error, { orgId });
        return [];
    }

    return data || [];
}
export async function hasAnyTransaction() {
    const { supabase, orgId } = await requireOrgContext();

    const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId);

    if (error) {
        logError("Error checking transactions", error, { orgId });
        return false;
    }

    return (count || 0) > 0;
}
