import { Link } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, AlertTriangle, Clock, ChevronRight, FilterX, MoreHorizontal } from 'lucide-react';
import { useJobCards } from '../hooks/useApi';
import { useJobCardStore } from '../stores/jobCardStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    in_store: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    in_production: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
    qc_pending: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
    qc_passed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    dispatched: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/20' },
    delivered: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
    on_hold: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    cancelled: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
};

const PRIORITY_BADGE: Record<string, string> = {
    low: 'text-muted-foreground/40 border-muted-foreground/10',
    medium: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5',
    high: 'text-orange-500 border-orange-500/20 bg-orange-500/5',
    urgent: 'text-red-500 border-red-500/20 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
};

const ALL_STATUSES = ['active', 'in_store', 'in_production', 'qc_pending', 'qc_passed', 'dispatched', 'delivered', 'on_hold', 'closed', 'cancelled'];

const KANBAN_COLS = [
    { key: 'active', label: 'Active', color: 'bg-blue-500' },
    { key: 'in_store', label: 'Store', color: 'bg-amber-500' },
    { key: 'in_production', label: 'Production', color: 'bg-orange-500' },
    { key: 'qc_pending', label: 'QC Audit', color: 'bg-purple-500' },
    { key: 'dispatched', label: 'Transit', color: 'bg-cyan-500' },
    { key: 'delivered', label: 'Completed', color: 'bg-emerald-500' },
];

