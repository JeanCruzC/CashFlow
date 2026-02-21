"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/schemas";
import { DEFAULT_RETURN_TO, sanitizeReturnTo } from "@/lib/navigation/returnTo";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from "@/components/ui/icons";

const PRODUCT_PROMISE = [
    "Onboarding por perfil personal o empresa.",
    "Métricas financieras reales sin datos inventados.",
    "Libro interno para transacciones y presupuesto.",
];

export default function RegisterPage() {
    const router = useRouter();
    const [returnTo, setReturnTo] = useState(DEFAULT_RETURN_TO);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setReturnTo(sanitizeReturnTo(params.get("returnTo"), DEFAULT_RETURN_TO));
    }, []);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError("");

        const validation = registerSchema.safeParse({
            fullName,
            email,
            password,
            confirmPassword,
        });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            router.push("/onboarding/select-profile");
            router.refresh();
        } catch {
            setError("Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(165deg,#f8fcff_0%,#f0f7fd_52%,#fbfcfd_100%)] px-5 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-card lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden border-r border-surface-200 bg-[linear-gradient(150deg,#103854_0%,#0d4c7a_56%,#1f8d80_100%)] px-10 py-12 text-white lg:block">
                    <div className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute -right-14 bottom-2 h-52 w-52 rounded-full bg-white/10 blur-xl" />
                    <div className="relative z-10 space-y-8">
                        <p className="inline-flex rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
                            Nuevo workspace
                        </p>
                        <div className="space-y-4">
                            <h1 className="max-w-md text-4xl font-semibold leading-tight">
                                Configura CashFlow para operar con claridad desde el día uno.
                            </h1>
                            <p className="max-w-md text-sm leading-relaxed text-white/85">
                                El registro te llevará directo al onboarding para definir tipo de perfil,
                                configuración base y estructura financiera inicial.
                            </p>
                        </div>
                        <ul className="space-y-3 text-sm text-white/90">
                            {PRODUCT_PROMISE.map((item) => (
                                <li key={item} className="flex items-start gap-3">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#9ee8dc]" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10">
                    <div className="w-full max-w-md animate-fade-in space-y-6">
                        <Link
                            href={returnTo}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d4c7a] hover:text-[#117068]"
                        >
                            <ArrowLeftIcon size={14} />
                            Volver
                        </Link>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d4c7a]">
                                Crear cuenta
                            </p>
                            <h2 className="text-3xl font-semibold text-[#0f2233]">Empieza con CashFlow</h2>
                            <p className="text-sm text-surface-500">Registra tus datos para habilitar el onboarding.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="fullName" className="label">Nombre completo</label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(event) => setFullName(event.target.value)}
                                    className="input-field"
                                    placeholder="Juan Pérez"
                                    autoComplete="name"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="label">Correo electrónico</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="input-field"
                                    placeholder="tu@empresa.com"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="label">Contraseña</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="input-field pr-11"
                                        placeholder="Mínimo 8 caracteres"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-surface-500 transition-colors hover:text-surface-700"
                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="input-field"
                                    placeholder="Repite tu contraseña"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl border border-negative-200 bg-negative-50 px-3 py-2 text-sm text-negative-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full"
                            >
                                <span className="inline-flex items-center justify-center gap-2">
                                    {loading ? <SpinnerIcon size={14} /> : null}
                                    Crear cuenta
                                </span>
                            </button>
                        </form>

                        <p className="text-sm text-surface-500">
                            ¿Ya tienes cuenta?{" "}
                            <Link href="/login" className="font-semibold text-[#0d4c7a] hover:text-[#117068]">
                                Ingresa
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
