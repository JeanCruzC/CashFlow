export default function DashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-24 rounded-3xl border border-surface-200 bg-white" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="h-28 rounded-2xl border border-surface-200 bg-white" />
                <div className="h-28 rounded-2xl border border-surface-200 bg-white" />
                <div className="h-28 rounded-2xl border border-surface-200 bg-white" />
            </div>
            <div className="h-72 rounded-3xl border border-surface-200 bg-white" />
        </div>
    );
}
