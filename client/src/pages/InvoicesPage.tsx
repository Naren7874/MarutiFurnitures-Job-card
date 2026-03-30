import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Receipt, CheckCircle, Clock, XCircle, FilterX, Wallet, FileText, TrendingUp } from 'lucide-react';
import { useInvoices } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    draft: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20', icon: Clock },
    sent: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', icon: FileText },
    partially_paid: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: TrendingUp },
    paid: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle },
    overdue: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', icon: XCircle },
    cancelled: { bg: 'bg-muted text-muted-foreground border-border', text: 'text-muted-foreground/40', border: 'border-border/50', icon: XCircle },
};

const StatCard = ({ icon: Icon, label, value, sub, colorClass, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-card border border-border/60 rounded-[24px] p-6 flex flex-col gap-4 hover:shadow-2xl hover:shadow-primary/5 transition-all group relative overflow-hidden shadow-sm"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", colorClass)}>
            <Icon size={22} strokeWidth={2.5} />
        </div>
        <div>
            <p className="text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-black tracking-tight">{value ?? '0'}</p>
                {sub && <span className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-widest">{sub}</span>}
            </div>
        </div>
    </motion.div>
);

export default function InvoicesPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('invoice.create');

    const { data: raw, isLoading } = useInvoices({ search, status, page, limit: 20 });
    const resp: any = raw;
    const invoices: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    const totalPaid = invoices.filter((i: any) => i.status === 'paid').length;
    const totalOverdue = invoices.filter((i: any) => i.status === 'overdue').length;

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-foreground mb-3 leading-none">Proforma Invoice Ledger</h1>
                    <div className="flex items-center gap-3.5">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-muted-foreground/60 text-[13px] font-black uppercase tracking-[0.15em]">
                            Financial Operations Control
                        </p>
                    </div>
                </div>
                {canCreate && (
                    <Link to="/invoices/new">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2.5 font-black text-[11px] uppercase tracking-[0.15em] h-12 px-7 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} strokeWidth={3} /> Issue New Proforma Invoice
                        </Button>
                    </Link>
                )}
            </motion.div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Receipt}
                    label="Total Issued"
                    value={pagination.total ?? 0}
                    sub="Requests"
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0.1}
                />
                <StatCard
                    icon={CheckCircle}
                    label="Settled Proforma Invoices"
                    value={totalPaid}
                    sub="Settled"
                    colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    delay={0.2}
                />
                <StatCard
                    icon={XCircle}
                    label="Overdue Alert"
                    value={totalOverdue}
                    sub="Critical"
                    colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    delay={0.3}
                />
                <StatCard
                    icon={Wallet}
                    label="Global Balance"
                    value={`₹${invoices.reduce((acc, i) => acc + (i.balanceDue || 0), 0).toLocaleString('en-IN')}`}
                    sub="Receivable"
                    colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    delay={0.4}
                />
            </div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
            >
                <div className="relative flex-1 min-w-[300px] group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search Proforma Invoice ID or Client Identity..."
                        className="pl-12 bg-card border-border/80 text-foreground h-12 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/40 shadow-sm backdrop-blur-md"
                    />
                </div>
                <Select value={status || 'all'} onValueChange={(v: string) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="h-12 bg-card border-border/80 text-foreground rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] px-6 shadow-sm min-w-[200px]">
                        <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl shadow-2xl">
                        <SelectItem value="all" className="text-[11px] font-black uppercase tracking-[0.15em] py-3">Global Status</SelectItem>
                        <SelectItem value="draft" className="text-[11px] font-black uppercase tracking-[0.15em] py-3">Drafting</SelectItem>
                        <SelectItem value="sent" className="text-[11px] font-black uppercase tracking-[0.15em] py-3">Dispatched</SelectItem>
                        <SelectItem value="partially_paid" className="text-[11px] font-black uppercase tracking-[0.15em] py-3 text-amber-500">Partial Payment</SelectItem>
                        <SelectItem value="paid" className="text-[11px] font-black uppercase tracking-[0.15em] py-3 text-emerald-500">Fully Settled</SelectItem>
                        <SelectItem value="overdue" className="text-[11px] font-black uppercase tracking-[0.15em] py-3 text-rose-500">Overdue Risk</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
                    className="h-12 rounded-2xl text-muted-foreground hover:text-rose-500 font-black text-[11px] uppercase tracking-widest px-8 transition-colors"
                >
                    <FilterX size={16} className="mr-2.5" /> Reset
                </Button>
            </motion.div>

            {/* Table Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-card border border-border focus-within:border-primary/50 rounded-[32px] overflow-hidden shadow-2xl"
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
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Proforma Invoice Unit</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em] hidden sm:table-cell">Client Name</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em] hidden md:table-cell">Settlement Due</th>
                                    <th className="text-right px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Gross Total</th>
                                    <th className="text-right px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em] hidden md:table-cell">Balance Outstanding</th>
                                    <th className="text-center px-8 py-5 text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.15em]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                <AnimatePresence mode="popLayout">
                                    {invoices.map((inv: any, idx: number) => {
                                        const cfg = STATUS_CONFIG[inv.status?.toLowerCase()] || STATUS_CONFIG.draft;
                                        const StatusIcon = cfg.icon;
                                        return (
                                            <motion.tr
                                                key={inv._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-muted/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-8 py-5">
                                                    <Link to={`/invoices/${inv._id}`} className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                                                            <Receipt size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-foreground font-black text-[15px] tracking-tight">{inv.invoiceNumber}</p>
                                                            <p className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-wider">Ref: {inv._id?.slice(-6)}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-8 py-5 hidden sm:table-cell">
                                                    <p className="text-foreground font-bold text-[13px]">{inv.clientId?.name}</p>
                                                    <p className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-wider truncate max-w-[120px]">{inv.projectName || inv.jobCardId?.projectName || 'External Account'}</p>
                                                </td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className="text-muted-foreground/30" />
                                                        <span className="text-muted-foreground/60 text-[11px] font-bold">
                                                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <p className="text-foreground font-black text-[15px] tracking-tight">₹{inv.grandTotal?.toLocaleString('en-IN')}</p>
                                                </td>
                                                <td className="px-8 py-5 text-right hidden md:table-cell">
                                                    <span className={cn(
                                                        "text-xs font-black tracking-tighter",
                                                        inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                                                    )}>
                                                        ₹{inv.balanceDue?.toLocaleString('en-IN') ?? '0'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] border shadow-xs transition-colors",
                                                        cfg.bg, cfg.text, cfg.border
                                                    )}>
                                                        <StatusIcon size={13} className={cn("shrink-0", cfg.text)} />
                                                        {inv.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                                {invoices.length === 0 && (
                                    <tr><td colSpan={7} className="px-8 py-20 text-center text-muted-foreground/30 font-black uppercase tracking-widest italic">No financial records detected</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-border/20 bg-muted/10">
                        <span className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.2em]">
                            Ledger Page {page} of {pagination.pages}
                        </span>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.pages}
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
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
