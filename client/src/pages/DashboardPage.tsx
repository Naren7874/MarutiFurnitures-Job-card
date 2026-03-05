import { useAuthStore } from '../stores/authStore';
import { useJobCards } from '../hooks/useApi';
import { ClipboardList, Receipt, TrendingUp, AlertTriangle, ArrowRight, Layers, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { Button } from '@/components/ui/button';

// Brand Colors from Style Guide / Dummy Data
const BRAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    ENQUIRY: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
    SALES: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    ADMIN: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20' },
    DESIGN: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
    STORE: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
    PRODUCTION: { bg: 'bg-blue-600/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-600/20' },
    QC: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
    DISPATCH: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
    ACCOUNTS: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500/20' },
    CLOSED: { bg: 'bg-zinc-500/10', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-500/20' },
    active: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
    in_production: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/20' },
    qc_pending: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
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

        <div className="flex items-center justify-between">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", colorClass)}>
                <Icon size={22} strokeWidth={2.5} />
            </div>
            {sub && (
                <div className="bg-muted/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {sub}
                </div>
            )}
        </div>

        <div>
            <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <p className="text-foreground text-3xl font-black tracking-tight">{value ?? '0'}</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary/20" />
            </div>
        </div>
    </motion.div>
);

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { data: raw, isLoading } = useJobCards({ limit: 100 });
    const jobCards: any[] = (raw as any)?.data ?? [];

    const statusCount = jobCards.reduce<Record<string, number>>((acc, jc) => {
        const s = jc.status?.toUpperCase();
        acc[s] = (acc[s] || 0) + 1;
        // Also keep lowercase for some stats
        acc[jc.status] = (acc[jc.status] || 0) + 1;
        return acc;
    }, {});

    const overdue = jobCards.filter((jc) =>
        jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status?.toLowerCase())
    ).length;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-foreground text-4xl font-black tracking-tight leading-none mb-3">
                        {greeting}, {user?.name?.split(' ')[0]}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-muted-foreground font-medium">System operational. Here's your workspace overview for today.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-card border border-border dark:border-border px-4 py-2 rounded-2xl shadow-sm">
                    <Clock size={16} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={ClipboardList}
                    label="Active Jobs"
                    value={statusCount['active'] || statusCount['SALES'] || 0}
                    sub="Running"
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingUp}
                    label="In Production"
                    value={statusCount['PRODUCTION'] || statusCount['in_production'] || 0}
                    sub="Factory"
                    colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    delay={0.2}
                />
                <StatCard
                    icon={Layers}
                    label="QC Pending"
                    value={statusCount['QC'] || statusCount['qc_pending'] || 0}
                    sub="Quality"
                    colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    delay={0.3}
                />
                <StatCard
                    icon={AlertTriangle}
                    label="Overdue Alerts"
                    value={overdue}
                    sub="Critical"
                    colorClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    delay={0.4}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Recent Activity Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="xl:col-span-2 space-y-4"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-foreground font-black text-xs uppercase tracking-[0.2em]">Recent Job Cards</h2>
                            <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">Top 10</span>
                        </div>
                        <button className="text-muted-foreground hover:text-primary text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                            View All <ArrowRight size={12} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-20 bg-muted/40 rounded-3xl animate-pulse border border-border/50" />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/80 dark:bg-card/50 border border-border dark:border-border/60 rounded-[32px] overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/40 bg-muted/20">
                                            <th className="text-left px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Job Identity</th>
                                            <th className="text-left px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden sm:table-cell">Primary Client</th>
                                            <th className="text-left px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">Timeline</th>
                                            <th className="text-center px-6 py-5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Progress Stage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {jobCards.slice(0, 10).map((jc) => {
                                            const statusKey = jc.status?.toUpperCase();
                                            const cfg = BRAND_COLORS[statusKey] || BRAND_COLORS[jc.status] || BRAND_COLORS.ENQUIRY;

                                            return (
                                                <tr key={jc._id} className="group hover:bg-muted/30 transition-all cursor-pointer">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform", cfg.bg, cfg.text)}>
                                                                <ClipboardList size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-foreground font-black text-sm tracking-tight">{jc.jobCardNumber}</p>
                                                                <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-tighter truncate max-w-[150px]">{jc.title}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 hidden sm:table-cell">
                                                        <p className="text-foreground/80 font-bold text-xs">{jc.clientId?.name || 'N/A'}</p>
                                                        <p className="text-muted-foreground/40 text-[10px] font-semibold">{jc.clientId?.city || 'Corporate'}</p>
                                                    </td>
                                                    <td className="px-6 py-5 hidden md:table-cell">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={12} className="text-muted-foreground/40" />
                                                            <span className="text-muted-foreground/60 text-[11px] font-black">
                                                                {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xs transition-colors",
                                                            cfg.bg, cfg.text, cfg.border
                                                        )}>
                                                            <div className={cn("size-1.5 rounded-full animate-pulse", cfg.text.replace('text-', 'bg-'))} />
                                                            {jc.status?.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {jobCards.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Layers size={40} className="text-muted-foreground/20" />
                                                        <p className="text-muted-foreground/40 text-sm font-black uppercase tracking-widest italic">No Job Cards Found</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Right Sidebar - Quick Insights */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-8"
                >
                    <div className="bg-linear-to-br from-primary to-blue-700 rounded-[32px] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                            <div>
                                <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Target Completion</h3>
                                <p className="text-4xl font-black tracking-tighter mb-2">94.2%</p>
                                <p className="text-white/70 text-xs font-medium leading-relaxed">Your team is performing 12% better than last month. Keep it up!</p>
                            </div>
                            <Button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest h-12 rounded-2xl group/btn">
                                Download Report <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                        {/* Abstract background shapes */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    </div>

                    <div className="bg-white dark:bg-card border border-border/80 rounded-[32px] p-8 shadow-sm">
                        <h3 className="text-foreground font-black text-xs uppercase tracking-widest mb-6">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'New Job', icon: ClipboardList, color: 'text-blue-500' },
                                { label: 'Invoice', icon: Receipt, color: 'text-violet-500' },
                                { label: 'QC Check', icon: CheckCircle2, color: 'text-emerald-500' },
                                { label: 'Report', icon: TrendingUp, color: 'text-amber-500' },
                            ].map((action) => (
                                <button key={action.label} className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-all group">
                                    <action.icon className={cn("size-6 group-hover:scale-110 transition-transform", action.color)} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
