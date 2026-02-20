import { getOrgSettings } from "@/app/actions/settings";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
import Link from "next/link";

export default async function SettingsPage() {
    const settings = await getOrgSettings();

    if (!settings) {
        return (
            <div className="animate-fade-in card p-8 text-center">
                <h1 className="text-xl font-semibold">Configuración</h1>
                <p className="text-muted mt-2">
                    No se encontró una organización activa para tu usuario.
                </p>
                <Link href="/onboarding/select-profile" className="btn-primary inline-flex mt-5 text-sm">
                    Configurar organización
                </Link>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configuración</h1>
                <p className="text-muted mt-1">
                    Ajusta datos base de la organización, idioma y preferencia contable.
                </p>
            </div>

            <OrgSettingsForm settings={settings} />
        </div>
    );
}
