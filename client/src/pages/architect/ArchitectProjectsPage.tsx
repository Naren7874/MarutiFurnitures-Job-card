import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderKanban, Search, Building2, Filter, ChevronRight, Calendar } from 'lucide-react';
import { useArchitectProjects } from '../../hooks/useApi';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: 'Active',    color: 'bg-blue-500/15 text-blue-500 border-blue-500/20' },
  completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/15 text-red-500 border-red-500/20' },
  on_hold:   { label: 'On Hold',   color: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/20' },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

function RowSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Skeleton className="size-9 rounded-lg shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

export default function ArchitectProjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  const params = { search: search || undefined, status: status !== 'all' ? status : undefined, page, limit: 20 };
  const { data, isLoading } = useArchitectProjects(params);

  const projects: any[] = (data as any)?.data || [];
  const pagination = (data as any)?.pagination;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">My Projects</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tracking all your projects across different companies.
          {pagination && <span className="ml-2 text-primary font-bold">({pagination.total} total)</span>}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by project name or number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-card border-border h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-card border border-border rounded-xl">
          <Filter size={14} className="text-muted-foreground ml-2" />
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                status === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground/40 font-bold italic">
            No projects found.
          </div>
        ) : (
          projects.map((p: any, i: number) => {
            const st = STATUS_CONFIG[p.status] || { label: p.status, color: 'bg-muted text-muted-foreground' };
            return (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={() => navigate(`/architect/projects/${p._id}`)}
                className="bg-card border border-border rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 border border-border">
                    <FolderKanban size={16} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground text-sm font-bold truncate">{p.projectName}</p>
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">{p.projectNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-muted-foreground/60 text-xs truncate">{p.clientId?.name || '—'}</p>
                      {p.companyId?.name && (
                        <>
                          <span className="text-muted-foreground/30 text-xs">·</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                            <Building2 size={10} />
                            <span className="truncate max-w-[120px]">{p.companyId.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={cn('text-[10px] font-bold border rounded-full px-2.5 py-0.5', st.color)}>{st.label}</Badge>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar size={10} />
                      {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy') : '—'}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0 hidden sm:block" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(prev => prev - 1)}
            className="px-4 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground disabled:opacity-40 hover:bg-muted transition"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground font-medium">
            {page} / {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(prev => prev + 1)}
            className="px-4 py-1.5 rounded-lg border border-border text-sm font-bold text-muted-foreground disabled:opacity-40 hover:bg-muted transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
