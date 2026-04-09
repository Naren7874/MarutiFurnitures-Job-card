import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Wrench, Shield, Truck,
    Clock, AlertTriangle, CheckCircle2,
    ArrowRight, FileText, ClipboardList, Inbox, Layers, LayoutGrid,
    BarChart3, Banknote, Receipt, XCircle,
} from 'lucide-react';
import { useJobCards, useQuotations, useDashboardStats, useInvoices } from '../../hooks/useApi';
import { cn, getGreeting } from '../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { useAuthStore } from '../../stores/authStore';

// ── colour theme per role ──────────────────────────────────────────────────────
const ROLE_META: Record<string, { from: string; to: string; ring: string; icon: any; label: string }> = {
    production: { from: 'from-blue-600', to: 'to-blue-900', ring: 'ring-blue-400/30', icon: Wrench, label: 'Production Dashboard' },
    qc: { from: 'from-teal-500', to: 'to-emerald-800', ring: 'ring-teal-400/30', icon: Shield, label: 'Quality Control' },
    dispatch: { from: 'from-green-600', to: 'to-green-900', ring: 'ring-green-400/30', icon: Truck, label: 'Dispatch Dashboard' },
    sales: { from: 'from-indigo-600', to: 'to-indigo-900', ring: 'ring-indigo-400/30', icon: FileText, label: 'Sales Dashboard' },
    accountant: { from: 'from-rose-600', to: 'to-pink-900', ring: 'ring-rose-400/30', icon: Receipt, label: 'Finance Dashboard' },
    admin: { from: 'from-slate-700', to: 'to-slate-900', ring: 'ring-slate-400/30', icon: Layers, label: 'Admin Dashboard' },
    management: { from: 'from-slate-700', to: 'to-slate-900', ring: 'ring-slate-400/30', icon: BarChart3, label: 'Management Dashboard' },
    factory_manager: { from: 'from-orange-600', to: 'to-amber-900', ring: 'ring-orange-400/30', icon: Wrench, label: 'Factory Manager' },
};

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    in_production: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
    qc_pending: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
    qc_failed: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
    qc_passed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    dispatched: 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    delivered: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    closed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : '—';

const isOverdue = (jc: any) =>
    jc.expectedDelivery &&
    new Date(jc.expectedDelivery) < new Date() &&
    !['delivered', 'closed', 'cancelled'].includes(jc.status);

// ── Shared Stat Card ───────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, colorClass, sub, delay = 0 }: {
    icon: any; label: string; value: number | string; colorClass: string; sub?: string; delay?: number;
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileHover={{ y: -5, scale: 1.02 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: "easeOut" }}
        className="h-full"
    >
        <Card className="group h-full relative overflow-hidden transition-all duration-500 border-white/10 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:hover:shadow-primary/10 rounded-[28px] flex flex-col justify-between">
            {/* Ambient Background Glow */}
            <div className={cn("absolute -top-12 -right-12 w-32 h-32 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 rounded-full", colorClass.split(' ')[0].replace('/10', '/30'))} />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-inner",
                    colorClass
                )}>
                    <Icon size={20} strokeWidth={2.5} className="drop-shadow-sm" />
                </div>
                {sub && (
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 rounded-full h-6 px-3">
                        {sub}
                    </Badge>
                )}
            </CardHeader>

            <CardContent className="relative z-10 pb-4 grow flex flex-col justify-end">
                <div className="space-y-1">
                    <p className="text-muted-foreground/60 text-[9px] font-black uppercase tracking-[0.25em] transition-colors group-hover:text-muted-foreground/80">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-foreground text-3xl font-black  tabular-nums drop-shadow-sm">
                            {value ?? '0'}
                        </span>
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={cn("h-1.5 w-1.5 rounded-full", colorClass.split(' ')[1] || "bg-primary")}
                        />
                    </div>
                </div>
            </CardContent>

            {/* Decorative Bottom Line */}
            <div className={cn("absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 ease-out", colorClass.split(' ')[1] || "bg-primary")} />
        </Card>
    </motion.div>
);

