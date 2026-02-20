"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2, ArrowRight, Loader2 } from "lucide-react";
import { createProfileOrganization } from "@/app/actions/onboarding";

export default function SelectProfilePage() {
    const router = useRouter();
    const [selected, setSelected] = useState<"personal" | "business" | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleContinue() {
        if (!selected) return;
        setLoading(true);
        setError("");

        try {
            const result = await createProfileOrganization(selected);
            if (result.error) throw new Error(result.error);

            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create profile");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-2xl animate-fade-in">
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-bold mb-2">Choose your profile type</h1>
                    <p className="text-muted">Select the type of financial management you need. You can create additional organizations later.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <button type="button" onClick={() => setSelected("personal")}
                        className={`card p-6 text-left cursor-pointer transition-all duration-200 ${selected === "personal" ? "ring-2 ring-brand-500 border-brand-500 shadow-glow" : "hover:shadow-card-hover"}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected === "personal" ? "bg-brand-500 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-500"}`}>
                            <User size={24} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Personal</h3>
                        <p className="text-sm text-muted leading-relaxed">Track personal income, expenses, budget, debts, and net worth.</p>
                        <ul className="mt-4 space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Net Cash Flow & Savings Rate</li>
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Budget vs Actual tracking</li>
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Net Worth & Emergency Fund</li>
                        </ul>
                    </button>

                    <button type="button" onClick={() => setSelected("business")}
                        className={`card p-6 text-left cursor-pointer transition-all duration-200 ${selected === "business" ? "ring-2 ring-brand-500 border-brand-500 shadow-glow" : "hover:shadow-card-hover"}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected === "business" ? "bg-brand-500 text-white" : "bg-surface-100 dark:bg-surface-800 text-surface-500"}`}>
                            <Building2 size={24} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Business</h3>
                        <p className="text-sm text-muted leading-relaxed">Manage revenue, costs, operating margins, budget vs actual, and forecasts.</p>
                        <ul className="mt-4 space-y-1.5 text-xs text-surface-500 dark:text-surface-400">
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Revenue, COGS & EBIT</li>
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Operating Margin & Cash Flow</li>
                            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-brand-500" />Forecast & Detracciones</li>
                        </ul>
                    </button>
                </div>

                {error && <div className="text-sm text-negative-500 bg-negative-500/10 px-3 py-2 rounded-lg mb-4">{error}</div>}

                <button onClick={handleContinue} disabled={!selected || loading}
                    className="btn-primary w-full flex items-center justify-center gap-2">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    Continue with {selected === "personal" ? "Personal" : selected === "business" ? "Business" : "..."}
                </button>
            </div>
        </div>
    );
}
