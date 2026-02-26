import { getOrgSettings } from "@/app/actions/settings";
import { AccountCreateForm } from "@/components/accounts/AccountCreateForm";
import { CategoryCreateForm } from "@/components/categories/CategoryCreateForm";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
import { ModuleHero } from "@/components/ui/ModuleHero";
import Link from "next/link";

export default async function SettingsPage() {
    const settings = await getOrgSettings();

    if (!settings) {
        return (
            <div className="rounded-3xl border border-surface-200 bg-white p-8 text-center shadow-card animate-fade-in">
                <h2 className="text-2xl font-semibold text-[#0f2233]">Configuración no disponible</h2>
                <p className="mt-2 text-sm text-surface-500">
                    No existe una organización activa para este usuario. Completa onboarding para continuar.
                </p>
                <Link href="/onboarding/select-profile" className="btn-primary mt-5 inline-flex text-sm">
                    Configurar organización
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <ModuleHero
                eyebrow="Soporte operativo · Configuracion"
                title="Centro de configuracion"
                description="Define pais, moneda, idioma, base contable y parametros tributarios para mantener consistencia en reportes y automatizaciones."
                rightPanel={
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-surface-500">
                            Datos base
                        </p>
                        <div className="mt-4 rounded-xl border border-[#d9e2f0] bg-[#f7fbff] px-3 py-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-surface-500">Perfil</span>
                                <span className="font-semibold text-[#0f2233]">
                                    {settings.type === "business" ? "Empresa" : "Personal"}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Moneda</span>
                                <span className="font-semibold text-[#0f2233]">{settings.currency}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-surface-500">Idioma</span>
                                <span className="font-semibold text-[#0f2233]">{settings.preferred_locale}</span>
                            </div>
                        </div>
                    </>
                }
            />

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-[#10283b]">Parámetros base de la organización</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Esta configuración afecta moneda, zona horaria, idioma y reglas financieras globales.
                </p>
                <div className="mt-4">
                    <OrgSettingsForm settings={settings} />
                </div>
            </section>

            <section id="estructura-financiera" className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card scroll-mt-24">
                <h3 className="text-lg font-semibold text-[#10283b]">Estructura financiera</h3>
                <p className="mt-1 text-sm text-surface-500">
                    Desde aquí se crean cuentas y categorías. En los módulos operativos solo revisas y usas esta estructura.
                </p>

                <div className="mt-5 grid gap-6 xl:grid-cols-2">
                    <article className="rounded-2xl border border-surface-200 bg-white p-4">
                        <h4 className="text-base font-semibold text-[#0f2233]">Alta de cuentas</h4>
                        <p className="mt-1 text-sm text-surface-500">
                            Bancos, efectivo, tarjetas, préstamos e inversiones que usarás en transacciones.
                        </p>
                        <div className="mt-4">
                            <AccountCreateForm defaultCurrency={settings.currency} />
                        </div>
                    </article>

                    <article className="rounded-2xl border border-surface-200 bg-white p-4">
                        <h4 className="text-base font-semibold text-[#0f2233]">Alta de categorías</h4>
                        <p className="mt-1 text-sm text-surface-500">
                            Clasificación financiera para reportes, presupuesto y pronóstico.
                        </p>
                        <div className="mt-4">
                            <CategoryCreateForm orgType={settings.type} />
                        </div>
                    </article>
                </div>
            </section>

            <section className="rounded-3xl border border-[#d6e3f0] bg-[#f3f8fd] p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Ruta recomendada de uso</h3>
                <ol className="mt-3 space-y-2 text-sm text-surface-600">
                    <li>1. Configura cuentas y categorías aquí en “Estructura financiera”.</li>
                    <li>2. Registra movimientos en “Movimientos”.</li>
                    <li>3. Controla ejecución mensual en “Presupuesto”.</li>
                    <li>4. Revisa escenarios en “Pronóstico” y recomendaciones en “Asistente financiero”.</li>
                </ol>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <h3 className="text-base font-semibold text-[#10283b]">Atajos</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/dashboard/accounts" className="btn-secondary text-sm no-underline">
                        Ver cuentas
                    </Link>
                    <Link href="/dashboard/categories" className="btn-secondary text-sm no-underline">
                        Ver categorías
                    </Link>
                    <Link href="/dashboard/transactions/new" className="btn-primary text-sm no-underline hover:text-white">
                        Registrar movimiento
                    </Link>
                </div>
            </section>

        </div>
    );
}
