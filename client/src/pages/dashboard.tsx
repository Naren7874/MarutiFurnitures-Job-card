import { useQuery } from "@tanstack/react-query"
import {
    ClipboardCheck, ShieldCheck,
    Package, CalendarDays, History, LayoutGrid, FileText, CheckCircle2, FileX
} from "lucide-react"
import { motion } from "motion/react"

import { KPICard } from "@/components/dashboard/kpi-card"
import { PriorityQueue } from "@/components/dashboard/priority-queue"
import { StatusDistribution } from "@/components/dashboard/status-distribution"
import { BottleneckAlert } from "@/components/dashboard/bottleneck-alert"
import { UpcomingDeliveries } from "@/components/dashboard/upcoming-deliveries"
import { WhatsAppLog } from "@/components/dashboard/whatsapp-log"
import { QuickActions } from "@/components/dashboard/quick-actions"
import StaffDashboard from "@/components/dashboard/StaffDashboard"

import {
    DUMMY_ACTIVITIES,
    DUMMY_USERS,
} from "@/lib/dummy-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore } from "@/stores/authStore"
import { useDashboardStats, useJobCards, useNotificationsApi } from "@/hooks/useApi"

const STAFF_ROLES = ['design', 'store', 'production', 'qc', 'dispatch', 'sales', 'accountant'];

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.05 } }
}

const itemFade = {
    hidden: { y: 10, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 350, damping: 28 } }
}

const roleColors: Record<string, string> = {
    ADMIN: '#1315E5', SALES: '#10B981', DESIGN: '#8B5CF6',
    STORE: '#F59E0B', PRODUCTION: '#8ffb03', QC: '#06B6D4',
    DISPATCH: '#6366F1', ACCOUNTANT: '#EC4899',
}

const statusColorMap: Record<string, string> = {
    active: "#94A3B8",        // Slate
    in_production: "#3B82F6", // Blue
    qc_pending: "#F59E0B",    // Amber
    qc_passed: "#06B6D4",     // Cyan
    dispatched: "#8B5CF6",    // Violet
    delivered: "#10B981",     // Emerald
    closed: "#1E293B",        // Dark Slate
    on_hold: "#F97316",       // Orange
    cancelled: "#F43F5E",      // Rose
};

