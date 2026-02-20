"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/schemas";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const validation = registerSchema.safeParse({
            fullName, email, password, confirmPassword,
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
        <div className="min-h-screen flex">
            {/* Left panel - branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-brand-600 dark:bg-brand-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/90 to-brand-800/90" />
                <div className="relative z-10 flex flex-col justify-center px-16">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-8">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">CashFlow</h1>
                    <p className="text-lg text-white/70 leading-relaxed max-w-md">
                        Gestión financiera clara para personas y negocios.
                        Registra, analiza y proyecta con control.
                    </p>
                </div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            </div>

            {/* Right panel - form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md animate-fade-in">
                    <h2 className="text-2xl font-bold mb-1">Crea tu cuenta</h2>
                    <p className="text-muted mb-8">Gestiona tus finanzas con precisión</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="fullName" className="label">Nombre completo</label>
                            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                className="input-field" placeholder="Juan Pérez" autoComplete="name" required />
                        </div>

                        <div>
                            <label htmlFor="email" className="label">Correo electrónico</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="input-field" placeholder="tu@correo.com" autoComplete="email" required />
                        </div>

                        <div>
                            <label htmlFor="password" className="label">Contraseña</label>
                            <div className="relative">
                                <input id="password" type={showPassword ? "text" : "password"} value={password}
                                    onChange={(e) => setPassword(e.target.value)} className="input-field pr-10"
                                    placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 cursor-pointer"
                                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
                            <input id="confirmPassword" type="password" value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)} className="input-field"
                                placeholder="Repite tu contraseña" autoComplete="new-password" required />
                        </div>

                        {error && (
                            <div className="text-sm text-negative-500 bg-negative-500/10 px-3 py-2 rounded-lg">{error}</div>
                        )}

                        <button type="submit" disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2">
                            {loading && <Loader2 size={16} className="animate-spin" />}
                            Crear cuenta
                        </button>
                    </form>

                    <p className="text-sm text-center mt-6 text-muted">
                        ¿Ya tienes cuenta?{" "}
                        <Link href="/login" className="text-brand-500 hover:text-brand-600 font-medium">Ingresa</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
