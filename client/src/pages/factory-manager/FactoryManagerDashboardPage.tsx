import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Wrench, AlertTriangle, CheckCircle, Clock,
    ArrowRight, Factory, XCircle, Package,
} from 'lucide-react';
import { useJobCards } from '../../hooks/useApi';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active:       { label: 'Active',       color: 'bg-blue-500/15 text-blue-500 border-blue-500/20' },
    in_production:{ label: 'In Production',color: 'bg-orange-500/15 text-orange-500 border-orange-500/20' },
    qc_pending:   { label: 'QC Pending',   color: 'bg-purple-500/15 text-purple-500 border-purple-500/20' },
    qc_failed:    { label: 'QC Failed',    color: 'bg-rose-500/15 text-rose-500 border-rose-500/20' },
    qc_passed:    { label: 'QC Passed',    color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
    dispatched:   { label: 'Dispatched',   color: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/20' },
    delivered:    { label: 'Delivered',    color: 'bg-green-500/15 text-green-600 border-green-500/20' },
    closed:       { label: 'Closed',       color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const isOverdue = (jc: any) =>
    jc.expectedDelivery &&
    new Date(jc.expectedDelivery) < new Date() &&
    !['delivered', 'closed', 'cancelled'].includes(jc.status);

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
    return (
        <div className="p-6 md:p-8 space-y-8 w-full">
            <Skeleton className="h-9 w-64 mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
            </div>
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
        </div>
    );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    className?: string;
    iconClassName?: string;
    delay?: number;
}

function KpiCard({ label, value, icon: Icon, className, iconClassName, delay = 0 }: KpiCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={cn(
                'relative overflow-hidden bg-card border border-border rounded-3xl p-6 flex flex-col gap-5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all group',
                className
            )}
        >
            <div className={cn('size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300', iconClassName)}>
                <Icon size={28} />
            </div>
            <div>
                <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">{label}</p>
                <p className="text-foreground text-4xl font-black tracking-tight">{value}</p>
            </div>
        </motion.div>
    );
}

// ── Job Card Row ──────────────────────────────────────────────────────────────

function JCRow({ jc, idx }: { jc: any; idx: number }) {
    const navigate = useNavigate();
    const st = STATUS_CONFIG[jc.status] || { label: jc.status, color: 'bg-muted text-muted-foreground border-border' };
    const overdue = isOverdue(jc);

    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + idx * 0.05 }}
            onClick={() => navigate(`/factory/jobcards/${jc._id}`)}
            className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-orange-500/20 hover:shadow-sm transition-all cursor-pointer group"
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/50 text-[11px] font-black text-muted-foreground">
                    {jc.jobCardNumber?.slice(-4) || '#'}
                </div>
                <div className="min-w-0">
                    <p className="text-foreground text-base font-bold truncate leading-tight group-hover:text-orange-500 transition-colors">
                        {jc.title || jc.jobCardNumber}
                    </p>
                    <p className="text-muted-foreground text-sm truncate mt-0.5">
                        {jc.clientId?.name || '—'}
                        {jc.projectId?.projectName ? ` · ${jc.projectId.projectName}` : ''}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
                {overdue && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                        <AlertTriangle size={10} className="text-rose-500" />
                        <span className="text-[9px] font-black text-rose-500 uppercase">Overdue</span>
                    </div>
                )}
                {jc.status === 'qc_failed' && (
                    <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md animate-pulse">Rework</span>
                )}
                {jc.priority && (
                    <span className="text-[10px] font-black uppercase text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-md">{jc.priority}</span>
                )}
                <Badge className={cn('text-xs font-bold border rounded-full px-3 py-1', st.color)}>{st.label}</Badge>
                {jc.expectedDelivery && (
                    <p className="text-xs font-medium text-muted-foreground/60 hidden md:block">
                        {format(new Date(jc.expectedDelivery), 'dd MMM yy')}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function FactoryManagerDashboardPage() {
    const { user } = useAuthStore();
    const userId = user?.id;
    const { data: raw, isLoading } = useJobCards({ limit: 200 });
    const allRaw: any[] = (raw as any)?.data ?? [];

    // Only show cards assigned to this factory manager's production team
    const all = useMemo(() =>
        allRaw.filter(j =>
            j.assignedTo?.production?.some((u: any) => (u._id || u.id || u) === userId)
        ),
        [allRaw, userId]
    );

    const active    = all.filter(j => j.status === 'active');
    const inProd    = all.filter(j => j.status === 'in_production' && (j.reworkCount || 0) === 0);
    const rework    = all.filter(j => j.status === 'qc_failed' || (j.status === 'in_production' && (j.reworkCount || 0) > 0));
    const overdue   = all.filter(isOverdue);
    const completed = all.filter(j => ['qc_passed', 'dispatched', 'delivered', 'closed'].includes(j.status));

    // Production queue: active + in_production + rework, sorted by priority then delivery date
    const queue = useMemo(() =>
        [...active, ...inProd, ...rework].sort((a, b) => {
            const pA = PRIORITY_ORDER[a.priority] ?? 2;
            const pB = PRIORITY_ORDER[b.priority] ?? 2;
            if (pA !== pB) return pA - pB;
            return new Date(a.expectedDelivery || 0).getTime() - new Date(b.expectedDelivery || 0).getTime();
        }),
        [active, inProd, rework]
    );

    if (isLoading) return <DashboardSkeleton />;

    return (
        <div className="p-6 md:p-8 space-y-8 w-full">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">
                    Production Dashboard
                </h1>
                <p className="text-muted-foreground/60 text-sm mt-1 font-medium">
                    Welcome back, {user?.name?.split(' ')[0]} · {new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </motion.div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KpiCard
                    label="Active"
                    value={active.length}
                    icon={Package}
                    iconClassName="bg-blue-500/10 text-blue-500"
                    delay={0}
                />
                <KpiCard
                    label="In Production"
                    value={inProd.length}
                    icon={Wrench}
                    iconClassName="bg-orange-500/10 text-orange-500"
                    delay={0.05}
                />
                <KpiCard
                    label="Rework"
                    value={rework.length}
                    icon={XCircle}
                    iconClassName="bg-rose-500/10 text-rose-500"
                    delay={0.1}
                />
                <KpiCard
                    label="Overdue"
                    value={overdue.length}
                    icon={AlertTriangle}
                    iconClassName="bg-amber-500/10 text-amber-500"
                    delay={0.15}
                />
                <KpiCard
                    label="Completed"
                    value={completed.length}
                    icon={CheckCircle}
                    iconClassName="bg-emerald-500/10 text-emerald-500"
                    delay={0.2}
                />
            </div>

            {/* Rework Alert */}
            {rework.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-foreground tracking-tight">
                                Rework Required
                            </h2>
                            <span className="bg-rose-500/10 text-rose-500 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                                {rework.length} card{rework.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <Link to="/factory/jobcards?filter=qc_failed"
                            className="text-rose-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {rework.slice(0, 5).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}
                    </div>
                </motion.div>
            )}

            {/* Production Queue */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Production Queue</h2>
                        {queue.length > 0 && (
                            <span className="bg-orange-500/10 text-orange-500 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-orange-500/20">
                                {queue.length}
                            </span>
                        )}
                    </div>
                    <Link to="/factory/jobcards"
                        className="text-orange-500 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                        View All <ArrowRight size={14} />
                    </Link>
                </div>

                {queue.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground/40 font-bold italic">
                        No active production jobs assigned to you.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {queue.slice(0, 15).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}
                    </div>
                )}
            </motion.div>

            {/* Overdue Alert */}
            {overdue.filter(j => !['qc_failed'].includes(j.status)).length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" /> Overdue Jobs
                            </h2>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {overdue.filter(j => !['qc_failed'].includes(j.status)).slice(0, 5).map((jc, i) => (
                            <JCRow key={jc._id} jc={jc} idx={i} />
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
