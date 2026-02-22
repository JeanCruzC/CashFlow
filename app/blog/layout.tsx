import Link from "next/link";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen overflow-x-hidden bg-[#f3f8fc] text-[#0f172a]">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,#d6ecfa_0%,transparent_35%),radial-gradient(circle_at_88%_22%,#d8f1ee_0%,transparent_34%)]" />

            <header className="sticky top-0 z-50 border-b border-[#dce8f1]/80 bg-[#f3f8fc]/85 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D4C7A] shadow-[0_6px_16px_rgba(13,76,122,0.2)]">
                            <svg viewBox="0 0 48 48" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <rect x="7" y="10" width="34" height="28" rx="8" stroke="#FFFFFF" strokeWidth="3" />
                                <path d="M14 27C17 21 21 19 24 22C27 25 31 24 34 18" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="text-base font-extrabold tracking-tight text-[#0F172A]">CashFlow</span>
                    </Link>

                    <nav className="flex items-center gap-5 text-sm font-semibold text-[#415f78]">
                        <Link href="/blog" className="transition-colors hover:text-[#0d4c7a]">
                            Blog
                        </Link>
                        <Link href="/herramientas" className="transition-colors hover:text-[#0d4c7a]">
                            Herramientas
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-xl bg-[#0d4c7a] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0b3f66]"
                        >
                            Crear cuenta
                        </Link>
                    </nav>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-[#d8e5ef] bg-[#edf4f9] px-5 py-8 md:px-8">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 text-sm text-[#4c6880] md:flex-row md:items-center">
                    <p>© {new Date().getFullYear()} CashFlow</p>
                    <p>Aplicación financiera para control personal y empresarial.</p>
                </div>
            </footer>
        </div>
    );
}
