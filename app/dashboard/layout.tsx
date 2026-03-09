import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getOrgContextOrNull } from "@/lib/server/context";
import { getUserWorkspaces } from "@/app/actions/workspaces";
import { getUserGamification } from "@/app/actions/gamification";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [context, workspaces, gamification] = await Promise.all([
        getOrgContextOrNull(),
        getUserWorkspaces(),
        getUserGamification(),
    ]);

    if (!context) {
        redirect("/onboarding/select-profile");
    }

    return (
        <DashboardShell
            activeOrgId={context.orgId}
            workspaces={workspaces}
            gamification={gamification}
        >
            {children}
        </DashboardShell>
    );
}