// ── Shared Job Card Row ────────────────────────────────────────────────────────
const JCRow = ({ jc, idx }: { jc: any; idx: number }) => {
    const cls = STATUS_BADGE[jc.status] || 'bg-muted text-muted-foreground border-border';
    const overdue = isOverdue(jc);
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ x: 4 }}
        >
            <Link to={`/jobcards/${jc._id}`}>
                <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-primary/3 border border-transparent hover:border-primary/10 transition-all group cursor-pointer relative overflow-hidden">
                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 border relative z-10', cls)}>
                        {jc.jobCardNumber?.slice(-4) || '#'}
                    </div>
                    <div className="flex-1 min-w-0 relative z-10">
                        <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {jc.title || jc.jobCardNumber}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-foreground/50 truncate">
                            {jc.clientId?.name || jc.clientId?.firmName || '—'}
                            {jc.projectId?.projectName ? ` · ${jc.projectId.projectName}` : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 relative z-10">
                        {overdue && (
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20"
                            >
                                <AlertTriangle size={10} className="text-rose-500" />
                                <span className="text-[9px] font-black text-rose-500 uppercase ">Overdue</span>
                            </motion.div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {fmtDate(jc.dispatchStageId?.scheduledDate || jc.expectedDelivery)}
                            </div>
                            <Badge variant="outline" className={cn('text-[9px] font-black uppercase tracking-wide border rounded-lg px-2 py-0.5', cls)}>
                                {jc.status?.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/30 group-hover:bg-primary/10 transition-colors">
                            <ArrowRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                        </div>
                    </div>
                    {/* Subtle hover splash */}
                    <div className="absolute inset-0 bg-linear-to-r from-primary/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </Link>
        </motion.div>
    );
};

const SectionTitle = ({ title, count }: { title: string; count: number }) => (
    <div className="flex items-center gap-3 mb-5">
        <h2 className="font-black text-[10px] uppercase tracking-[0.22em] text-foreground/50">{title}</h2>
        {count > 0 && <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full">{count}</span>}
    </div>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center gap-4 py-16">
        <Inbox size={44} className="text-muted-foreground/15" />
        <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-[0.25em]">{label}</p>
    </div>
);

// ── Role-specific Stats + Queue ────────────────────────────────────────────────

// Shared hook: fetch ALL job cards the user can see, filter client-side by status
function useAllJobCards() {
    const { data: raw, isLoading } = useJobCards({ limit: 200 });
    const all: any[] = (raw as any)?.data ?? [];
    return { all, isLoading };
}


const ProductionDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.production?.some((u: any) => (u._id || u.id || u) === userId));

    const active = all.filter(j => j.status === 'active');
    const inProd = all.filter(j => j.status === 'in_production');
    const rework = all.filter(j => j.status === 'qc_failed');
    const overdue = all.filter(isOverdue);
    const show = [...active, ...inProd, ...rework];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Inbox} label="New / Active" value={active.length} colorClass="bg-blue-500/10 text-blue-500" delay={0.1} />
                <StatCard icon={Wrench} label="In Production" value={inProd.length} colorClass="bg-indigo-500/10 text-indigo-500" delay={0.2} />
                <StatCard icon={XCircle} label="Rework" value={rework.length} colorClass="bg-rose-500/10 text-rose-500" delay={0.3} />
                <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} colorClass="bg-amber-500/10 text-amber-500" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Production Queue" count={show.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : show.length === 0 ? <EmptyState label="Production queue is clear" />
                        : <div className="space-y-1">{show.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};

const QCDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.qc?.some((u: any) => (u._id || u.id || u) === userId));

    const pending = all.filter(j => j.status === 'qc_pending');
    const passed = all.filter(j => j.status === 'qc_passed');
    const failed = all.filter(j => j.status === 'qc_failed');
    const show = [...pending, ...failed, ...passed];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Shield} label="Awaiting QC" value={pending.length} colorClass="bg-purple-500/10 text-purple-500" delay={0.1} />
                <StatCard icon={CheckCircle2} label="Passed" value={passed.length} colorClass="bg-emerald-500/10 text-emerald-500" delay={0.2} />
                <StatCard icon={XCircle} label="Failed / Rework" value={failed.length} colorClass="bg-rose-500/10 text-rose-500" delay={0.3} />
                <StatCard icon={Layers} label="Total QC Jobs" value={show.length} colorClass="bg-primary/10 text-primary" sub="Queue" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="QC Inspection Queue" count={pending.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : show.length === 0 ? <EmptyState label="QC queue is clear — great work!" />
                        : <div className="space-y-1">{show.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};

const DispatchDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.dispatch?.some((u: any) => (u._id || u.id || u) === userId));

    const ready = all.filter(j => j.status === 'qc_passed');
    const dispatched = all.filter(j => j.status === 'dispatched');
    const delivered = all.filter(j => j.status === 'delivered');
    const show = [...ready, ...dispatched, ...delivered];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Truck} label="Ready to Dispatch" value={ready.length} colorClass="bg-primary/10 text-primary" delay={0.1} />
                <StatCard icon={ArrowRight} label="In Transit" value={dispatched.length} colorClass="bg-blue-500/10 text-blue-500" delay={0.2} />
                <StatCard icon={CheckCircle2} label="Delivered" value={delivered.length} colorClass="bg-emerald-500/10 text-emerald-500" delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Assigned" value={show.length} colorClass="bg-amber-500/10 text-amber-500" sub="All" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Dispatch Queue" count={ready.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : show.length === 0 ? <EmptyState label="Nothing to dispatch right now" />
                        : <div className="space-y-1">{show.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};


const SalesDashboard = () => {
    const { data: qRaw, isLoading: qLoading } = useQuotations({ limit: 200 });
    const { data: statsRaw, isLoading: statsLoading } = useDashboardStats();
 
    const qAll: any[] = (qRaw as any)?.data ?? [];
    const stats = (statsRaw as any)?.data;
    const allQuotes = qAll;
 
    const isLoading = qLoading || statsLoading;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                <StatCard
                    icon={LayoutGrid}
                    label="Active Projects"
                    value={stats?.projects.active || 0}
                    colorClass="bg-blue-500/10 text-blue-600"
                    delay={0.1}
                />
                <StatCard
                    icon={FileText}
                    label="Pending Quotes"
                    value={(stats?.quotations.pending || 0) + (stats?.quotations.draft || 0)}
                    colorClass="bg-amber-500/10 text-amber-600"
                    delay={0.2}
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Approved Quotes"
                    value={stats?.quotations.approved || 0}
                    colorClass="bg-emerald-500/10 text-emerald-600"
                    delay={0.3}
                />
                <StatCard
                    icon={XCircle}
                    label="Rejected Quotes"
                    value={stats?.quotations.rejected || 0}
                    colorClass="bg-rose-500/10 text-rose-600"
                    delay={0.4}
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Completed Projects"
                    value={stats?.projects.completed || 0}
                    colorClass="bg-primary/10 text-primary"
                    delay={0.5}
                />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Quotations Overview" count={allQuotes.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : allQuotes.length === 0 ? <EmptyState label="No quotations yet" />
                        : (
                            <div className="space-y-1">
                                {allQuotes.slice(0, 20).map((q: any, i: number) => {
                                    const cls =
                                        q.status === 'approved' || q.status === 'converted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                            q.status === 'sent' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                q.status === 'draft' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                                                    q.status === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                        'bg-muted text-muted-foreground border-border';
                                    return (
                                        <motion.div key={q._id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.04 }}>
                                            <Link to={`/quotations/${q._id}`}>
                                                <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/40 border border-transparent hover:border-border/50 transition-all group cursor-pointer">
                                                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border', cls)}>
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{q.quotationNumber}</p>
                                                        <p className="text-[10px] font-semibold text-muted-foreground/50 truncate">{q.clientId?.name || q.clientId?.firmName || '—'} · {q.projectName}</p>
                                                    </div>
                                                    <Badge variant="outline" className={cn('text-[9px] font-black uppercase tracking-wide border rounded-lg px-2 py-0.5 shrink-0', cls)}>{q.status}</Badge>
                                                    <ArrowRight size={12} className="text-muted-foreground/20 group-hover:text-primary/60 transition-colors shrink-0" />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
            </Card>
        </div>
    );
};

const AccountantDashboard = () => {
    const { data: statsRaw, isLoading } = useDashboardStats();
    const { data: invRaw } = useInvoices({ limit: 10, sortBy: 'createdAt:desc' });
    const stats = (statsRaw as any)?.data;
    const recentInvoices: any[] = (invRaw as any)?.data ?? [];

    const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

    const balance = (stats?.invoices.totalAmount || 0) - (stats?.invoices.received || 0);

    const INV_STATUS: Record<string, string> = {
        draft: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        partially_paid: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        overdue: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    };

    return (
        <div className="space-y-8">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
                <StatCard
                    icon={Banknote}
                    label="Total Invoiced"
                    value={fmt(stats?.invoices.totalAmount || 0)}
                    colorClass="bg-primary/10 text-primary"
                    delay={0.1}
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Received (MTD)"
                    value={fmt(stats?.revenue.thisMonth || 0)}
                    colorClass="bg-emerald-500/10 text-emerald-500"
                    delay={0.2}
                />
                <StatCard
                    icon={Receipt}
                    label="Total Pending"
                    value={fmt(balance)}
                    colorClass="bg-amber-500/10 text-amber-500"
                    delay={0.3}
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Overdue Invoices"
                    value={stats?.invoices.overdue || 0}
                    colorClass="bg-rose-500/10 text-rose-600"
                    sub={stats?.invoices.overdue > 0 ? 'Action Needed' : undefined}
                    delay={0.4}
                />
                <StatCard
                    icon={LayoutGrid}
                    label="Active Projects"
                    value={stats?.projects.active || 0}
                    colorClass="bg-blue-500/10 text-blue-500"
                    delay={0.5}
                />
                <StatCard
                    icon={FileText}
                    label="Pending Quotes"
                    value={(stats?.quotations.pending || 0) + (stats?.quotations.draft || 0)}
                    colorClass="bg-indigo-500/10 text-indigo-500"
                    delay={0.6}
                />
            </div>

            {/* Recent Invoices */}
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Latest Proforma Invoices" count={recentInvoices.length} />
                {isLoading
                    ? <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : recentInvoices.length === 0
                        ? <EmptyState label="No invoices found" />
                        : (
                            <div className="space-y-1">
                                {recentInvoices.slice(0, 15).map((inv: any, i: number) => {
                                    const cls = INV_STATUS[inv.status] || 'bg-muted text-muted-foreground border-border';
                                    const balance = (inv.grandTotal || 0) - (inv.advancePaid || 0);
                                    return (
                                        <motion.div key={inv._id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.04 }}>
                                            <Link to={`/invoices/${inv._id}`}>
                                                <div className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-muted/40 border border-transparent hover:border-border/50 transition-all group cursor-pointer">
                                                    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border', cls)}>
                                                        <Receipt size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{inv.invoiceNumber}</p>
                                                        <p className="text-[10px] font-semibold text-muted-foreground/50 truncate">
                                                            {inv.clientId?.name || inv.clientId?.firmName || '—'} 
                                                            {inv.projectId?.projectName ? ` · ${inv.projectId.projectName}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-black text-foreground">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</p>
                                                        {balance > 0 && <p className="text-[10px] font-bold text-rose-500">Due: ₹{balance.toLocaleString('en-IN')}</p>}
                                                    </div>
                                                    <Badge variant="outline" className={cn('text-[9px] font-black uppercase tracking-wide border rounded-lg px-2 py-0.5 shrink-0', cls)}>{inv.status?.replace(/_/g, ' ')}</Badge>
                                                    <ArrowRight size={12} className="text-muted-foreground/20 group-hover:text-primary/60 transition-colors shrink-0" />
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                <div className="mt-5 pt-4 border-t border-border/20">
                    <Link to="/invoices">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline">
                            <Receipt size={12} /> View All Proforma Invoices <ArrowRight size={12} />
                        </div>
                    </Link>
                </div>
            </Card>
        </div>
    );
};

const ManagementDashboard = () => {
    const { all, isLoading } = useAllJobCards();

    const active = all.filter(j => j.status === 'active' || j.status === 'in_production');
    const qc = all.filter(j => j.status === 'qc_pending' || j.status === 'qc_failed');
    const dispatch = all.filter(j => j.status === 'qc_passed' || j.status === 'dispatched');
    const overdue = all.filter(isOverdue);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Wrench} label="Production" value={active.length} colorClass="bg-blue-500/10 text-blue-500" delay={0.1} />
                <StatCard icon={Shield} label="In QC" value={qc.length} colorClass="bg-purple-500/10 text-purple-500" delay={0.2} />
                <StatCard icon={Truck} label="Logistics" value={dispatch.length} colorClass="bg-emerald-500/10 text-emerald-500" delay={0.3} />
                <StatCard icon={AlertTriangle} label="Delayed" value={overdue.length} colorClass="bg-rose-500/10 text-rose-500" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Company Pipeline Overview" count={all.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : all.length === 0 ? <EmptyState label="No active job cards found" />
                        : <div className="space-y-1">{all.slice(0, 30).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};

// ── Banner Header ──────────────────────────────────────────────────────────────

const RoleBanner = ({ meta, name }: { meta: typeof ROLE_META[string]; name: string }) => {
    const { user } = useAuthStore();
    const greeting = getGreeting();
    const { all: jobCards } = useAllJobCards();
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
            <div className="flex items-center gap-4">
                <Avatar className="size-14 border-2 border-primary/20 shadow-2xl">
                    <AvatarImage src={user?.profilePhoto} />
                    <AvatarFallback className="text-lg font-black bg-primary/10 text-primary">{name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-foreground text-4xl font-black tracking-tight leading-none mb-1.5">
                        {greeting}, {name?.split(' ')[0]}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-muted-foreground font-medium">
                            Here’s your {meta.label.toLowerCase()} overview
                        </p>
                    </div>
                </div>
            </div>
            <DashboardCalendar jobCards={jobCards} />
        </motion.div>
    );
};

// ── Factory Manager backstop (they should be at /factory) ────────────────────
const FactoryManagerDashboard = () => {
    const navigate = useNavigate();
    useEffect(() => {
        // Auto redirect to factory portal if they land here
        navigate('/factory', { replace: true });
    }, [navigate]);

    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Wrench size={40} className="text-orange-500/50" />
            </div>
            <div className="text-center">
                <p className="font-black text-xl text-foreground mb-2">Factory Manager Portal</p>
                <p className="text-muted-foreground/60 text-sm max-w-sm mb-6">
                    Your production workspace is in the Factory Manager portal.
                </p>
                <a href="/factory"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 text-white font-black text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
                    Go to Production Portal →
                </a>
            </div>
        </div>
    );
};

// ── Main Export ────────────────────────────────────────────────────────────────

export default function StaffDashboard({ role: rawRole, name }: { role: string; name: string }) {
    const role = rawRole.toLowerCase().replace(' ', '_');
    const meta = ROLE_META[role] || ROLE_META[rawRole] || ROLE_META.production;

    return (
        <div className="p-5 md:p-7 space-y-8 max-w-[1600px] mx-auto">
            <RoleBanner meta={meta} name={name} />

            {(role === 'admin' || role === 'management' || role === 'super_admin') && <ManagementDashboard />}
            {role === 'production' && <ProductionDashboard />}
            {role === 'qc' && <QCDashboard />}
            {role === 'dispatch' && <DispatchDashboard />}
            {role === 'sales' && <SalesDashboard />}
            {role === 'accountant' && <AccountantDashboard />}
            {(role === 'factory_manager' || role === 'factorymanager') && <FactoryManagerDashboard />}
        </div>
    );
}
