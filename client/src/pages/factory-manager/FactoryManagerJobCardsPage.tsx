import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Wrench, AlertTriangle, Clock, ArrowRight, Inbox, Search, Filter,
    ClipboardList, XCircle, CheckCircle2,
} from 'lucide-react';
import { useJobCards } from '../../hooks/useApi';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_production: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    qc_pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    qc_failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    qc_passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dispatched: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const PRIORITY_BADGE: Record<string, string> = {
    urgent: 'bg-red-500/10 text-red-500',
    high: 'bg-orange-500/10 text-orange-500',
    medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    low: 'bg-slate-500/10 text-slate-400',
};

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active', icon: ClipboardList },
    { label: 'In Production', value: 'in_production', icon: Wrench },
    { label: 'Rework', value: 'qc_failed', icon: XCircle },
    { label: 'Completed', value: 'completed', icon: CheckCircle2 },
];

const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: '2-digit' }) : '—';

const isOverdue = (jc: any) =>
    jc.expectedDelivery &&
    new Date(jc.expectedDelivery) < new Date() &&
    !['delivered', 'closed', 'cancelled'].includes(jc.status);

const COMPLETED_STATUSES = ['qc_passed', 'dispatched', 'delivered', 'closed'];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FactoryManagerJobCardsPage() {
    const { user } = useAuthStore();
    const userId = user?.id;
    const [activeFilter, setActiveFilter] = useState('all');
    const [search, setSearch] = useState('');

    const { data: raw, isLoading } = useJobCards({ limit: 200 });
    const allRaw: any[] = (raw as any)?.data ?? [];

    // Scope: only assigned production cards
    const myCards = useMemo(() =>
        allRaw.filter(j =>
            j.assignedTo?.production?.some((u: any) => (u._id || u.id || u) === userId)
        ),
        [allRaw, userId]
    );

    // Filter by status tab
    const filtered = useMemo(() => {
        let cards = myCards;
        if (activeFilter === 'completed') {
            cards = cards.filter(j => COMPLETED_STATUSES.includes(j.status));
        } else if (activeFilter !== 'all') {
            cards = cards.filter(j => j.status === activeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            cards = cards.filter(j =>
                j.jobCardNumber?.toLowerCase().includes(q) ||
                j.title?.toLowerCase().includes(q) ||
                j.clientId?.name?.toLowerCase().includes(q) ||
                j.projectId?.projectName?.toLowerCase().includes(q)
            );
        }
        return cards.sort((a, b) => {
            // Rework cards first
            if (a.status === 'qc_failed' && b.status !== 'qc_failed') return -1;
            if (b.status === 'qc_failed' && a.status !== 'qc_failed') return 1;
            // Then by priority
            const pA = PRIORITY_ORDER[a.priority] ?? 2;
            const pB = PRIORITY_ORDER[b.priority] ?? 2;
            if (pA !== pB) return pA - pB;
            return new Date(a.expectedDelivery || 0).getTime() - new Date(b.expectedDelivery || 0).getTime();
        });
    }, [myCards, activeFilter, search]);

    const counts = {
        all: myCards.length,
        active: myCards.filter(j => j.status === 'active').length,
        in_production: myCards.filter(j => j.status === 'in_production').length,
        qc_failed: myCards.filter(j => j.status === 'qc_failed').length,
        completed: myCards.filter(j => COMPLETED_STATUSES.includes(j.status)).length,
    };

    return (
        <div className="p-5 md:p-7 space-y-6 max-w-[1200px] mx-auto">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-1">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                        <ClipboardList size={20} className="text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">My Job Cards</h1>
                        <p className="text-muted-foreground/50 text-xs font-medium">Production assignments · {myCards.length} total</p>
                    </div>
                </div>
            </motion.div>

            {/* Search + Filter */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search job number, client, project…"
                        className="pl-9 h-10 rounded-xl bg-muted/20 border-border/40 text-sm"
                    />
                </div>
                {/* Filter pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={13} className="text-muted-foreground/30 shrink-0" />
                    {FILTERS.map(f => {
                        const count = counts[f.value as keyof typeof counts] ?? 0;
                        const isActive = activeFilter === f.value;
                        return (
                            <button
                                key={f.value}
                                onClick={() => setActiveFilter(f.value)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide transition-all border',
                                    isActive
                                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                        : 'bg-muted/20 text-muted-foreground border-border/30 hover:border-border'
                                )}
                            >
                                {f.label}
                                {count > 0 && (
                                    <span className={cn('text-[9px] font-black px-1 py-0.5 rounded-full',
                                        isActive ? 'bg-orange-500/20' : 'bg-muted')}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Cards List */}
            <div className="bg-card border border-border/40 rounded-[28px] overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-24">
                        <Inbox size={44} className="text-muted-foreground/15" />
                        <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-[0.25em]">
                            {search ? 'No results found' : 'No job cards in this category'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/20">
                        {filtered.map((jc, i) => {
                            const statusCls = STATUS_BADGE[jc.status] || 'bg-muted text-muted-foreground border-border';
                            const priCls = PRIORITY_BADGE[jc.priority] || PRIORITY_BADGE.medium;
                            const overdue = isOverdue(jc);
                            const isRework = jc.status === 'qc_failed';

                            return (
                                <motion.div
                                    key={jc._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    whileHover={{ x: 3 }}
                                >
                                    <Link to={`/factory/jobcards/${jc._id}`}>
                                        <div className={cn(
                                            'flex items-center gap-4 px-5 py-4 hover:bg-muted/30 cursor-pointer group transition-all relative',
                                            isRework && 'bg-rose-500/3 hover:bg-rose-500/5'
                                        )}>
                                            {/* Status icon dot */}
                                            {jc.items?.[0]?.photo && !isRework ? (
                                                <div className={cn('w-12 h-12 rounded-xl overflow-hidden shrink-0 border backdrop-blur-sm', statusCls.replace('bg-', 'bg-opacity-10 '))}>
                                                    <img src={jc.items[0].photo} alt={jc.jobCardNumber} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 border', statusCls)}>
                                                    {isRework ? <XCircle size={18} /> : jc.jobCardNumber?.slice(-4) || '#'}
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-[15px] text-foreground group-hover:text-orange-500 transition-colors truncate tracking-tight">
                                                        {jc.title || jc.jobCardNumber}
                                                    </p>
                                                    {isRework && (
                                                        <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-500/20 shrink-0 animate-pulse">
                                                            Rework
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 truncate">
                                                    <span className="text-orange-500/50">{jc.jobCardNumber}</span>
                                                    {jc.clientId?.name ? ` · ${jc.clientId.name}` : ''}
                                                    {jc.projectId?.projectName ? ` · ${jc.projectId.projectName}` : ''}
                                                </p>
                                            </div>

                                            {/* Meta */}
                                            <div className="hidden sm:flex items-center gap-3 shrink-0">
                                                {overdue && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                                                        <AlertTriangle size={9} className="text-rose-500" />
                                                        <span className="text-[9px] font-black text-rose-500 uppercase">Overdue</span>
                                                    </div>
                                                )}
                                                <Badge variant="outline" className={cn('text-[9px] font-black uppercase rounded-lg px-2 py-0.5', priCls)}>
                                                    {jc.priority}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/40 font-bold">
                                                    <Clock size={10} />
                                                    {fmtDate(jc.expectedDelivery)}
                                                </div>
                                                <Badge variant="outline" className={cn('text-[9px] font-black uppercase rounded-lg px-2 py-0.5', statusCls)}>
                                                    {jc.status?.replace(/_/g, ' ')}
                                                </Badge>
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-muted/20 group-hover:bg-orange-500/10 transition-all">
                                                    <ArrowRight size={13} className="text-muted-foreground/20 group-hover:text-orange-500 transition-all group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between">
                        <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                            Showing {filtered.length} of {myCards.length} assigned cards
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
