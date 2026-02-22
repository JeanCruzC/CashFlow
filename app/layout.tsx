import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashFlow | Control Financiero para Empresas y Freelancers",
  description: "Gestiona tu dinero, cuentas y presupuesto de manera inteligente. CashFlow te ayuda a llevar tu flujo de caja con información clara y en tiempo real.",
  keywords: ["finanzas", "flujo de caja", "presupuesto", "freelancers", "contabilidad personal"],
  openGraph: {
    title: "CashFlow | Tu dinero bajo control",
    description: "La herramienta financiera más rápida e inteligente para particulares y pequeños negocios.",
    url: "https://onecashflow.vercel.app",
    siteName: "CashFlow",
    locale: "es_ES",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
