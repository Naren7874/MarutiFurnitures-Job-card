import { motion } from 'framer-motion';
import { Phone, Mail, FileText, IndianRupee, MapPin } from 'lucide-react';
import { useArchitectClients } from '../../hooks/useApi';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export default function ArchitectClientsPage() {
  const { data, isLoading } = useArchitectClients();
  const clients: any[] = (data as any)?.data || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">My Clients</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Clients associated with your quotations.
          {!isLoading && <span className="ml-2 text-primary font-bold">({clients.length} clients)</span>}
        </p>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : clients.length === 0 ? (
          <div className="col-span-full text-center py-20 text-muted-foreground/40 font-bold italic">
            No clients found.
          </div>
        ) : (
          clients.map((c: any, i: number) => (
            <motion.div
              key={c._id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 hover:shadow-md transition-all group"
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-lg">
                  {(c.name || c.firmName || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-bold truncate">{c.name || '—'}</p>
                  {c.firmName && c.firmName !== c.name && (
                    <p className="text-muted-foreground text-xs truncate">{c.firmName}</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border mb-4" />

              {/* Contact */}
              <div className="space-y-2 mb-4">
                {c.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone size={12} className="shrink-0" />
                    <span className="truncate">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address?.city && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{c.address.city}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 flex items-center gap-2">
                  <FileText size={12} className="text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Quotations</p>
                    <p className="text-sm font-black text-foreground">{c.quotationCount}</p>
                  </div>
                </div>
                <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2 flex items-center gap-2">
                  <IndianRupee size={12} className="text-emerald-500" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Commission</p>
                    <p className="text-sm font-black text-emerald-500">{fmt(c.totalCommission || 0)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
