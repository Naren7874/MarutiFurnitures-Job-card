import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Building2, ArrowRight, Factory, AlertTriangle, Sparkles } from 'lucide-react';
import { useArchitectDashboard } from '../../hooks/useApi';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Removed fmt helper as it's no longer used

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Pending', color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20' },
  sent:      { label: 'Sent', color: 'bg-blue-500/15 text-blue-500 border-blue-500/20' },
  approved:  { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
  rejected:  { label: 'Rejected', color: 'bg-red-500/15 text-red-500 border-red-500/20' },
  converted: { label: 'Converted', color: 'bg-primary/15 text-primary border-primary/20' },
  revised:   { label: 'Revised', color: 'bg-purple-500/15 text-purple-500 border-purple-500/20' },
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-8 w-full">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
        ))}
      </div>
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  className?: string;
  iconClassName?: string;
  delay?: number;
  suffix?: string;
}

function KpiCard({ label, value, icon: Icon, className, iconClassName, delay = 0, suffix }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "relative overflow-hidden bg-card border border-border rounded-3xl p-6 flex flex-col gap-5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all group",
        className
      )}
    >
      <div className={cn('size-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-300', iconClassName)}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-80">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-foreground text-3xl font-black tracking-tight">{value}</p>
          {suffix && <span className="text-sm font-bold text-muted-foreground italic opacity-60 group-hover:opacity-100 transition-opacity">{suffix}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ArchitectDashboardPage() {
  const { data, isLoading } = useArchitectDashboard();
  const summary = (data as any)?.data?.summary;
  const recentQuotations: any[] = (data as any)?.data?.recentQuotations || [];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 md:p-8 space-y-8 w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">Architect Dashboard</h1>
      </motion.div>

      {/* Unified KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {/* Earnings First */}
        <KpiCard
          label="Total Earned"
          value={summary?.earnedOoroo || 0}
          icon={Sparkles}
          suffix="ooroo"
          className="bg-linear-to-br from-primary/10 via-background to-background border-primary/20"
          iconClassName="bg-primary text-primary-foreground"
          delay={0}
        />

        {/* Operational Status */}
        <KpiCard
          label="Ongoing Projects"
          value={summary?.ongoingProjects || 0}
          icon={Building2}
          iconClassName="bg-blue-500/10 text-blue-500"
          delay={0.1}
        />
        <KpiCard
          label="Active Job Cards"
          value={summary?.activeJobCards || 0}
          icon={Factory}
          iconClassName="bg-emerald-500/10 text-emerald-500"
          delay={0.15}
        />
        <KpiCard
          label="Completed Projects"
          value={summary?.completedProjects || 0}
          icon={CheckCircle}
          iconClassName="bg-violet-500/10 text-violet-500"
          delay={0.2}
        />
        <KpiCard
          label="Pending Quotations"
          value={summary?.pendingQuotations || 0}
          icon={Clock}
          iconClassName="bg-yellow-500/10 text-yellow-500"
          delay={0.25}
        />
        <KpiCard
          label="Rejected Quotations"
          value={summary?.rejectedQuotations || 0}
          icon={AlertTriangle}
          iconClassName="bg-red-500/10 text-red-500"
          delay={0.3}
        />
      </div>

      {/* Recent Quotations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Recent Quotations</h2>
          <Link
            to="/architect/quotations"
            className="text-primary text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
          >
            View All <ArrowRight size={12} />
          </Link>
        </div>

        {recentQuotations.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/40 font-bold italic">
            No quotations associated with you yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentQuotations.map((q: any, i: number) => {
              const st = STATUS_CONFIG[q.status] || { label: q.status, color: 'bg-muted text-muted-foreground' };
              return (
                <motion.div
                  key={q._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                  className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <FileText size={15} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-bold truncate">{q.quotationNumber}</p>
                      <p className="text-muted-foreground text-xs truncate">{q.projectName} · {q.clientId?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {q.companyId?.name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 size={11} />
                        <span className="truncate max-w-[100px]">{q.companyId.name}</span>
                      </div>
                    )}
                    <Badge className={cn('text-[10px] font-bold border rounded-full px-2.5 py-0.5', st.color)}>{st.label}</Badge>
                    {q.createdAt && (
                      <p className="text-[10px] text-muted-foreground hidden md:block">{format(new Date(q.createdAt), 'dd MMM yy')}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
