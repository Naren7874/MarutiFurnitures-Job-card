import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Users, TrendingUp, Clock, CheckCircle2, AlertCircle, 
    ArrowRight, Search, Download,
    ChevronRight, Banknote, FileText, ExternalLink
} from 'lucide-react';
import { useArchitectPayouts, useQuotations, useUpdateCommissionPaid } from '../hooks/useApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// ── Components ────────────────────────────────────────────────────────────────

export default function ArchitectPayoutsPage() {
    const { data: raw, isLoading } = useArchitectPayouts();
    const payouts = (raw as any)?.data || [];
    
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
    const [selectedArchitect, setSelectedArchitect] = useState<any>(null);

    const filteredPayouts = payouts.filter((p: any) => {
        const matchesSearch = (p.architectName || '').toLowerCase().includes(search.toLowerCase()) ||
                              (p.architectFirm || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'all' || 
                              (filterStatus === 'pending' && p.pendingAmount > 0) ||
                              (filterStatus === 'paid' && p.pendingAmount === 0);
        return matchesSearch && matchesStatus;
    });

    const stats = payouts.reduce((acc: any, p: any) => {
        acc.total += p.totalCommission;
        acc.paid += p.paidAmount;
        acc.pending += p.pendingAmount;
        return acc;
    }, { total: 0, paid: 0, pending: 0 });

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-4">
                        <span className="p-3 rounded-2xl bg-primary/10 text-primary shadow-xl shadow-primary/10">
                            <Banknote size={28} strokeWidth={3} />
                        </span>
                        Architect Payouts
                    </h1>
                    <p className="text-muted-foreground font-medium mt-2 flex items-center gap-2">
                        <Users size={14} className="opacity-50" />
                        Manage and track commissions for {payouts.length} architects
                    </p>
                </motion.div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-11 px-5 rounded-2xl text-xs font-black gap-2 border-border/60">
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Outstanding Payout" 
                    value={fmt(stats.pending)} 
                    icon={Clock} 
                    color="text-amber-500" 
                    bg="bg-amber-500/10" 
                    trend="+12% from last month"
                />
                <StatCard 
                    label="Cleared Payouts" 
                    value={fmt(stats.paid)} 
                    icon={CheckCircle2} 
                    color="text-emerald-500" 
                    bg="bg-emerald-500/10"
                />
                <StatCard 
                    label="Total Accumulated" 
                    value={fmt(stats.total)} 
                    icon={TrendingUp} 
                    color="text-primary" 
                    bg="bg-primary/10"
                />
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-3xl border border-border/60 shadow-sm">
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40" size={18} />
                    <Input 
                        placeholder="Search by architect or firm name..." 
                        className="pl-12 h-12 bg-background/50 border-border/40 rounded-2xl focus-visible:ring-primary/20 transition-all text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/20 self-stretch md:self-auto">
                    {(['all', 'pending', 'paid'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cn(
                                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                filterStatus === s 
                                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                    : "text-muted-foreground/60 hover:text-foreground"
                            )}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/40">
                                {['Architect Details', 'Quots', 'Total Commission', 'Paid', 'Outstanding', 'Action'].map(h => (
                                    <th key={h} className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            <AnimatePresence mode="popLayout">
                                {filteredPayouts.map((p: any, idx: number) => (
                                    <motion.tr 
                                        key={p._id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => setSelectedArchitect(p)}
                                        className="group hover:bg-muted/20 transition-all duration-300 cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="font-black text-foreground text-[15px] group-hover:text-primary transition-colors">{p.architectName || 'Unknown Architect'}</p>
                                                {p.architectFirm && <p className="text-muted-foreground/60 text-[11px] font-bold mt-0.5">{p.architectFirm}</p>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold px-2 rounded-lg">
                                                {p.quotationCount}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-6 font-bold text-foreground/80">{fmt(p.totalCommission)}</td>
                                        <td className="px-8 py-6 font-bold text-emerald-500/80">{fmt(p.paidAmount)}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className={cn("font-black text-[16px]", p.pendingAmount > 0 ? "text-amber-500" : "text-emerald-500/40")}>
                                                    {p.pendingAmount > 0 ? fmt(p.pendingAmount) : 'Settled'}
                                                </span>
                                                {p.unpaidCount > 0 && (
                                                    <span className="text-[10px] font-medium text-muted-foreground/40 mt-0.5">
                                                        Across {p.unpaidCount} bill(s)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Button variant="ghost" className="size-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                                                <ChevronRight size={18} />
                                            </Button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
                {filteredPayouts.map((p: any, idx: number) => (
                    <motion.div 
                        key={p._id || idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => setSelectedArchitect(p)}
                        className="bg-card border border-border/60 rounded-3xl p-6 space-y-5 cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-black text-foreground text-lg">{p.architectName || 'Unknown Architect'}</p>
                                <p className="text-muted-foreground/60 text-xs font-bold">{p.architectFirm || 'Independent'}</p>
                            </div>
                            <Badge className="bg-primary/10 text-primary border-primary/20">{p.quotationCount} Quots</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">Total</p>
                                <p className="font-bold text-sm">{fmt(p.totalCommission)}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">Outstanding</p>
                                <p className={cn("font-black text-sm", p.pendingAmount > 0 ? "text-amber-500" : "text-emerald-500/40")}>
                                    {p.pendingAmount > 0 ? fmt(p.pendingAmount) : 'Settled'}
                                </p>
                            </div>
                        </div>

                        <Button className="w-full h-11 rounded-2xl gap-2 font-black text-xs">
                            Manage Payouts <ArrowRight size={14} />
                        </Button>
                    </motion.div>
                ))}
            </div>

            {/* Details Drawer */}
            <PayoutDetailsDrawer 
                architect={selectedArchitect} 
                open={!!selectedArchitect} 
                onClose={() => setSelectedArchitect(null)} 
            />

            {filteredPayouts.length === 0 && (
                <div className="py-24 text-center">
                    <div className="size-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                        <AlertCircle size={32} />
                    </div>
                    <p className="text-muted-foreground font-black text-xl">No payout records found</p>
                    <p className="text-muted-foreground/40 text-sm mt-2 font-medium">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}

function PayoutDetailsDrawer({ architect, open, onClose }: any) {
    const { data: qRaw, isLoading } = useQuotations(
        architect ? { 
            architectId: architect.architectId || '',
            architectName: architect.architectId ? '' : architect.architectName 
        } : {}
    );
    const quotations = (qRaw as any)?.data || [];

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-xl md:max-w-2xl bg-card border-l border-border/60 p-0 overflow-hidden flex flex-col">
                <SheetHeader className="p-8 pb-4 text-left">
                    <SheetTitle className="text-3xl font-black tracking-tight">{architect?.architectName || 'Unknown Architect'}</SheetTitle>
                    <SheetDescription className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                        {architect?.architectFirm || 'Independent Architect'} • {quotations.length} Quotations
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {quotations.map((q: any) => (
                                <QuotationPayoutRow key={q._id} quotation={q} />
                            ))}
                            {quotations.length === 0 && (
                                <div className="py-20 text-center opacity-30 italic font-medium text-foreground">
                                    No quotations found for this architect.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-8 bg-muted/20 border-t border-border/40">
                    <div className="flex justify-between items-center bg-background p-5 rounded-2xl border border-border/40 shadow-inner">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-tight">Total Outstanding</p>
                            <p className="text-2xl font-black text-amber-500 leading-tight">{fmt(architect?.pendingAmount)}</p>
                        </div>
                        <CheckCircle2 size={32} className="text-amber-500/20" />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function QuotationPayoutRow({ quotation }: { quotation: any }) {
    const markPaidMutation = useUpdateCommissionPaid(quotation._id);
    const [isPaid, setIsPaid] = useState(quotation.architectCommissionPaid);

    const handleToggle = async (val: boolean) => {
        setIsPaid(val);
        try {
            await markPaidMutation.mutateAsync(val);
        } catch {
            setIsPaid(!val); // Revert on failure
        }
    };

    return (
        <div className="group bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-2xl p-4 transition-all duration-300">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                        <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-foreground truncate">{quotation.quotationNumber}</span>
                            <Link to={`/quotations/${quotation._id}`} target="_blank" className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity">
                                <ExternalLink size={12} />
                            </Link>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground/60 truncate uppercase tracking-widest leading-tight">
                            {quotation.clientId?.name || 'Unknown Client'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right whitespace-nowrap">
                        <p className="text-xs font-black text-foreground">{fmt(quotation.architectCommissionAmount)}</p>
                        <p className={cn("text-[8px] font-bold uppercase tracking-wider", isPaid ? "text-emerald-500/60" : "text-amber-500/60")}>
                            {isPaid ? 'Paid' : 'Pending'}
                        </p>
                    </div>
                    <Switch 
                        checked={isPaid} 
                        onCheckedChange={handleToggle}
                        disabled={markPaidMutation.isPending}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, bg, trend }: any) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-card border border-border/60 rounded-[32px] p-7 space-y-4 shadow-sm relative overflow-hidden group"
        >
            <div className={cn("size-12 rounded-2xl flex items-center justify-center transition-all duration-500", bg, color)}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-muted-foreground/60 text-[11px] font-black uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className={cn("text-3xl font-black tracking-tighter leading-none", color)}>{value}</h3>
                </div>
            </div>
            {trend && (
                <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-2">
                    <TrendingUp size={12} /> {trend}
                </p>
            )}
            <div className="absolute -bottom-6 -right-6 size-24 bg-foreground/2 rounded-full blur-2xl group-hover:bg-primary/5 transition-colors duration-700" />
        </motion.div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="flex justify-between items-end">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-64 rounded-2xl" />
                    <Skeleton className="h-4 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-11 w-32 rounded-2xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-[32px]" />)}
            </div>
            <Skeleton className="h-16 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-[32px]" />
        </div>
    );
}
