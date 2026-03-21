import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    PencilLine, Wrench, Shield, Truck,
    Package, Clock, AlertTriangle, CheckCircle2,
    ArrowRight, FileText, ClipboardList, Inbox, Layers,
    BarChart3, Banknote, Receipt, XCircle,
} from 'lucide-react';
import { useJobCards, useQuotations } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '../../stores/authStore';

// ── colour theme per role ──────────────────────────────────────────────────────
const ROLE_META: Record<string, { from: string; to: string; ring: string; icon: any; label: string }> = {
    design:     { from: 'from-violet-600', to: 'to-violet-900', ring: 'ring-violet-400/30',  icon: PencilLine,    label: 'Design Dashboard'     },
    store:      { from: 'from-amber-500',  to: 'to-orange-700', ring: 'ring-amber-300/30',   icon: Package,       label: 'Store Dashboard'       },
    production: { from: 'from-blue-600',   to: 'to-blue-900',   ring: 'ring-blue-400/30',    icon: Wrench,        label: 'Production Dashboard'  },
    qc:         { from: 'from-teal-500',   to: 'to-emerald-800',ring: 'ring-teal-400/30',    icon: Shield,        label: 'Quality Control'       },
    dispatch:   { from: 'from-green-600',  to: 'to-green-900',  ring: 'ring-green-400/30',   icon: Truck,         label: 'Dispatch Dashboard'    },
    sales:      { from: 'from-indigo-600', to: 'to-indigo-900', ring: 'ring-indigo-400/30',  icon: FileText,      label: 'Sales Dashboard'       },
    accountant: { from: 'from-rose-600',   to: 'to-pink-900',   ring: 'ring-rose-400/30',    icon: Receipt,       label: 'Finance Dashboard'     },
};

const STATUS_BADGE: Record<string, string> = {
    active:        'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    in_store:      'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    in_production: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
    qc_pending:    'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400',
    qc_failed:     'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
    qc_passed:     'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    dispatched:    'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400',
    delivered:     'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    closed:        'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) : '—';

const isOverdue = (jc: any) =>
    jc.expectedDelivery &&
    new Date(jc.expectedDelivery) < new Date() &&
    !['delivered', 'closed', 'cancelled'].includes(jc.status);

