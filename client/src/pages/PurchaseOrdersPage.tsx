import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ShoppingCart, Clock, Package, FilterX, ChevronRight, MoreHorizontal, ShieldCheck, Truck, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    draft: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20', icon: Clock },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: Clock },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', icon: ShieldCheck },
    rejected: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', icon: AlertCircle },
    ordered: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', icon: Truck },
    received: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', icon: Package },
};

const StatCard = ({ icon: Icon, label, value, sub, colorClass, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="bg-white dark:bg-card border border-border dark:border-transparent rounded-[24px] p-6 flex flex-col gap-4 hover:shadow-2xl hover:shadow-primary/5 transition-all group relative overflow-hidden shadow-sm"
    >
        <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", colorClass)}>
            <Icon size={22} strokeWidth={2.5} />
        </div>
        <div>
            <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-black tracking-tight">{value ?? '0'}</p>
                {sub && <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">{sub}</span>}
            </div>
        </div>
    </motion.div>
);

export default function PurchaseOrdersPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);

    const { data: raw, isLoading } = useQuery({
        queryKey: ['purchaseOrders', { search, status, page }],
        queryFn: () => apiGet('/purchase-orders', { search, status, page, limit: 20 }),
    });
    const resp: any = raw;
    const pos: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    const stats = {
        total: pagination.total ?? 0,
        approved: pos.filter(p => p.status === 'approved').length,
        pending: pos.filter(p => p.status === 'pending').length,
        received: pos.filter(p => p.status === 'received').length,
    };

    return (
        <div className="p-8 space-y-10 max-w-[1700px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Procurement Engine</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            Supply Chain Lifecycle & Inventory Inflow
                        </p>
                    </div>
                </div>
                <Link to="/purchase-orders/new">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <Plus size={18} strokeWidth={3} /> Create Purchase Order
                    </Button>
                </Link>
            </motion.div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={ShoppingCart}
                    label="Orders Volume"
                    value={stats.total}
                    sub="Total"
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0.1}
                />
                <StatCard
                    icon={Clock}
                    label="Pending Review"
                    value={stats.pending}
                    sub="Awaiting"
                    colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    delay={0.2}
                />
                <StatCard
                    icon={ShieldCheck}
                    label="Approved Units"
                    value={stats.approved}
                    sub="Verified"
                    colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    delay={0.3}
                />
                <StatCard
                    icon={Package}
                    label="Shipments In"
                    value={stats.received}
                    sub="Completed"
                    colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    delay={0.4}
                />
            </div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap items-center gap-3"
            >
                <div className="relative flex-1 min-w-[300px] group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search PO ID or Vendor Name..."
                        className="pl-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground h-12 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/30 shadow-sm backdrop-blur-md"
                    />
                </div>
                <Select value={status || 'all'} onValueChange={(v: string) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="h-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm min-w-[200px]">
                        <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest">Global Status</SelectItem>
                        <SelectItem value="pending" className="text-[10px] font-black uppercase tracking-widest text-amber-500">Awaiting Approval</SelectItem>
                        <SelectItem value="approved" className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Authorized</SelectItem>
                        <SelectItem value="ordered" className="text-[10px] font-black uppercase tracking-widest text-blue-500">Procured</SelectItem>
                        <SelectItem value="received" className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Inbounded</SelectItem>
                        <SelectItem value="rejected" className="text-[10px] font-black uppercase tracking-widest text-rose-500">Declined</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
                    className="h-12 rounded-2xl text-muted-foreground hover:text-rose-500 font-bold text-[10px] uppercase tracking-widest px-6"
                >
                    <FilterX size={14} className="mr-2" /> Reset
                </Button>
            </motion.div>

            {/* Table Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/80 dark:bg-card/30 border border-border dark:border-border/50 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-xl"
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
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Inflow Manifest</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden sm:table-cell">Supply Source</th>
                                    <th className="text-left px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Stock Intensity</th>
                                    <th className="text-right px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Manifest Value</th>
                                    <th className="text-center px-8 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Pipeline Phase</th>
                                    <th className="w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                <AnimatePresence mode="popLayout">
                                    {pos.map((po: any, idx: number) => {
                                        const cfg = STATUS_CONFIG[po.status?.toLowerCase()] || STATUS_CONFIG.draft;
                                        const StatusIcon = cfg.icon;
                                        return (
                                            <motion.tr
                                                key={po._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="group hover:bg-muted/30 transition-all cursor-pointer"
                                            >
                                                <td className="px-8 py-5">
                                                    <Link to={`/purchase-orders/${po._id}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                                                                <ShoppingCart size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-foreground font-black text-sm tracking-tight">{po.poNumber}</p>
                                                                <p className="text-muted-foreground/40 text-[9px] font-black uppercase">{new Date(po.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="px-8 py-5 hidden sm:table-cell text-foreground font-bold text-xs">{po.vendorName}</td>
                                                <td className="px-8 py-5 hidden md:table-cell">
                                                    <div className="flex items-center gap-2">
                                                        <Package size={12} className="text-muted-foreground/30" />
                                                        <span className="text-muted-foreground/60 text-[11px] font-bold">
                                                            {po.items?.length ?? 0} Inventory Items
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <p className="text-foreground font-black text-sm">₹{po.totalAmount?.toLocaleString('en-IN')}</p>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xs transition-colors",
                                                        cfg.bg, cfg.text, cfg.border
                                                    )}>
                                                        <StatusIcon size={12} className={cn("shrink-0", cfg.text)} />
                                                        {po.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-all">
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                        <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all">
                                                            <ChevronRight size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                                {pos.length === 0 && (
                                    <tr><td colSpan={6} className="px-8 py-20 text-center text-muted-foreground/30 font-black uppercase tracking-widest italic">No procurement manifests active</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 border-t border-border/20 bg-muted/10">
                        <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                            Source Page {page} of {pagination.pages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-bold text-[10px] uppercase tracking-widest"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.pages}
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-bold text-[10px] uppercase tracking-widest"
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
