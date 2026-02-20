import { getDashboardKPIs, getRecentTransactions } from "@/app/actions/dashboard";
import { KPICard } from "@/components/ui/KPICard";
import Link from "next/link";

interface DashboardKPI {
    label: string;
    value: string | number;
    tooltip: string;
    format: "currency" | "percent" | "months" | "text";
    variant: "default" | "positive" | "negative" | "warning";
}

export default async function DashboardPage() {
    const [kpis, recentTransactions] = await Promise.all([
        getDashboardKPIs(),
        getRecentTransactions(),
    ]);

    const dashboardKPIs: DashboardKPI[] = [
        {
            label: "Flujo de caja neto",
            value: kpis.cashFlow,
            tooltip: "Total de dinero que entra menos total de dinero que sale en este periodo.",
            format: "currency",
            variant: kpis.cashFlow >= 0 ? "positive" : "negative",
        },
        {
            label: "Tasa de ahorro",
            value: kpis.savingsRate,
            tooltip: "Porcentaje de tus ingresos que estás conservando como ahorro.",
            format: "percent",
            variant: kpis.savingsRate > 20 ? "positive" : kpis.savingsRate > 0 ? "warning" : "negative",
        },
        {
            label: "Patrimonio neto",
            value: kpis.netWorth,
            tooltip: "Valor total de tus activos menos tus pasivos.",
            format: "currency",
            variant: "default",
        },
        {
            label: "Fondo de emergencia",
            value: kpis.emergencyFundMonths,
            tooltip: "Cuántos meses de gastos podrías cubrir con tu liquidez actual.",
            format: "months",
            variant: kpis.emergencyFundMonths > 6 ? "positive" : kpis.emergencyFundMonths > 3 ? "default" : "warning",
        },
    ];

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Resumen financiero</h1>
                <p className="text-muted mt-1">Visión general de la salud financiera de tu organización</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {dashboardKPIs.map((kpi) => (
                    <KPICard
                        key={kpi.label}
                        label={kpi.label}
                        value={kpi.format === "currency"
                            ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(Number(kpi.value))
                            : kpi.format === "percent"
                                ? `${Number(kpi.value).toFixed(1)}%`
                                : kpi.format === "months"
                                    ? `${Number(kpi.value).toFixed(1)} meses`
                                    : String(kpi.value)
                        }
                        tooltip={kpi.tooltip}
                        variant={kpi.variant}
                    />
                ))}
            </div>

            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Transacciones recientes</h2>
                    <Link href="/dashboard/transactions" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
                        Ver todas
                    </Link>
                </div>

                {recentTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                        No hay transacciones todavía.{" "}
                        <Link href="/dashboard/transactions" className="text-brand-500 hover:underline">Crea la primera transacción</Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentTransactions.map((t: { id: string; description: string; date: string; amount: number; categories_gl: { name: string } | null }) => (
                            <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                                <div>
                                    <p className="font-medium text-sm">{t.description}</p>
                                    <p className="text-xs text-muted">
                                        {t.categories_gl?.name || "Sin categoría"} &middot; {new Date(t.date).toLocaleDateString("es-PE")}
                                    </p>
                                </div>
                                <span className={`font-medium text-sm ${t.amount >= 0 ? "amount-positive" : "amount-negative"}`}>
                                    {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
