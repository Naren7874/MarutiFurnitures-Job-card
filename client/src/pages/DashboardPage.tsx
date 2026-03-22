import { useAuthStore } from '../stores/authStore';
import { useJobCards, useDashboardStats } from '../hooks/useApi';
import { FileX, LayoutGrid, ClipboardCheck, FileText, ShieldCheck, CheckCircle2 as CheckCircleIcon, Package, History } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { apiGet } from '../lib/axios';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StaffDashboard from '../components/dashboard/StaffDashboard';

import { useQuery } from "@tanstack/react-query";
import { PriorityQueue } from "@/components/dashboard/priority-queue";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { BottleneckAlert } from "@/components/dashboard/bottleneck-alert";
import { UpcomingDeliveries } from "@/components/dashboard/upcoming-deliveries";
import { WhatsAppLog } from "@/components/dashboard/whatsapp-log";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DUMMY_ACTIVITIES, DUMMY_USERS } from "@/lib/dummy-data";

const STAFF_ROLES = ['design', 'store', 'production', 'qc', 'dispatch', 'sales', 'accountant'];

const StatCard = ({ icon: Icon, label, value, sub, colorClass, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        <Card className="group hover:shadow-2xl hover:shadow-primary/5 transition-all relative overflow-hidden shadow-sm border-border/50 dark:border-white/5 rounded-[24px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", colorClass)}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
                {sub && (
                <Badge variant="outline" className="bg-muted/50 border-none text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 rounded-full h-7 px-3">
                        {sub}
                    </Badge>
                )}
            </CardHeader>
            <CardContent>
                <CardDescription className="text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.2em] mb-1.5">{label}</CardDescription>
                <div className="flex items-baseline gap-2">
                    <p className="text-foreground text-3xl font-black tracking-tight">{value ?? '0'}</p>
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/20" />
                </div>
            </CardContent>
        </Card>
    </motion.div>
);

const roleColors: Record<string, string> = {
    ADMIN: '#1315E5', SALES: '#10B981', DESIGN: '#8B5CF6',
    STORE: '#F59E0B', PRODUCTION: '#8ffb03', QC: '#06B6D4',
    DISPATCH: '#6366F1', ACCOUNTANT: '#EC4899',
};

const statusColorMap: Record<string, string> = {
    active: "#94A3B8",
    in_production: "#3B82F6",
    qc_pending: "#F59E0B",
    qc_passed: "#06B6D4",
    dispatched: "#8B5CF6",
    delivered: "#10B981",
    closed: "#1E293B",
    on_hold: "#F97316",
    cancelled: "#F43F5E",
};

// ── Admin Dashboard ────────────────────────────────────────────────────────────

