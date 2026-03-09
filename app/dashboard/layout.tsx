import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { getOrgContextOrNull } from "@/lib/server/context";
import { getUserWorkspaces, type WorkspaceSummary } from "@/app/actions/workspaces";
import { getUserGamification } from "@/app/actions/gamification";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let context = null;
    let workspaces: WorkspaceSummary[] = [];
    let gamification = null;

    try {
        const results = await Promise.all([
            getOrgContextOrNull(),
            getUserWorkspaces(),
            getUserGamification(),
        ]);
        context = results[0];
        workspaces = results[1] || [];
        gamification = results[2];
    } catch (e) {
        console.error("Critical error loading Dashboard layout data:", e);
    }

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
