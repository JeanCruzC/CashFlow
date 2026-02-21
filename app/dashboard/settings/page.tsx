import { getOrgSettings } from "@/app/actions/settings";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
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
            <section className="rounded-3xl border border-surface-200 bg-white px-6 py-7 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-surface-400">Ajustes</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#0f2233]">Parámetros de organización</h2>
                <p className="mt-2 max-w-3xl text-sm text-surface-500">
                    Define país, moneda, idioma, base contable y parámetros tributarios para
                    mantener consistencia en reportes y automatizaciones.
                </p>
            </section>

            <section className="rounded-3xl border border-surface-200 bg-white p-6 shadow-card">
                <OrgSettingsForm settings={settings} />
            </section>
        </div>
    );
}
