"use client";

import { OrgSettingsData, updateOrgSettings } from "@/app/actions/settings";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface OrgSettingsFormProps {
    settings: OrgSettingsData;
}

export function OrgSettingsForm({ settings }: OrgSettingsFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState(settings.name);
    const [country, setCountry] = useState(settings.country);
    const [currency, setCurrency] = useState(settings.currency);
    const [timezone, setTimezone] = useState(settings.timezone);
    const [preferredLocale, setPreferredLocale] = useState<"es" | "en">(settings.preferred_locale);
    const [accountingBasis, setAccountingBasis] = useState<"cash_basis" | "accrual_basis" | "">(
        settings.accounting_basis ?? ""
    );
    const [detraccionesEnabled, setDetraccionesEnabled] = useState(settings.detracciones_enabled);

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await updateOrgSettings({
                name: name.trim(),
                country: country.trim().toUpperCase(),
                currency: currency.trim().toUpperCase(),
                timezone: timezone.trim(),
                preferred_locale: preferredLocale,
                accounting_basis: accountingBasis ? accountingBasis : null,
                detracciones_enabled: detraccionesEnabled,
            });

            if (result.error) {
                setError(result.error);
                return;
            }

            setSuccess("Configuración guardada.");
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="label">Nombre de la organización</label>
                    <input
                        className="input-field"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="label">Tipo de perfil</label>
                    <input
                        className="input-field"
                        value={settings.type === "business" ? "Negocio" : "Personal"}
                        disabled
                    />
                </div>
                <div>
                    <label className="label">País</label>
                    <input
                        className="input-field"
                        value={country}
                        onChange={(event) => setCountry(event.target.value.toUpperCase())}
                        required
                    />
                </div>
                <div>
                    <label className="label">Moneda base</label>
                    <input
                        className="input-field"
                        maxLength={3}
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                        required
                    />
                </div>
                <div>
                    <label className="label">Zona horaria</label>
                    <input
                        className="input-field"
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="label">Idioma preferido</label>
                    <select
                        className="input-field"
                        value={preferredLocale}
                        onChange={(event) => setPreferredLocale(event.target.value as "es" | "en")}
                    >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <div>
                    <label className="label">Base contable</label>
                    <select
                        className="input-field"
                        value={accountingBasis}
                        onChange={(event) => setAccountingBasis(event.target.value as "cash_basis" | "accrual_basis" | "")}
                    >
                        <option value="">No definida</option>
                        <option value="cash_basis">Base efectivo</option>
                        <option value="accrual_basis">Base devengado</option>
                    </select>
                </div>
                <div className="flex items-center">
                    <label className="inline-flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300 mt-6">
                        <input
                            type="checkbox"
                            checked={detraccionesEnabled}
                            onChange={(event) => setDetraccionesEnabled(event.target.checked)}
                            className="h-4 w-4 rounded border-surface-300"
                        />
                        Activar flujo de detracciones
                    </label>
                </div>
            </div>

            {error && <p className="text-sm text-negative-600 bg-negative-50 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-positive-700 bg-positive-50 rounded-lg px-3 py-2">{success}</p>}

            <div className="flex justify-end">
                <button type="submit" className="btn-primary text-sm" disabled={pending}>
                    {pending ? "Guardando..." : "Guardar configuración"}
                </button>
            </div>
        </form>
    );
}
