import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FileText, Clock, MoreHorizontal } from 'lucide-react';
import { useQuotations } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
    sent: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    rejected: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
    converted: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
    revised: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
};

export default function QuotationsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('quotation.create');

    const { data: raw, isLoading } = useQuotations({ search, status, page, limit: 20 });
    const resp: any = raw;
    const quotations: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Quotations</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            {pagination.total ?? 0} Global Estimates
                        </p>
                    </div>
                </div>
                {canCreate && (
                    <Link to="/quotations/new">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} strokeWidth={3} /> Create Quotation
                        </Button>
                    </Link>
                )}
            </motion.div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
                <div className="md:col-span-3 relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by quote number, project name or client..."
                        className="pl-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground h-12 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/30 shadow-sm"
                    />
                </div>
                <Select value={status || 'all'} onValueChange={(v: string) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="h-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm focus:ring-primary/10 transition-all">
                        <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                        <SelectItem value="all" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors">All Quotes</SelectItem>
                        <SelectItem value="draft" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors">Drafts</SelectItem>
                        <SelectItem value="sent" className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-blue-500 hover:bg-blue-500/10 transition-colors">Sent to Client</SelectItem>
                        <SelectItem value="approved" className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 transition-colors">Approved</SelectItem>
                        <SelectItem value="rejected" className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 transition-colors">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            {/* Main Content Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white/80 dark:bg-card/30 border border-border dark:border-border/50 rounded-[32px] overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-xl"
            >
                {isLoading ? (
                    <div className="p-8 space-y-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/40 rounded-2xl animate-pulse border border-border/30" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/20">
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Quotation Identity</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden sm:table-cell">Client Entity</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Project Detail</th>
                                    <th className="text-right px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Total Value</th>
                                    <th className="text-center px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Lifecycle</th>
                                    <th className="w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                <AnimatePresence mode="popLayout">
                                    {quotations.map((q, idx) => {
                                        const cfg = STATUS_BADGE[q.status?.toLowerCase()] || STATUS_BADGE.draft;
                                        return (
                                            <motion.tr
                                                key={q._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="group hover:bg-muted/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-8 py-5">
                                                    <Link to={`/quotations/${q._id}`} className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-foreground font-black text-sm tracking-tight">{q.quotationNumber}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Clock size={10} className="text-muted-foreground/40" />
                                                                <p className="text-muted-foreground/60 text-[10px] font-bold">
                                                                    {new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-8 py-5 hidden sm:table-cell">
                                                    <p className="text-foreground/80 font-bold text-xs">{q.clientId?.name || 'N/A'}</p>
                                                    <p className="text-muted-foreground/40 text-[10px] font-semibold">{q.clientId?.city || 'Corporate'}</p>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <p className="text-muted-foreground/60 text-[11px] font-bold uppercase tracking-tight truncate max-w-[200px]">{q.projectName || '—'}</p>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell text-right">
                                                    <p className="text-foreground font-black text-sm">₹{q.grandTotal?.toLocaleString('en-IN')}</p>
                                                    <p className="text-[10px] text-muted-foreground/40 font-bold uppercase">Incl. GST</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xs transition-colors",
                                                        cfg.bg, cfg.text, cfg.border
                                                    )}>
                                                        <div className={cn("size-1.5 rounded-full", cfg.text.replace('text-', 'bg-'))} />
                                                        {q.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button className="text-muted-foreground/30 hover:text-primary transition-colors">
                                                        <MoreHorizontal size={20} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                                {quotations.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <FileText size={48} className="text-muted-foreground/10" />
                                                <p className="text-muted-foreground/40 text-sm font-black uppercase tracking-widest italic">No Estimates Found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-border/20 bg-muted/10">
                        <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                            Page {page} of {pagination.pages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-9 px-4 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-widest"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.pages}
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-9 px-4 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-widest"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
