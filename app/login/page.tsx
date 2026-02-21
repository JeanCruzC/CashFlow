"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations/schemas";
import { EyeIcon, EyeOffIcon, SpinnerIcon } from "@/components/ui/icons";

const SECURITY_POINTS = [
    "Autenticación con Supabase y control por organización.",
    "Políticas RLS activas para proteger cada workspace.",
    "Historial financiero centralizado en una sola vista.",
];

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError("");

        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
            setError(validation.error.issues[0].message);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[linear-gradient(160deg,#f7fbff_0%,#edf5fb_50%,#f9fbfd_100%)] px-5 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-surface-200 bg-white shadow-card lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden border-r border-surface-200 bg-[linear-gradient(145deg,#0e3758_0%,#0d4c7a_52%,#14847b_100%)] px-10 py-12 text-white lg:block">
                    <div className="absolute -left-16 -top-24 h-56 w-56 rounded-full bg-white/10 blur-xl" />
                    <div className="absolute -bottom-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-xl" />
                    <div className="relative z-10 space-y-8">
                        <div className="inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
                            <span className="h-2 w-2 rounded-full bg-[#9ee8dc]" />
                            Plataforma financiera
                        </div>
                        <div className="space-y-4">
                            <h1 className="max-w-md text-4xl font-semibold leading-tight">
                                Control financiero operativo para equipos y personas.
                            </h1>
                            <p className="max-w-md text-sm leading-relaxed text-white/80">
                                CashFlow unifica transacciones, presupuesto, pronóstico y configuración
                                organizacional en una experiencia clara y segura.
                            </p>
                        </div>
                        <ul className="space-y-3 text-sm text-white/90">
                            {SECURITY_POINTS.map((point) => (
                                <li key={point} className="flex items-start gap-3">
                                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10">
                    <div className="w-full max-w-md space-y-7 animate-fade-in">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0d4c7a]">
                                CashFlow
                            </p>
                            <h2 className="text-3xl font-semibold text-[#0f2233]">Iniciar sesión</h2>
                            <p className="text-sm text-surface-500">Accede a tu workspace financiero.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
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
                                        placeholder="Ingresa tu contraseña"
                                        autoComplete="current-password"
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
                                    Ingresar
                                </span>
                            </button>
                        </form>

                        <div className="space-y-2 text-sm">
                            <p className="text-surface-500">
                                ¿No tienes cuenta?{" "}
                                <Link href="/register" className="font-semibold text-[#0d4c7a] hover:text-[#117068]">
                                    Regístrate
                                </Link>
                            </p>
                            <Link href="/" className="inline-flex text-xs font-semibold uppercase tracking-wide text-surface-500 hover:text-surface-700">
                                Volver al inicio
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