export default function JobCardsPage() {
    const { filters, setFilter, resetFilters, viewMode, setViewMode } = useJobCardStore();

    const { data: raw, isLoading } = useJobCards({
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
        page: filters.page,
        limit: 30,
    });

    const resp: any = raw;
    const jobCards: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    const isOverdue = (jc: any) =>
        jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status);

    return (
        <div className="p-8 space-y-8 max-w-[1800px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Operations Pipeline</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            {pagination.total ?? 0} Lifecycle Units Tracking
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white dark:bg-card/50 border border-border dark:border-border/60 rounded-2xl p-1 gap-1 shadow-sm backdrop-blur-md">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <List size={14} strokeWidth={3} /> List View
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                viewMode === 'kanban' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <LayoutGrid size={14} strokeWidth={3} /> Kanban
                        </button>
                    </div>
                    <Link to="/jobcards/new">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} strokeWidth={3} /> New Job Card
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-3"
            >
                <div className="relative flex-1 min-w-[300px] group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={filters.search}
                        onChange={(e) => setFilter('search', e.target.value)}
                        placeholder="Search Job ID, Title, or Project..."
                        className="pl-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground h-12 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/30 shadow-sm"
                    />
                </div>
                <Select value={filters.status || 'all'} onValueChange={(v: string) => setFilter('status', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm min-w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Global Status</SelectItem>
                        {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-[10px] font-black uppercase tracking-widest">
                                {s.replace(/_/g, ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filters.priority || 'all'} onValueChange={(v: string) => setFilter('priority', v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm min-w-[140px]">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">All Priority</SelectItem>
                        <SelectItem value="low" className="text-[10px] font-black uppercase tracking-widest">Low Level</SelectItem>
                        <SelectItem value="medium" className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Medium</SelectItem>
                        <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest text-orange-500">High Priority</SelectItem>
                        <SelectItem value="urgent" className="text-[10px] font-black uppercase tracking-widest text-red-500">Urgent Action</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="h-12 rounded-2xl text-muted-foreground hover:text-rose-500 font-bold text-[10px] uppercase tracking-widest px-6"
                >
                    <FilterX size={14} className="mr-2" /> Reset
                </Button>
            </motion.div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted/40 rounded-[24px] animate-pulse border border-border/30" />
                        ))}
                    </motion.div>
                ) : viewMode === 'list' ? (
                    /* ── List View ─────────────────────────────────────────────────── */
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white/80 dark:bg-card/20 border border-border dark:border-border/20 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/40 bg-muted/20">
                                        <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Job Identification</th>
                                        <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden sm:table-cell">Associated Project</th>
                                        <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Deadline</th>
                                        <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Level</th>
                                        <th className="text-center px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Pipeline Status</th>
                                        <th className="w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {jobCards.map((jc, idx) => {
                                        const cfg = STATUS_CONFIG[jc.status?.toLowerCase()] || STATUS_CONFIG.active;
                                        const overdue = isOverdue(jc);
                                        return (
                                            <motion.tr
                                                key={jc._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-muted/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-8 py-5">
                                                    <Link to={`/jobcards/${jc._id}`} className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform",
                                                            overdue ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                                                        )}>
                                                            <Clock size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-foreground font-black text-sm tracking-tight">{jc.jobCardNumber}</p>
                                                            <p className="text-muted-foreground/60 text-[10px] font-bold uppercase truncate max-w-[200px]">{jc.title}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-8 py-5 hidden sm:table-cell">
                                                    <p className="text-foreground/80 font-bold text-xs">{jc.projectId?.projectName || '—'}</p>
                                                    <p className="text-muted-foreground/40 text-[9px] font-black uppercase">Ref: {jc.projectId?.projectNumber || 'Global'}</p>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        {overdue && <AlertTriangle size={12} className="text-rose-500 animate-pulse" />}
                                                        <span className={cn(
                                                            "text-xs font-black tracking-tight",
                                                            overdue ? "text-rose-600" : "text-muted-foreground/60"
                                                        )}>
                                                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Flexible'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                        PRIORITY_BADGE[jc.priority?.toLowerCase()] || PRIORITY_BADGE.low
                                                    )}>
                                                        {jc.priority}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xs transition-colors",
                                                        cfg.bg, cfg.text, cfg.border
                                                    )}>
                                                        <div className={cn("size-1.5 rounded-full animate-pulse", cfg.text.replace('text-', 'bg-'))} />
                                                        {jc.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <ChevronRight size={18} className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                    {jobCards.length === 0 && (
                                        <tr><td colSpan={6} className="px-8 py-20 text-center text-muted-foreground/30 font-black uppercase tracking-widest italic">No matching operations found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-8 py-5 border-t border-border/20 bg-muted/10">
                                <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Page {filters.page} of {pagination.pages}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)} className="h-9 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-bold text-[10px] uppercase tracking-widest">Previous</Button>
                                    <Button variant="outline" size="sm" disabled={filters.page >= pagination.pages} onClick={() => setFilter('page', filters.page + 1)} className="h-9 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-bold text-[10px] uppercase tracking-widest">Next</Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    /* ── Kanban View ──────────────────────────────────────────────── */
                    <motion.div
                        key="kanban"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex gap-6 overflow-x-auto pb-8 snap-x"
                    >
                        {KANBAN_COLS.map((col, colIdx) => {
                            const colCards = jobCards.filter((jc) => jc.status === col.key);
                            return (
                                <div key={col.key} className="shrink-0 w-[340px] flex flex-col gap-5 snap-start">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("size-3 rounded-full shadow-lg transition-transform hover:scale-125", col.color)} />
                                            <span className="text-foreground font-black text-xs uppercase tracking-widest">{col.label}</span>
                                        </div>
                                        <span className="bg-white dark:bg-card border border-border dark:border-border/60 text-muted-foreground text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                                            {colCards.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-4 p-4 rounded-[32px] bg-white/50 dark:bg-card/20 border border-border dark:border-border/40 min-h-[600px] backdrop-blur-sm shadow-inner group/col">
                                        {colCards.map((jc, jidx) => {
                                            const overdue = isOverdue(jc);
                                            return (
                                                <motion.div
                                                    key={jc._id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: jidx * 0.05 + colIdx * 0.1 }}
                                                >
                                                    <Link to={`/jobcards/${jc._id}`}>
                                                        <div className="bg-white dark:bg-card border border-border dark:border-border/60 rounded-[28px] p-5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all group relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-16 h-16 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className="text-primary text-[10px] font-black tracking-widest group-hover:underline">#{jc.jobCardNumber}</span>
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                                                                    PRIORITY_BADGE[jc.priority?.toLowerCase()] || PRIORITY_BADGE.low
                                                                )}>{jc.priority}</span>
                                                            </div>
                                                            <h4 className="text-foreground text-sm font-black leading-tight mb-4 group-hover:text-primary transition-colors">{jc.title}</h4>

                                                            <div className="pt-4 border-t border-border/30 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                                                        {jc.clientId?.name?.charAt(0) || '?'}
                                                                    </div>
                                                                    <span className="text-muted-foreground/60 text-[9px] font-black uppercase tracking-tighter truncate max-w-[100px]">
                                                                        {jc.clientId?.name || 'Unknown'}
                                                                    </span>
                                                                </div>
                                                                {overdue ? (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                                                        <AlertTriangle size={10} />
                                                                        <span className="text-[9px] font-black">DELAYED</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[9px] font-black text-muted-foreground/30">
                                                                        {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN') : '--/--'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </motion.div>
                                            );
                                        })}
                                        {colCards.length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                                                <div className="size-12 rounded-full border-2 border-dashed border-border/40 flex items-center justify-center text-muted-foreground/20">
                                                    <Plus size={20} />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 mt-3 italic">Empty Stage</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
