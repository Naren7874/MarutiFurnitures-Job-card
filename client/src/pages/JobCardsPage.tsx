import { Link, useSearchParams } from 'react-router-dom';
import { useJobCards } from '../hooks/useApi';
import { useJobCardStore } from '../stores/jobCardStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Plus, Search, LayoutGrid, List, Clock, FilterX,
    Package, Home, Factory, FlaskConical, CheckCircle, Truck, Archive, PauseCircle, XCircle
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    active: { label: 'Active', icon: Package, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    in_store: { label: 'In Store', icon: Home, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    in_production: { label: 'In Production', icon: Factory, color: 'text-primary dark:text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    qc_pending: { label: 'QC Pending', icon: FlaskConical, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    qc_passed: { label: 'QC Passed', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    dispatched: { label: 'Dispatched', icon: Truck, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    delivered: { label: 'Delivered', icon: Archive, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    on_hold: { label: 'On Hold', icon: PauseCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    closed: { label: 'Closed', icon: Archive, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    ENQUIRY: { label: 'Enquiry', icon: Clock, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' }, // Default/Fallback
};

const ALL_STATUSES = ['active', 'in_store', 'in_production', 'qc_pending', 'qc_passed', 'dispatched', 'delivered', 'on_hold', 'closed', 'cancelled'];

const KANBAN_COLS = [
    { key: 'active', label: 'Active', color: 'bg-blue-500' },
    { key: 'in_store', label: 'Store', color: 'bg-amber-500' },
    { key: 'in_production', label: 'Production', color: 'bg-primary' },
    { key: 'qc_pending', label: 'QC Audit', color: 'bg-purple-500' },
    { key: 'dispatched', label: 'Transit', color: 'bg-cyan-500' },
    { key: 'delivered', label: 'Completed', color: 'bg-emerald-500' },
];

export default function JobCardsPage() {
    const [searchParams] = useSearchParams();
    const urlClientId = searchParams.get('clientId');
    const { filters, setFilter, resetFilters, viewMode, setViewMode } = useJobCardStore();

    const { data: raw, isLoading } = useJobCards({
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
        page: filters.page,
        clientId: urlClientId || undefined,
        limit: 30,
    });

    const resp: any = raw;
    const rawJobCards: any[] = resp?.data ?? [];
    const { user } = useAuthStore();
    const userId = user?.id;
    const isSuperAdmin = user?.role === 'super_admin';

    // Filter job cards if not super_admin
    const filteredJobCards = isSuperAdmin
        ? rawJobCards
        : rawJobCards.filter(jc => {
            // Check if user is assigned in ANY department array
            const isAssignedToAnyDept = jc.assignedTo && Object.values(jc.assignedTo).some((dept: any) => 
                Array.isArray(dept) && dept.some((u: any) => (u._id || u.id || u) === userId)
            );
            
            // Check if user is the salesperson
            const isSalesperson = (jc.salesperson?.id || jc.salesperson?._id || jc.salesperson) === userId;

            return isAssignedToAnyDept || isSalesperson;
        });

    const pagination: any = resp?.pagination ?? {};

    const isOverdue = (expectedDelivery: string) =>
        expectedDelivery &&
        new Date(expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(filters.status); // Simplified check, assuming status is from filter

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
                        <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest text-primary">High Priority</SelectItem>
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
                {urlClientId && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl">
                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Filtered by Client</span>
                        <Link to="/jobcards" className="text-primary hover:text-primary/70 transition-colors">
                            <XCircle size={14} />
                        </Link>
                    </div>
                )}
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
                    >
                        <div className="bg-white/90 dark:bg-card/90 border border-border rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl">
                            <ScrollArea className="w-full">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border/40 hover:bg-transparent">
                                            <TableHead className="px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Job Identity</TableHead>
                                            <TableHead className="px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Client Name</TableHead>
                                            <TableHead className="px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Timeline</TableHead>
                                            <TableHead className="px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Progress Stage</TableHead>
                                            <TableHead className="px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest text-right">Operational Scale</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredJobCards.map((jc, idx) => {
                                            const cfg = STATUS_CONFIG[jc.status?.toLowerCase()] || STATUS_CONFIG.ENQUIRY;
                                            const Icon = cfg.icon;
                                            return (
                                                <motion.tr
                                                    key={jc._id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    className="group hover:bg-muted/40 transition-all cursor-pointer border-border/30"
                                                >
                                                    <TableCell className="px-6 py-5">
                                                        <Link to={`/jobcards/${jc._id}`} className="flex items-center gap-4">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform", cfg.bg, cfg.color)}>
                                                                <Icon size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-foreground font-black text-sm tracking-tight">{jc.jobCardNumber}</p>
                                                                <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-tighter truncate max-w-[150px]">{jc.title}</p>
                                                            </div>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5">
                                                        <p className="text-foreground/80 font-bold text-xs">{jc.clientId?.name || 'External Vendor'}</p>
                                                        <p className="text-muted-foreground/40 text-[10px] font-semibold">{jc.projectName || jc.title || 'Corporate'}</p>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={12} className={cn("text-muted-foreground/40", isOverdue(jc.expectedDelivery) && "text-rose-500")} />
                                                            <span className={cn(
                                                                "text-muted-foreground/60 text-[11px] font-black",
                                                                isOverdue(jc.expectedDelivery) && "text-rose-500"
                                                            )}>
                                                                {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'NOT SET'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5">
                                                        <Badge variant="outline" className={cn(
                                                            "gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xs",
                                                            cfg.bg, cfg.color, cfg.border
                                                        )}>
                                                            <div className={cn("size-1.5 rounded-full animate-pulse", cfg.color.replace('text-', 'bg-'))} />
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-5 text-right">
                                                        <p className="text-foreground font-black text-xs">₹{(jc.quotationId?.grandTotal || 0).toLocaleString()}</p>
                                                        <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">Exclusive of Tax</p>
                                                    </TableCell>
                                                </motion.tr>
                                            );
                                        })}
                                        {filteredJobCards.length === 0 && (
                                            <TableRow><TableCell colSpan={6} className="px-8 py-20 text-center text-muted-foreground/30 font-black uppercase tracking-widest italic">No matching operations found</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
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
                        </div>
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
                        {KANBAN_COLS.map((col) => {
                            const colCards = filteredJobCards.filter((jc) => jc.status === col.key);
                            return (
                                <div key={col.key} className="shrink-0 w-[340px] flex flex-col gap-5 snap-start">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("size-3 rounded-full shadow-lg transition-transform hover:scale-125", col.color.replace('text-', 'bg-'))} />
                                            <span className="text-foreground font-black text-xs uppercase tracking-widest">{col.label}</span>
                                        </div>
                                        <span className="bg-white dark:bg-card border border-border dark:border-border/60 text-muted-foreground text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                                            {colCards.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-4 p-4 rounded-[32px] bg-white/50 dark:bg-card/20 border border-border dark:border-border/40 min-h-[600px] backdrop-blur-sm shadow-inner group/col">
                                        <ScrollArea className="h-full pr-4 pb-4">
                                            <div className="space-y-4">
                                                {colCards.map((jc, jidx) => {
                                                    const cfg = STATUS_CONFIG[jc.status?.toLowerCase()] || STATUS_CONFIG.ENQUIRY;
                                                    return (
                                                        <motion.div
                                                            layout
                                                            key={jc._id}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: jidx * 0.05 }}
                                                        >
                                                            <Link to={`/jobcards/${jc._id}`}>
                                                                <Card className="bg-white/80 dark:bg-card/40 border-border/50 dark:border-white/5 rounded-2xl p-5 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all group relative overflow-hidden">
                                                                    <div className={cn("absolute top-0 right-0 w-16 h-16 bg-linear-to-bl opacity-0 group-hover:opacity-10 rounded-bl-[40px] transition-opacity", cfg.bg)} />

                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border-none shadow-none", cfg.bg, cfg.color)}>
                                                                            {jc.jobCardNumber}
                                                                        </Badge>
                                                                        <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground/40">
                                                                            <Clock size={10} className={cn(isOverdue(jc.expectedDelivery) && "text-rose-500")} />
                                                                            <span className={cn(isOverdue(jc.expectedDelivery) && "text-rose-500")}>
                                                                                {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <p className="text-foreground font-black text-sm tracking-tight mb-2 line-clamp-1 group-hover:text-primary transition-colors">{jc.title}</p>

                                                                    <div className="flex items-center justify-between pt-4 border-t border-border/10">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase">
                                                                                {jc.clientId?.name?.charAt(0) || 'E'}
                                                                            </div>
                                                                            <p className="text-muted-foreground/60 text-[10px] font-bold truncate max-w-[80px]">{jc.clientId?.name || 'External'}</p>
                                                                        </div>
                                                                        <p className="text-foreground font-black text-xs">₹{(jc.quotationId?.grandTotal || 0).toLocaleString()}</p>
                                                                    </div>
                                                                </Card>
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
                                        </ScrollArea>
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
