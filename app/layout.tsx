import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashFlow — Gestión financiera clara",
  description: "Plataforma moderna para gestionar transacciones, cuentas y presupuesto con información real.",
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
      </body>
    </html>
  );
}
