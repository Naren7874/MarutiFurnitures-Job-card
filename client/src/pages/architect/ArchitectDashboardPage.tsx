import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Building2, ArrowRight, Factory, AlertTriangle, Coins } from 'lucide-react';
import { useArchitectDashboard } from '../../hooks/useApi';
import { useAuthStore } from '../../stores/authStore';
import { cn, getGreeting } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-foreground text-4xl font-black tracking-tight">{value}</p>
          {suffix && <span className="text-sm font-bold text-muted-foreground italic opacity-60 group-hover:opacity-100 transition-opacity">{suffix}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ArchitectDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useArchitectDashboard();
  const user = useAuthStore(s => s.user);
  const isProjectDesigner = user?.role === 'project_designer' || user?.role?.toLowerCase() === 'project designer';
  const summary = (data as any)?.data?.summary;
  const recentQuotations: any[] = (data as any)?.data?.recentQuotations || [];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 md:p-8 space-y-8 w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-4">
        <Avatar className="size-14 border-2 border-primary/20 shadow-2xl">
          <AvatarImage src={user?.profilePhoto} />
          <AvatarFallback className="text-lg font-black bg-primary/10 text-primary">{user?.name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-foreground text-4xl font-black tracking-tight leading-none mb-1.5">
            {getGreeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-muted-foreground font-medium">
              Here’s your dashboard overview
            </p>
          </div>
        </div>
      </motion.div>

      {/* Unified KPI Grid */}
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5', isProjectDesigner ? 'xl:grid-cols-5' : 'xl:grid-cols-6')}>
        {/* Earnings — hidden for project_designer */}
        {!isProjectDesigner && (
          <KpiCard
            label="Ooroo Earned"
            value={summary?.earnedOoroo || 0}
            icon={Coins}
            suffix="ooroo"
            className="bg-linear-to-br from-primary/10 via-background to-background border-primary/20"
            iconClassName="bg-primary text-primary-foreground"
            delay={0}
          />
        )}

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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Recent Quotations</h2>
          <Link
            to="/architect/quotations"
            className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
          >
            View All <ArrowRight size={14} />
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
                  onClick={() => navigate(`/architect/quotations/${q._id}`)}
                  className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/50">
                      <FileText size={18} className="text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-base font-bold truncate leading-tight">{q.quotationNumber}</p>
                      <p className="text-muted-foreground text-sm truncate mt-0.5">{q.projectName} · {q.clientId?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 flex-wrap">
                    {q.companyId?.name && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
                        <Building2 size={13} />
                        <span className="truncate max-w-[120px]">{q.companyId.name}</span>
                      </div>
                    )}
                    <Badge className={cn('text-xs font-bold border rounded-full px-3 py-1', st.color)}>{st.label}</Badge>
                    {q.createdAt && (
                      <p className="text-xs font-medium text-muted-foreground/60 hidden md:block">{format(new Date(q.createdAt), 'dd MMM yy')}</p>
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
