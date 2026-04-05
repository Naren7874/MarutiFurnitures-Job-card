import { BarChart3, TrendingUp, FileText, Receipt, Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDashboardStats } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

function StatCard({ label, value, icon: Icon, color, change, sub }: { label: string; value: string; icon: any; color: string; change?: number; sub?: string }) {
    const isPositive = (change || 0) >= 0;
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/60 rounded-[28px] p-6 space-y-4 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{label}</p>
                <div className={cn('p-2.5 rounded-2xl transition-transform group-hover:rotate-6', color)}><Icon size={16} strokeWidth={2.5} /></div>
            </div>
            <div>
                <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
                <div className="flex items-center gap-2 mt-1">
                    {change !== undefined && (
                        <span className={cn(
                            "flex items-center text-[10px] font-black px-2 py-0.5 rounded-full",
                            isPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}>
                            {isPositive ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
                            {Math.abs(change)}%
                        </span>
                    )}
                    {sub && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">{sub}</span>}
                </div>
            </div>
        </motion.div>
    );
}

function MiniBar({ label, value, max, color = "bg-primary" }: { label: string; value: number; max: number; color?: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
                <span className="font-black text-muted-foreground uppercase tracking-widest">{label}</span>
                <span className="font-black text-foreground">{fmt(value)}</span>
            </div>
            <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.1, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                    className={cn("h-full rounded-full shadow-[0_0_12px_rgba(var(--primary),0.3)]", color)} />
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const [trendMonths, setTrendMonths] = useState(6);
    const { data: statsRaw, isLoading } = useDashboardStats(trendMonths);
    const stats: any = (statsRaw as any)?.data || {};
    const { hasPermission } = useAuthStore();
    
    const canViewFinancial = hasPermission('reports.view_financial');
    const canViewProduction = hasPermission('reports.view_production');
    const canExport = hasPermission('reports.export');

    const summaryCards = [
        { 
            label: 'Total Revenue (MTD)', 
            value: fmt(stats.revenue?.totalInvoicedThisMonth || 0), 
            icon: TrendingUp, 
            color: 'bg-emerald-500/10 text-emerald-600',
            sub: 'Invoiced Sales'
        },
        { 
            label: 'Revenue Collected (MTD)', 
            value: fmt(stats.revenue?.thisMonth || 0), 
            icon: Receipt, 
            color: 'bg-blue-500/10 text-blue-600',
            sub: 'Cash Flow'
        },
        { 
            label: 'Active Projects', 
            value: String(stats.projects?.active || 0), 
            icon: BarChart3, 
            color: 'bg-violet-500/10 text-violet-600',
            change: stats.projects?.change,
            sub: 'In-Pipeline'
        },
        { 
            label: 'Sent Quotations', 
            value: String(stats.quotations?.pending || 0), 
            icon: FileText, 
            color: 'bg-amber-500/10 text-amber-600',
            change: stats.quotations?.change,
            sub: 'Pending Action'
        },
    ];

    const monthlyData = stats.trend || [];
    const maxBar = Math.max(...monthlyData.map((m: any) => m.totalInvoiced), 1);

    const stageData = [
        { label: 'Active', value: stats.jobCards?.byStage?.active || 0, color: 'bg-blue-500' },
        { label: 'Production', value: (stats.jobCards?.byStage?.in_production || 0), color: 'bg-primary' },
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
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-10">
            {/* Header Area */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black  text-foreground flex items-center gap-4">
                        <span className="p-3 rounded-2xl bg-primary/10 text-primary shadow-xl shadow-primary/10"><BarChart3 size={28} strokeWidth={3} /></span>
                        Reports & Analytics
                    </h1>
                    <p className="text-muted-foreground/60 text-[13px] font-black mt-3 uppercase tracking-[0.2em]">Operational Intelligence & Financial KPIs</p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={String(trendMonths)} onValueChange={(v) => setTrendMonths(Number(v))}>
                        <SelectTrigger className="w-[180px] h-12 rounded-2xl bg-card border-border/60 font-black text-[11px] uppercase tracking-widest shadow-sm">
                            <Calendar size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Trend Range" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-border/40">
                            <SelectItem value="3" className="font-black text-[10px] uppercase py-3">Last 3 Months</SelectItem>
                            <SelectItem value="4" className="font-black text-[10px] uppercase py-3">Last 4 Months</SelectItem>
                            <SelectItem value="6" className="font-black text-[10px] uppercase py-3">Last 6 Months</SelectItem>
                            <SelectItem value="12" className="font-black text-[10px] uppercase py-3">Full Year (12m)</SelectItem>
                        </SelectContent>
                    </Select>
                    {canExport && (
                        <Button variant="outline" className="rounded-2xl h-12 text-[11px] font-black uppercase tracking-widest gap-2.5 border-border/60 hover:bg-primary/5 hover:text-primary transition-all active:scale-95" onClick={handleExportCSV}>
                            <Download size={14} /> Export Dataset
                        </Button>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((c) => (
                    <StatCard key={c.label} {...c} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Trend Visualizer */}
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                    className="bg-card border border-border/60 rounded-[32px] p-8 space-y-8 shadow-2xl shadow-primary/5">
                    {canViewFinancial ? (
                        <>
                            <div className="flex items-center justify-between border-b border-border/20 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600"><TrendingUp size={18} strokeWidth={3} /></div>
                                    <div>
                                        <p className="font-black text-[13px] uppercase tracking-[0.15em] text-foreground">Revenue Trendline</p>
                                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Invoiced sales over time</p>
                                    </div>
                                </div>
                            </div>
                            {isLoading ? (
                                <div className="space-y-6 pt-4">
                                    {[...Array(4)].map((_, idx) => <div key={idx} className="h-8 bg-muted/20 rounded-full animate-pulse" />)}
                                </div>
                            ) : (
                                <div className="space-y-6 pt-4">
                                    {monthlyData.map((m: any) => (
                                        <MiniBar key={m.label} label={m.label} value={m.totalInvoiced} max={maxBar} />
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 filter grayscale">
                            <TrendingUp size={48} className="mb-4" />
                            <p className="font-black text-xs uppercase tracking-widest italic">Financial Insights Restricted</p>
                        </div>
                    )}
                </motion.div>

                {/* Operations Pipeline */}
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                    className="bg-card border border-border/60 rounded-[32px] p-8 space-y-8 shadow-2xl shadow-primary/5">
                    <div className="flex items-center justify-between border-b border-border/20 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary"><BarChart3 size={18} strokeWidth={3} /></div>
                            <div>
                                <p className="font-black text-[13px] uppercase tracking-[0.15em] text-foreground">Operations Pipeline</p>
                                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">Live Job Card distribution</p>
                            </div>
                        </div>
                    </div>
                    {canViewProduction ? (
                        <div className="space-y-8 pt-4">
                            <div className="h-10 rounded-2xl overflow-hidden flex shadow-inner bg-muted/10">
                                <AnimatePresence>
                                    {stageData.filter(s => s.value > 0).map(s => (
                                        <motion.div key={s.label} 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${(s.value / totalJC) * 100}%` }} 
                                            className={cn(s.color, 'h-full transition-colors')} 
                                            title={`${s.label}: ${s.value}`} />
                                    ))}
                                </AnimatePresence>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                {stageData.map(s => (
                                    <div key={s.label} className="flex items-center gap-3">
                                        <div className={cn('w-3 h-3 rounded-full', s.color)} />
                                        <div>
                                            <p className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{s.label}</p>
                                            <p className="text-xl font-black text-foreground tracking-tight">{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20 filter grayscale">
                            <BarChart3 size={48} className="mb-4" />
                            <p className="font-black text-xs uppercase tracking-widest italic">Operational Metrics Restricted</p>
                        </div>
                    )}
                </motion.div>

                {/* Performance Summaries */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-card border border-border/60 rounded-[32px] p-8 space-y-8 shadow-2xl lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Quotation Conversions */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border/20 pb-4">
                                <FileText className="text-blue-500" size={16} strokeWidth={3} />
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground">Quotation Conversion Funnel</h3>
                            </div>
                            <div className="space-y-5">
                                {[
                                    { label: 'Sent', value: stats.quotations?.total || 0, color: 'bg-blue-500', pct: 100 },
                                    { label: 'Approved', value: stats.quotations?.approved || 0, color: 'bg-emerald-500', pct: stats.quotations?.total ? Math.round((stats.quotations.approved / stats.quotations.total) * 100) : 0 },
                                    { label: 'Converted', value: stats.quotations?.converted || 0, color: 'bg-violet-500', pct: stats.quotations?.total ? Math.round(((stats.quotations.converted || 0) / stats.quotations.total) * 100) : 0 },
                                ].map(row => (
                                    <div key={row.label} className="space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{row.label}</span>
                                            <span className="font-black text-sm text-foreground">{row.value} <span className="text-[10px] text-muted-foreground/40">({row.pct}%)</span></span>
                                        </div>
                                        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${row.pct}%` }} transition={{ delay: 0.4, duration: 1 }}
                                                className={cn('h-full rounded-full', row.color)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Revenue & Collections */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 border-b border-border/20 pb-4">
                                <Receipt className="text-emerald-600" size={16} strokeWidth={3} />
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground">Financial Ledger Summary</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'Total Invoiced', value: fmt(stats.invoices?.totalAmount || 0), color: 'text-foreground' },
                                    { label: 'Payments Received', value: fmt(stats.invoices?.received || 0), color: 'text-emerald-600' },
                                    { label: 'Balance Outstanding', value: fmt((stats.invoices?.totalAmount || 0) - (stats.invoices?.received || 0)), color: 'text-rose-600' },
                                    { label: 'Overdue Amount', value: fmt(stats.invoices?.overdueAmount || 0), color: 'text-rose-500' },
                                ].map(v => (
                                    <div key={v.label} className="p-4 rounded-2xl bg-muted/10 border border-border/10 hover:bg-muted/20 transition-colors">
                                        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest truncate">{v.label}</p>
                                        <p className={cn("text-lg font-black tracking-tight mt-1", v.color)}>{v.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