// ── Shared Stat Card ───────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, colorClass, sub, delay = 0 }: {
    icon: any; label: string; value: number | string; colorClass: string; sub?: string; delay?: number;
}) => (
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
        <Card className="rounded-[22px] border-border/40 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', colorClass)}>
                    <Icon size={22} strokeWidth={2} />
                </div>
                {sub && (
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 rounded-full border-none bg-muted/40 h-5">
                        {sub}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="pt-1">
                <p className="text-muted-foreground/50 text-[9px] font-black uppercase tracking-[0.18em] mb-1">{label}</p>
                <p className="text-foreground text-4xl font-black tracking-tight tabular-nums">{value ?? 0}</p>
            </CardContent>
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
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Overdue</span>
                            </motion.div>
                        )}
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-wider">
                                <Clock size={10} />
                                {fmtDate(jc.expectedDelivery)}
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

const DesignDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.design?.some((u: any) => (u._id || u.id || u) === userId));

    const queue   = all.filter(j => j.status === 'active');
    const inStore = all.filter(j => j.status === 'in_store');
    const overdue = all.filter(isOverdue);
    const show    = [...queue, ...inStore];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={PencilLine} label="Awaiting Design"  value={queue.length}   colorClass="bg-violet-500/10 text-violet-500" delay={0.1} />
                <StatCard icon={Package}   label="In Store Stage"   value={inStore.length} colorClass="bg-amber-500/10 text-amber-500"   delay={0.2} />
                <StatCard icon={AlertTriangle} label="Overdue"       value={overdue.length} colorClass="bg-rose-500/10 text-rose-500"     delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Assigned" value={all.length}    colorClass="bg-primary/10 text-primary" sub="All" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="My Design Queue" count={show.length} />
                {isLoading
                    ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : show.length === 0 ? <EmptyState label="No job cards assigned to you yet" />
                    : <div className="space-y-1">{show.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};

const ProductionDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.production?.some((u: any) => (u._id || u.id || u) === userId));

    const inProd  = all.filter(j => j.status === 'in_production');
    const rework  = all.filter(j => j.status === 'qc_failed');
    const overdue = all.filter(isOverdue);
    const show    = [...inProd, ...rework];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Wrench}     label="In Production"     value={inProd.length}  colorClass="bg-blue-500/10 text-blue-500"    delay={0.1} />
                <StatCard icon={XCircle}    label="Rework (QC Failed)" value={rework.length}  colorClass="bg-rose-500/10 text-rose-500"    delay={0.2} />
                <StatCard icon={AlertTriangle} label="Overdue"         value={overdue.length} colorClass="bg-amber-500/10 text-amber-500"  delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Queue"     value={all.length}     colorClass="bg-primary/10 text-primary" sub="Active" delay={0.4} />
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
    const passed  = all.filter(j => j.status === 'qc_passed');
    const failed  = all.filter(j => j.status === 'qc_failed');
    const show    = [...pending, ...failed, ...passed];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Shield}     label="Awaiting QC"     value={pending.length} colorClass="bg-purple-500/10 text-purple-500"    delay={0.1} />
                <StatCard icon={CheckCircle2} label="Passed"         value={passed.length}  colorClass="bg-emerald-500/10 text-emerald-500"  delay={0.2} />
                <StatCard icon={XCircle}    label="Failed / Rework" value={failed.length}  colorClass="bg-rose-500/10 text-rose-500"         delay={0.3} />
                <StatCard icon={Layers}     label="Total QC Jobs"   value={show.length}    colorClass="bg-primary/10 text-primary" sub="Queue" delay={0.4} />
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

    const ready      = all.filter(j => j.status === 'qc_passed');
    const dispatched = all.filter(j => j.status === 'dispatched');
    const delivered  = all.filter(j => j.status === 'delivered');
    const show       = [...ready, ...dispatched, ...delivered];
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Truck}        label="Ready to Dispatch" value={ready.length}      colorClass="bg-primary/10 text-primary"             delay={0.1} />
                <StatCard icon={ArrowRight}   label="In Transit"        value={dispatched.length} colorClass="bg-blue-500/10 text-blue-500"           delay={0.2} />
                <StatCard icon={CheckCircle2} label="Delivered"         value={delivered.length}  colorClass="bg-emerald-500/10 text-emerald-500"     delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Assigned"   value={show.length}       colorClass="bg-amber-500/10 text-amber-500" sub="All" delay={0.4} />
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

const StoreDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    // For store, we check if they are in the 'store' team
    const all = rawAll.filter(j => j.assignedTo?.store?.some((u: any) => (u._id || u.id || u) === userId));

    const inStore  = all.filter(j => j.status === 'in_store');
    const overdue  = all.filter(isOverdue);
    const today    = new Date();
    const todayInStore = inStore.filter(j => {
        const d = new Date(j.updatedAt);
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    });
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Package}      label="Waiting Materials" value={inStore.length}    colorClass="bg-amber-500/10 text-amber-500"          delay={0.1} />
                <StatCard icon={AlertTriangle} label="Overdue"          value={overdue.length}    colorClass="bg-rose-500/10 text-rose-500"             delay={0.2} />
                <StatCard icon={CheckCircle2} label="Handled Today"     value={todayInStore.length} colorClass="bg-emerald-500/10 text-emerald-500"    delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Assigned"   value={all.length}        colorClass="bg-primary/10 text-primary" sub="All"    delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Store Queue — Awaiting Materials" count={inStore.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : all.length === 0 ? <EmptyState label="All materials handled" />
                    : <div className="space-y-1">{all.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
            </Card>
        </div>
    );
};

