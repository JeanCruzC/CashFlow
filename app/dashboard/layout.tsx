import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getOrgContextOrNull } from "@/lib/server/context";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const context = await getOrgContextOrNull();

    if (!context) {
        redirect("/onboarding/select-profile");
    }

    return <DashboardShell>{children}</DashboardShell>;
}
