import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getOrgContextOrNull } from "@/lib/server/context";
import { hasAnyTransaction } from "@/app/actions/dashboard";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const context = await getOrgContextOrNull();

    if (!context) {
        redirect("/onboarding/select-profile");
    }

    const hasTransactions = await hasAnyTransaction();

    return <DashboardShell hasTransactions={hasTransactions}>{children}</DashboardShell>;
}