const SalesDashboard = () => {
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { data: qRaw, isLoading } = useQuotations({ limit: 100 });
    const rawAll: any[] = (qRaw as any)?.data ?? [];
    
    // Filter by salesperson
    const all = rawAll.filter(q => (q.salesperson?._id || q.salesperson?.id || q.salesperson) === userId);

    const draft    = all.filter(q => q.status === 'draft');
    const sent     = all.filter(q => q.status === 'sent');
    const approved = all.filter(q => q.status === 'approved' || q.status === 'converted');
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={FileText}     label="Drafts"              value={draft.length}    colorClass="bg-slate-500/10 text-slate-500"    delay={0.1} />
                <StatCard icon={ArrowRight}   label="Sent — Pending"      value={sent.length}     colorClass="bg-blue-500/10 text-blue-500"      delay={0.2} />
                <StatCard icon={CheckCircle2} label="Approved/Converted"  value={approved.length} colorClass="bg-emerald-500/10 text-emerald-500" delay={0.3} />
                <StatCard icon={ClipboardList} label="Total Quotations"   value={all.length}      colorClass="bg-primary/10 text-primary" sub="All" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="My Quotations Pipeline" count={all.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : all.length === 0 ? <EmptyState label="No quotations yet" />
                    : (
                        <div className="space-y-1">
                            {all.slice(0, 20).map((q: any, i: number) => {
                                const cls =
                                    q.status === 'approved' || q.status === 'converted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    q.status === 'sent'   ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                    q.status === 'draft'  ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
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
    const { id: userId } = useAuthStore(state => state.user) || {};
    const { all: rawAll, isLoading } = useAllJobCards();
    const all = rawAll.filter(j => j.assignedTo?.accountant?.some((u: any) => (u._id || u.id || u) === userId));

    const pending = all.filter(j => j.status === 'delivered');
    const closed  = all.filter(j => j.status === 'closed');
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard icon={Banknote}     label="Delivered — Awaiting Invoice" value={pending.length} colorClass="bg-emerald-500/10 text-emerald-500" delay={0.1} />
                <StatCard icon={Receipt}      label="Closed Jobs"                  value={closed.length}  colorClass="bg-zinc-500/10 text-zinc-500"        delay={0.2} />
                <StatCard icon={BarChart3}    label="Total Handled"                value={all.length}     colorClass="bg-primary/10 text-primary"           delay={0.3} />
                <StatCard icon={ClipboardList} label="Finance Queue"               value={all.length}     colorClass="bg-rose-500/10 text-rose-500" sub="Active" delay={0.4} />
            </div>
            <Card className="rounded-[28px] border-border/40 p-6 shadow-sm">
                <SectionTitle title="Delivered Jobs — Awaiting Invoice" count={pending.length} />
                {isLoading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
                    : all.length === 0 ? <EmptyState label="No delivered jobs yet" />
                    : <div className="space-y-1">{all.slice(0, 20).map((jc, i) => <JCRow key={jc._id} jc={jc} idx={i} />)}</div>
                }
                <div className="mt-5 pt-4 border-t border-border/20">
                    <Link to="/invoices">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline">
                            <Receipt size={12} /> View All Invoices <ArrowRight size={12} />
                        </div>
                    </Link>
                </div>
            </Card>
        </div>
    );
};

// ── Banner Header ──────────────────────────────────────────────────────────────

const RoleBanner = ({ meta, name }: { meta: typeof ROLE_META[string]; name: string }) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const Icon = meta.icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn('rounded-[30px] p-8 bg-linear-to-br text-white shadow-2xl relative overflow-hidden', meta.from, meta.to)}
        >
            <div className={cn('absolute inset-0 rounded-[30px] ring-2 ring-inset opacity-40', meta.ring)} />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[22px] bg-white/15 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/10 shadow-xl">
                        <Icon size={30} className="text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.35em] mb-1">{greeting}</p>
                        <h1 className="text-2xl font-black tracking-tight text-white leading-none mb-1">
                            {name?.split(' ')[0] || 'User'}
                        </h1>
                        <p className="text-white/60 text-xs font-semibold">{meta.label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3 rounded-2xl">
                    <Clock size={14} className="text-white/60" />
                    <span className="text-white text-xs font-bold">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </span>
                </div>
            </div>
            <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </motion.div>
    );
};

// ── Main Export ────────────────────────────────────────────────────────────────

export default function StaffDashboard({ role, name }: { role: string; name: string }) {
    const meta = ROLE_META[role] || ROLE_META.design;

    return (
        <div className="p-5 md:p-7 space-y-8 max-w-[1400px] mx-auto">
            <RoleBanner meta={meta} name={name} />

            {role === 'design'     && <DesignDashboard />}
            {role === 'production' && <ProductionDashboard />}
            {role === 'qc'         && <QCDashboard />}
            {role === 'dispatch'   && <DispatchDashboard />}
            {role === 'store'      && <StoreDashboard />}
            {role === 'sales'      && <SalesDashboard />}
            {role === 'accountant' && <AccountantDashboard />}
        </div>
    );
}
