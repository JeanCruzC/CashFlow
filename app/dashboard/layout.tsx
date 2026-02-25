import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getOrgContextOrNull } from "@/lib/server/context";
import { getUserWorkspaces } from "@/app/actions/workspaces";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [context, workspaces] = await Promise.all([
        getOrgContextOrNull(),
        getUserWorkspaces(),
    ]);

    if (!context) {
        redirect("/onboarding/select-profile");
    }

    return (
        <DashboardShell
            activeOrgId={context.orgId}
            workspaces={workspaces}
        >
            {children}
        </DashboardShell>
    );
}