function AdminDashboard() {
    const { user, hasPermission } = useAuthStore();
    const canViewFinancial = hasPermission('reports.view_financial');
    const canViewProduction = hasPermission('reports.view_production');
    const canDoQC = hasPermission(['qcStage.edit', 'qcStage.pass']);
    
    const { data: statsRaw, isLoading: statsLoading } = useDashboardStats();
    const { data: jobsRaw } = useJobCards({ limit: 100 });
    const { data: notificationsRaw } = useQuery({ queryKey: ['notifications-all'], queryFn: () => apiGet('/notifications?limit=50') }) as any;
    
    const stats = (statsRaw as any)?.data;
    const allJobCards: any[] = (jobsRaw as any)?.data ?? [];

    const { data: priorities } = useQuery({
        queryKey: ["priority-queue", user?.companyId],
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
    });

    const statusStats = stats ? Object.entries(stats.jobCards.byStage).map(([status, count]) => ({
        status,
        count: count as number,
        color: statusColorMap[status] || "#767A8C"
    })) : [];

    const { data: bottlenecks } = useQuery({
        queryKey: ["bottlenecks", user?.companyId],
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
    });

    const { data: deliveries } = useQuery({
        queryKey: ["upcoming-deliveries", user?.companyId],
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
    });

    const whatsappLogs = (notificationsRaw?.data || [])
        .filter((n: any) => n.channel === 'whatsapp')
        .map((n: any) => ({
            id: n._id,
            type: n.type,
            recipient: n.waTemplateName,
            status: n.deliveryStatus.toUpperCase(),
            timestamp: new Date(n.createdAt).toLocaleTimeString()
        }));

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    if (statsLoading) {
        return (
            <div className="p-8 space-y-10 max-w-[1600px] mx-auto text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Loading Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <Avatar className="size-14 border-2 border-primary/20 shadow-2xl">
                        <AvatarImage src={user?.profilePhoto} />
                        <AvatarFallback className="text-lg font-black bg-primary/10 text-primary">{user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-foreground text-4xl font-black tracking-tight leading-none mb-1.5">
                            {greeting}, {user?.name?.split(' ')[0]}
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-muted-foreground font-medium">System operational. Here's your workspace overview.</p>
                        </div>
                    </div>
                </div>
                <DashboardCalendar jobCards={allJobCards} />
            </motion.div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                {canViewProduction && (
                    <>
                        <StatCard
                            icon={LayoutGrid}
                            label="Active Projects"
                            value={stats?.projects.active || 0}
                            sub="Boutique"
                            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            delay={0.1}
                        />
                        <StatCard
                            icon={ClipboardCheck}
                            label="Active Job Cards"
                            value={stats?.jobCards.total || 0}
                            sub="Running"
                            colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            delay={0.2}
                        />
                    </>
                )}
                <StatCard
                    icon={FileText}
                    label="Pending Quotes"
                    value={(stats?.quotations.pending || 0) + (stats?.quotations.draft || 0)}
                    sub="Drafts"
                    colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    delay={0.3}
                />
                {canDoQC && (
                    <StatCard
                        icon={ShieldCheck}
                        label="QC Pending"
                        value={stats?.jobCards.qcPending || 0}
                        sub="Awaiting"
                        colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        delay={0.4}
                    />
                )}
                <StatCard
                    icon={CheckCircleIcon}
                    label="Completed Projects"
                    value={stats?.projects.completed || 0}
                    sub="Success"
                    colorClass="bg-primary/10 text-primary"
                    delay={0.5}
                />
                {canViewFinancial && (
                    <StatCard
                        icon={FileX}
                        label="Rejected Quotes"
                        value={stats?.quotations.rejected || 0}
                        sub="Declined"
                        colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        delay={0.6}
                    />
                )}
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* Left Column (4/12) */}
                <div className="xl:col-span-4 flex flex-col gap-8">
                    <QuickActions />
                    <PriorityQueue items={priorities || []} />
                    <WhatsAppLog logs={whatsappLogs || []} />
                    <StatCard
                        icon={Package}
                        label="Low Stock Alerts"
                        value={stats?.inventory.lowStock || 0}
                        sub="Inventory"
                        colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    />
                </div>

                {/* Middle Column (4/12) */}
                <div className="xl:col-span-4 flex flex-col gap-8">
                    <StatusDistribution data={statusStats} />
                    <div className="bg-card border border-border/60 rounded-[32px] p-8 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-6">Stage Load Analysis</p>
                        <div className="space-y-5">
                            {[
                                { label: 'Production', status: 'in_production', color: '#3B82F6' },
                                { label: 'QC Pending', status: 'qc_pending', color: '#F59E0B' },
                                { label: 'Store', status: 'in_store', color: '#6366F1' },
                                { label: 'Dispatch', status: 'dispatched', color: '#8B5CF6' },
                            ].map(s => {
                                const count = stats?.jobCards.byStage?.[s.status] || 0;
                                const total = stats?.jobCards.total || 1;
                                return (
                                    <div key={s.label} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-foreground/70 uppercase tracking-tight">{s.label}</span>
                                            <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-full">{count} JOBS</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: s.color }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (count / total) * 100)}%` }}
                                                transition={{ duration: 1 }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <BottleneckAlert items={bottlenecks || []} />
                </div>

                {/* Right Column (4/12) */}
                <div className="xl:col-span-4 flex flex-col gap-8">
                    <UpcomingDeliveries deliveries={(deliveries || []).map((d: any) => ({
                        id: d.id,
                        date: d.date,
                        client: d.clientName,
                        address: d.address,
                        timeSlot: d.timeSlot,
                        status: d.status as 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED'
                    }))} />
                    
                    {/* Activity Audit */}
                    <Card className="rounded-[32px] border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
                        <CardHeader className="p-6 border-b border-border/20 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner">
                                    <History size={18} />
                                </div>
                                <CardTitle className="text-sm font-black uppercase tracking-tight">Activity Audit</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-black tracking-[0.2em] opacity-40">FEED</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[400px]">
                                <div className="divide-y divide-border/10">
                                    {DUMMY_ACTIVITIES.map((activity: any) => {
                                        const user = DUMMY_USERS.find((u: any) => u.name === activity.actor);
                                        const roleColor = roleColors[activity.actorRole] || '#767A8C';
                                        return (
                                            <div key={activity.id} className="p-5 hover:bg-muted/30 transition-all cursor-pointer group">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="size-9 border border-border/40 shrink-0">
                                                        <AvatarImage src={user?.avatar} />
                                                        <AvatarFallback
                                                            className="text-[10px] font-black"
                                                            style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                                                        >
                                                             {activity.actor[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[12px] font-black text-foreground group-hover:text-primary transition-colors">{activity.actor}</span>
                                                            <span
                                                                className="text-[8px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-widest"
                                                                style={{ backgroundColor: `${roleColor}10`, color: roleColor }}
                                                            >
                                                                {activity.actorRole}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground font-medium leading-relaxed italic">"{activity.action}"</div>
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground/30 font-black tracking-tighter">
                                                        {activity.timestamp.split(' ')[1]}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="p-6 text-center border-t border-border/10">
                                    <Button variant="ghost" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary">View Full Audit Logs</Button>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// ── Main Router ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user } = useAuthStore();
    const role = user?.role;

    // Staff roles get their own focused dashboard
    if (role && STAFF_ROLES.includes(role)) {
        return <StaffDashboard role={role} name={user?.name || 'User'} />;
    }

    // Super admin / fallback gets the full admin view
    return <AdminDashboard />;
}
