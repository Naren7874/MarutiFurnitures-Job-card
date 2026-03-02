import { useQuery } from "@tanstack/react-query"
import {
    ClipboardCheck, IndianRupee, AlertCircle, ShieldCheck,
    Package, CalendarDays, History
} from "lucide-react"
import { motion } from "motion/react"

import { KPICard } from "@/components/dashboard/kpi-card"
import { PriorityQueue } from "@/components/dashboard/priority-queue"
import { StatusDistribution } from "@/components/dashboard/status-distribution"
import { BottleneckAlert } from "@/components/dashboard/bottleneck-alert"
import { UpcomingDeliveries } from "@/components/dashboard/upcoming-deliveries"
import { WhatsAppLog } from "@/components/dashboard/whatsapp-log"
import { OverdueInvoices } from "@/components/dashboard/overdue-invoices"
import { QuickActions } from "@/components/dashboard/quick-actions"

import {
    DUMMY_JOB_CARDS,
    DUMMY_INVOICES,
    DUMMY_WHATSAPP_LOGS,
    DUMMY_ACTIVITIES,
    DUMMY_DELIVERIES,
    STATUS_STATS,
    DASHBOARD_STATS,
    DUMMY_USERS,
} from "@/lib/dummy-data"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    STORE: '#F59E0B', PRODUCTION: '#F97316', QC: '#06B6D4',
    DISPATCH: '#6366F1', ACCOUNTANT: '#EC4899',
}

export default function Dashboard() {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const currentUser = DUMMY_USERS[0]

    const { data: priorities } = useQuery({
        queryKey: ["priority-queue"],
        queryFn: async () => DUMMY_JOB_CARDS
            .filter(jc => jc.priority === 'URGENT' || jc.priority === 'HIGH')
            .sort((a, b) => (b.priority === 'URGENT' ? 1 : 0) - (a.priority === 'URGENT' ? 1 : 0))
            .slice(0, 8)
            .map(jc => ({
                id: jc.id,
                jobNumber: jc.jobNumber,
                client: jc.clientName,
                priority: jc.priority as 'HIGH' | 'URGENT',
                stage: jc.currentStage,
                completionPercent: jc.completionPercent,
                estimatedValue: jc.estimatedValue,
            }))
    })

    const { data: statusStats } = useQuery({
        queryKey: ["status-stats"],
        queryFn: async () => STATUS_STATS
    })

    const { data: bottlenecks } = useQuery({
        queryKey: ["bottlenecks"],
        queryFn: async () => DUMMY_JOB_CARDS
            .filter(jc => jc.daysInCurrentStage > 7)
            .slice(0, 4)
            .map(jc => ({
                id: jc.id,
                jobNumber: jc.jobNumber,
                stageName: jc.currentStage,
                daysInStage: jc.daysInCurrentStage
            }))
    })

    const { data: overdueInvoices } = useQuery({
        queryKey: ["overdue-invoices"],
        queryFn: async () => DUMMY_INVOICES
            .filter(inv => inv.status === 'OVERDUE')
            .map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                client: inv.clientName,
                amount: inv.amount,
                dueDate: inv.dueDate,
            }))
    })

    const { data: deliveries } = useQuery({
        queryKey: ["upcoming-deliveries"],
        queryFn: async () => DUMMY_DELIVERIES
    })

    const { data: whatsappLogs } = useQuery({
        queryKey: ["whatsapp-logs"],
        queryFn: async () => DUMMY_WHATSAPP_LOGS
    })

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
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="text-sm font-bold">{currentUser.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            {greeting}, <span className="font-bold text-foreground">{currentUser.name.split(' ')[0]}</span> 👋
                        </p>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {DUMMY_USERS.slice(1, 5).map((user) => (
                                <Avatar key={user.id} className="size-7 border-2 border-background">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="text-[9px] font-bold">{user.name[0]}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                            {DUMMY_USERS.filter(u => u.status === 'ACTIVE').length} active
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-semibold">
                        <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-muted-foreground">Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
                        <CalendarDays className="size-3" />
                        <span>28 Feb 2024</span>
                    </div>
                </div>
            </motion.div>

            {/* ── KPI Row — Summary Analytics ────────────────── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <motion.div variants={itemFade}>
                    <KPICard title="Active Jobs" value={DASHBOARD_STATS.activeJobs.value} change={DASHBOARD_STATS.activeJobs.change} icon={ClipboardCheck} description="In-production flow" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Revenue MTD" value={DASHBOARD_STATS.revenueMTD.value} change={DASHBOARD_STATS.revenueMTD.change} icon={IndianRupee} accentColor="#10B981" description="Collections Feb 2024" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="Overdue Invoices" value={DASHBOARD_STATS.overdueInvoices.value} change={DASHBOARD_STATS.overdueInvoices.change} icon={AlertCircle} accentColor="#DC2626" description="Awaiting payment" />
                </motion.div>
                <motion.div variants={itemFade}>
                    <KPICard title="QC Pending" value={DASHBOARD_STATS.pendingQC.value} change={DASHBOARD_STATS.pendingQC.change} icon={ShieldCheck} accentColor="#8B5CF6" description="Quality verification" />
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
                        <KPICard title="Low Stock" value={DASHBOARD_STATS.lowStockAlerts.value} icon={Package} accentColor="#F59E0B" description="Materials below threshold" />
                    </motion.div>
                </div>

                {/* ─ Column B (4/12): PERFORMANCE & HEALTH (The "Flow" Flow) ─ */}
                <div className="xl:col-span-4 flex flex-col gap-5">
                    <motion.div variants={itemFade}>
                        <StatusDistribution data={statusStats || []} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Stage Distribution Load</div>
                            <div className="space-y-3.5">
                                {[
                                    { label: 'Design', count: 2, color: '#8B5CF6' },
                                    { label: 'Production', count: 4, color: '#1315E5' },
                                    { label: 'QC', count: 2, color: '#10B981' },
                                    { label: 'Dispatch', count: 2, color: '#F97316' },
                                ].map(s => (
                                    <div key={s.label} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-foreground/80">{s.label}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black text-muted-foreground">{s.count} Jobs</span>
                                                </div>
                                            </div>
                                            <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: s.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(s.count / 8) * 100}%` }}
                                                    transition={{ duration: 1, delay: 0.5 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                        <OverdueInvoices invoices={overdueInvoices || []} />
                    </motion.div>
                    <motion.div variants={itemFade}>
                        <UpcomingDeliveries deliveries={(deliveries || []).map(d => ({
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
                                        {DUMMY_ACTIVITIES.map((activity) => {
                                            const user = DUMMY_USERS.find(u => u.name === activity.actor)
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