export default function Dashboard() {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const { user: currentUser, company } = useAuthStore()

    // ── ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN ──
    const { data: statsContent } = useDashboardStats() as any;
    const stats = statsContent?.data;

    const { data: jobCardsContent } = useJobCards({ limit: 100 }) as any;
    const allJobCards = jobCardsContent?.data || [];

    const { data: priorities } = useQuery({
        queryKey: ["priority-queue", company?.id],
        queryFn: async () => allJobCards
            .filter((jc: any) => jc.priority === 'urgent' || jc.priority === 'high')
            .sort((a: any, b: any) => (b.priority === 'urgent' ? 1 : 0) - (a.priority === 'urgent' ? 1 : 0))
            .slice(0, 8)
            .map((jc: any) => ({
                id: jc._id,
                jobNumber: jc.jobCardNumber,
                client: jc.clientId?.name || 'Unknown',
                priority: jc.priority.toUpperCase() as 'HIGH' | 'URGENT',
                stage: jc.status.toUpperCase(),
                completionPercent: jc.status === 'delivered' ? 100 : jc.status === 'qc_passed' ? 90 : 50,
            }))
    })

    const statusStats = stats ? Object.entries(stats.jobCards.byStage).map(([status, count]) => ({
        status,
        count: count as number,
        color: statusColorMap[status] || "#767A8C"
    })) : []

    const { data: bottlenecks } = useQuery({
        queryKey: ["bottlenecks", company?.id],
        queryFn: async () => {
            const now = new Date();
            return allJobCards
                .filter((jc: any) => {
                    const stageAge = (now.getTime() - new Date(jc.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
                    return stageAge > 7 && !['closed', 'cancelled', 'delivered'].includes(jc.status);
                })
                .slice(0, 4)
                .map((jc: any) => ({
                    id: jc._id,
                    jobNumber: jc.jobCardNumber,
                    stageName: jc.status.toUpperCase(),
                    daysInStage: Math.floor((now.getTime() - new Date(jc.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                }))
        }
    })

    const { data: deliveries } = useQuery({
        queryKey: ["upcoming-deliveries", company?.id],
        queryFn: async () => allJobCards
            .filter((jc: any) => jc.status === 'dispatch_pending' || jc.status === 'out_for_delivery')
            .map((jc: any) => ({
                id: jc._id,
                date: jc.expectedDelivery,
                clientName: jc.clientId?.name || 'Unknown',
                address: jc.clientId?.city || '',
                timeSlot: 'Morning',
                status: jc.status === 'out_for_delivery' ? 'IN_TRANSIT' : 'SCHEDULED'
            }))
    })

    const { data: notificationsContent } = useNotificationsApi() as any;
    const whatsappLogs = (notificationsContent?.data || [])
        .filter((n: any) => n.channel === 'whatsapp')
        .map((n: any) => ({
            id: n._id,
            type: n.type,
            recipient: n.waTemplateName,
            status: n.deliveryStatus.toUpperCase(),
            timestamp: new Date(n.createdAt).toLocaleTimeString()
        }));

    // ── ROLE-BASED ROUTING: Staff get their own focused dashboard (after all hooks) ──
    if (currentUser?.role && STAFF_ROLES.includes(currentUser.role)) {
        return <StaffDashboard role={currentUser.role} name={currentUser.name || 'User'} />;
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 p-5 md:p-6"
        >
            {/* ── Hero Header ─────────────────────────────────── */}
            <motion.div variants={itemFade} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Avatar className="size-10 border-2 border-border shadow-sm shrink-0">
                        <AvatarImage src={currentUser?.profilePhoto} />
                        <AvatarFallback className="text-sm font-bold">{currentUser?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {greeting}, <span className="font-bold text-foreground">{currentUser?.name?.split(' ')[0] || 'User'}</span> 👋
                        </p>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 rounded-full border border-border bg-card text-lg font-medium text-muted-foreground">
                    <CalendarDays className="size-6" />
                    <span>{new Date().toLocaleDateString('en-GB')}</span>
                </div>
            </motion.div>

            {/* ── KPI Row — Summary Analytics ────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <motion.div variants={itemFade}>
                    <KPICard title="Active Projects" value={stats?.projects.active || 0} change={stats?.projects.change} icon={LayoutGrid} accentColor="#3B82F6" description="Ongoing client mandates" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Active Job Cards" value={stats?.jobCards.total || 0} change={stats?.jobCards.change} icon={ClipboardCheck} accentColor="#1315E5" description="Total jobs in system" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Pending Quotations" value={(stats?.quotations.pending || 0) + (stats?.quotations.draft || 0)} change={stats?.quotations.change} icon={FileText} accentColor="#F59E0B" description="Drafts + Sent" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="QC Pending" value={stats?.jobCards.qcPending || 0} change={stats?.jobCards.qcPendingChange} icon={ShieldCheck} accentColor="#10B981" description="Quality verification" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Completed Projects" value={stats?.projects.completed || 0} icon={CheckCircle2} accentColor="#10B981" description="Successfully delivered" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Rejected Quotes" value={stats?.quotations.rejected || 0} icon={FileX} accentColor="#F43F5E" description="Declined quotations" />
                </motion.div>
            </div>

            {/* ── Expert Bento Grid — Categorical Hierachy ───── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

                {/* ─ Column A (4/12): ACTION & URGENCY (The "Now" Flow) ─ */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    <motion.div variants={itemFade}>
                        <QuickActions />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <PriorityQueue items={priorities || []} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <WhatsAppLog logs={whatsappLogs || []} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <KPICard title="Low Stock" value={stats?.inventory.lowStock || 0} icon={Package} accentColor="#F59E0B" description="Materials below threshold" />
                    </motion.div>
                </div>

                {/* ─ Column B (4/12): PERFORMANCE & HEALTH (The "Flow" Flow) ─ */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    <motion.div variants={itemFade}>
                        <StatusDistribution data={statusStats} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Stage Distribution Load</div>
                            <div className="space-y-3.5">
                                {[
                                    { label: 'Production', status: 'in_production', color: '#3B82F6' },
                                    { label: 'QC Pending', status: 'qc_pending', color: '#F59E0B' },
                                    { label: 'Store', status: 'in_store', color: '#6366F1' },
                                    { label: 'Dispatch', status: 'dispatched', color: '#8B5CF6' },
                                ].map(s => {
                                    const count = stats?.jobCards.byStage[s.status] || 0;
                                    const total = stats?.jobCards.total || 1;
                                    return (
                                        <div key={s.label} className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-foreground/80">{s.label}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[9px] font-black text-muted-foreground">{count} Jobs</span>
                                                    </div>
                                                </div>
                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: s.color }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(count / total) * 100}%` }}
                                                        transition={{ duration: 1, delay: 0.5 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <BottleneckAlert items={bottlenecks || []} />
                    </motion.div>
                </div>

                {/* ─ Column C (4/12): LOGISTICS & AUDIT (The "Movement" Flow) ─ */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    <motion.div variants={itemFade}>
                        <UpcomingDeliveries deliveries={(deliveries || []).map((d: any) => ({
                            id: d.id,
                            date: d.date,
                            client: d.clientName,
                            address: d.address,
                            timeSlot: d.timeSlot,
                            status: d.status as 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED'
                        }))} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <Card className="rounded-2xl border-border bg-card shadow-sm overflow-hidden flex flex-col">
                            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <History className="size-4" />
                                    </div>
                                    <CardTitle className="text-sm font-bold">Activity Audit</CardTitle>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted">Feed</span>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[340px]">
                                    <div className="divide-y divide-border/50">
                                        {DUMMY_ACTIVITIES.map((activity: any) => {
                                            const user = DUMMY_USERS.find((u: any) => u.name === activity.actor)
                                            const roleColor = roleColors[activity.actorRole] || '#767A8C'
                                            return (
                                                <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                                                    <div className="flex items-start gap-3">
                                                        <Avatar className="size-8 border border-border shrink-0 mt-0.5">
                                                            <AvatarImage src={user?.avatar} />
                                                            <AvatarFallback
                                                                className="text-[10px] font-bold"
                                                                style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
                                                            >
                                                                 {activity.actor[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                                <span className="text-[11px] font-black text-foreground group-hover:text-primary transition-colors">{activity.actor}</span>
                                                                <span
                                                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                                                    style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                                                                >
                                                                    {activity.actorRole}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground leading-snug font-medium line-clamp-2">{activity.action}</div>
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground/40 shrink-0 font-bold">
                                                            {activity.timestamp.split(' ')[1]}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}
