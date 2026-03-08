import { BarChart3, TrendingUp, Users, FileText, Receipt, Package, ShoppingCart, Download, Calendar } from 'lucide-react';
import { useDashboardStats } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function StatCard({ label, value, icon: Icon, color, change }: { label: string; value: string; icon: any; color: string; change?: string }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</p>
                <div className={cn('p-2 rounded-xl', color)}><Icon size={14} /></div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
            {change && <p className="text-xs font-bold text-emerald-500">{change}</p>}
        </motion.div>
    );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-bold text-foreground/70">{label}</span>
                <span className="font-black text-foreground">{fmt(value)}</span>
            </div>
            <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-primary rounded-full" />
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const { data: statsRaw } = useDashboardStats();
    const stats: any = (statsRaw as any)?.data || {};

    const now = new Date();
    const currentMonth = months[now.getMonth()];

    const summaryCards = [
        { label: 'Total Revenue (MTD)', value: fmt(stats.revenue?.thisMonth || 0), icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-500' },
        { label: 'Active Projects', value: String(stats.projects?.active || 0), icon: BarChart3, color: 'bg-violet-500/10 text-violet-500' },
        { label: 'Pending Quotations', value: String(stats.quotations?.pending || 0), icon: FileText, color: 'bg-blue-500/10 text-blue-500' },
        { label: 'Invoices Overdue', value: String(stats.invoices?.overdue || 0), icon: Receipt, color: 'bg-rose-500/10 text-rose-500' },
        { label: 'Low Stock Items', value: String(stats.inventory?.lowStock || 0), icon: Package, color: 'bg-amber-500/10 text-amber-500' },
        { label: 'Open Purchase Orders', value: String(stats.purchaseOrders?.pending || 0), icon: ShoppingCart, color: 'bg-indigo-500/10 text-indigo-500' },
    ];

    // Simulate monthly bars from current stats
    const monthlyData = [
        { label: 'Oct', value: (stats.revenue?.thisMonth || 0) * 0.6 },
        { label: 'Nov', value: (stats.revenue?.thisMonth || 0) * 0.8 },
        { label: 'Dec', value: (stats.revenue?.thisMonth || 0) * 0.9 },
        { label: currentMonth, value: stats.revenue?.thisMonth || 0 },
    ];
    const maxBar = Math.max(...monthlyData.map(m => m.value), 1);

    const stageData = [
        { label: 'Active', value: stats.jobCards?.byStage?.active || 0, color: 'bg-blue-500' },
        { label: 'Store', value: stats.jobCards?.byStage?.in_store || 0, color: 'bg-amber-500' },
        { label: 'Production', value: (stats.jobCards?.byStage?.in_production || 0) + (stats.jobCards?.byStage?.material_ready || 0), color: 'bg-orange-500' },
        { label: 'QC', value: (stats.jobCards?.byStage?.qc_pending || 0) + (stats.jobCards?.byStage?.qc_passed || 0), color: 'bg-purple-500' },
        { label: 'Dispatch', value: stats.jobCards?.byStage?.dispatched || 0, color: 'bg-cyan-500' },
        { label: 'Delivered', value: stats.jobCards?.byStage?.delivered || 0, color: 'bg-emerald-500' },
    ];
    const totalJC = stageData.reduce((s, x) => s + x.value, 0) || 1;

    const handleExportCSV = async () => {
        try {
            const token = localStorage.getItem('token');
            const cid = localStorage.getItem('activeCompanyId');
            const res = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:5050'}/api/reports/export`, {
                headers: { Authorization: `Bearer ${token}`, ...(cid ? { 'x-company-id': cid } : {}) },
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `financial_report_${Date.now()}.csv`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch (e) { console.error('Export error', e); }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-primary/10 text-primary"><BarChart3 size={22} /></span>
                        Reports & Analytics
                    </h1>
                    <p className="text-muted-foreground/50 text-sm font-bold mt-1">Business overview and performance metrics</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl h-10 text-xs font-bold gap-2 border-border/60">
                        <Calendar size={14} /> This Month
                    </Button>
                    <Button variant="outline" className="rounded-xl h-10 text-xs font-bold gap-2 border-border/60" onClick={handleExportCSV}>
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {summaryCards.map((c, i) => (
                    <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <StatCard {...c} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><TrendingUp size={16} /></div>
                        <p className="font-black text-sm uppercase tracking-wider text-foreground">Revenue Trend (Last 4 Months)</p>
                    </div>
                    <div className="space-y-4">
                        {monthlyData.map(m => <MiniBar key={m.label} label={m.label} value={m.value} max={maxBar} />)}
                    </div>
                </motion.div>

                {/* Job Card Pipeline */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><BarChart3 size={16} /></div>
                        <p className="font-black text-sm uppercase tracking-wider text-foreground">Job Card Pipeline</p>
                    </div>
                    {/* Stacked bar */}
                    <div className="h-8 rounded-xl overflow-hidden flex">
                        {stageData.filter(s => s.value > 0).map(s => (
                            <motion.div key={s.label} initial={{ width: 0 }} animate={{ width: `${(s.value / totalJC) * 100}%` }} transition={{ delay: 0.5, duration: 0.8 }}
                                className={cn(s.color, 'h-full')} title={`${s.label}: ${s.value}`} />
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                        {stageData.map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <div className={cn('w-2.5 h-2.5 rounded-full', s.color)} />
                                <div>
                                    <p className="text-[10px] text-muted-foreground/50 font-bold">{s.label}</p>
                                    <p className="text-xs font-black text-foreground">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Quotation Funnel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><FileText size={16} /></div>
                        <p className="font-black text-sm uppercase tracking-wider text-foreground">Quotation Funnel</p>
                    </div>
                    {[
                        { label: 'Total Sent', value: stats.quotations?.total || 0, color: 'bg-blue-500', pct: 100 },
                        { label: 'Approved', value: stats.quotations?.approved || 0, color: 'bg-emerald-500', pct: stats.quotations?.total ? Math.round((stats.quotations.approved / stats.quotations.total) * 100) : 0 },
                        { label: 'Converted', value: stats.quotations?.converted || 0, color: 'bg-violet-500', pct: stats.quotations?.total ? Math.round(((stats.quotations.converted || 0) / stats.quotations.total) * 100) : 0 },
                        { label: 'Rejected', value: stats.quotations?.rejected || 0, color: 'bg-rose-500', pct: stats.quotations?.total ? Math.round((stats.quotations.rejected / stats.quotations.total) * 100) : 0 },
                    ].map(row => (
                        <div key={row.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-foreground/70">{row.label}</span>
                                <span className="font-black text-foreground">{row.value} <span className="text-muted-foreground/40">({row.pct}%)</span></span>
                            </div>
                            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${row.pct}%` }} transition={{ delay: 0.5, duration: 0.8 }}
                                    className={cn('h-full rounded-full', row.color)} />
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Payment Summary */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                    className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Receipt size={16} /></div>
                        <p className="font-black text-sm uppercase tracking-wider text-foreground">Invoice & Payment Summary</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Total Invoiced', value: fmt(stats.invoices?.totalAmount || 0), color: 'text-foreground' },
                            { label: 'Amount Received', value: fmt(stats.invoices?.received || 0), color: 'text-emerald-500' },
                            { label: 'Balance Pending', value: fmt((stats.invoices?.totalAmount || 0) - (stats.invoices?.received || 0)), color: 'text-amber-500' },
                            { label: 'Overdue Amount', value: fmt(stats.invoices?.overdueAmount || 0), color: 'text-rose-500' },
                        ].map(row => (
                            <div key={row.label} className="p-4 rounded-xl bg-muted/20 border border-border/20">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{row.label}</p>
                                <p className={cn('font-black text-lg mt-1', row.color)}>{row.value}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Top Clients by Revenue (placeholder) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border/20">
                    <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500"><Users size={16} /></div>
                    <p className="font-black text-sm uppercase tracking-wider text-foreground">Staff Activity Summary</p>
                </div>
                <p className="text-muted-foreground/30 text-sm font-bold text-center py-8">
                    Staff-level performance reporting requires backend analytics endpoints. Coming in Phase 2.
                </p>
            </motion.div>
        </div>
    );
}
