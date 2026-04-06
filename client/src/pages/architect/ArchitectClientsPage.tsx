import { motion } from 'framer-motion';
import { Phone, Mail, FileText, MapPin } from 'lucide-react';
import { useArchitectClients } from '../../hooks/useApi';
import { Skeleton } from '@/components/ui/skeleton';


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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">My Clients</h1>
        <p className="text-muted-foreground text-base mt-2">
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
              className="bg-card/70 backdrop-blur-md border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-full"
            >
              <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Avatar + Name */}
              <div className="flex items-center gap-4 mb-5 relative z-10">
                <div className="size-12 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 transition-transform group-hover:scale-110 duration-300 text-white font-black text-xl">
                  {(c.name || c.firmName || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-xl text-foreground font-black tracking-tight truncate leading-tight">{c.name || '—'}</p>
                  {c.firmName && c.firmName !== c.name && (
                    <p className="text-muted-foreground text-sm font-medium truncate mt-0.5 opacity-80">{c.firmName}</p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border/60 mb-5 relative z-10" />

              {/* Contact */}
              <div className="flex-1 space-y-3 mb-6 relative z-10">
                {c.phone && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors group/item">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                      <Phone size={14} className="shrink-0 text-muted-foreground group-hover/item:text-primary transition-colors" />
                    </div>
                    <span className="truncate">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors group/item">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                      <Mail size={14} className="shrink-0 text-muted-foreground group-hover/item:text-primary transition-colors" />
                    </div>
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address?.city && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium hover:text-foreground transition-colors group/item">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                      <MapPin size={14} className="shrink-0 text-muted-foreground group-hover/item:text-primary transition-colors" />
                    </div>
                    <span className="truncate">{c.address.city}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 relative z-10">
                <div className="flex-1 rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-4 group-hover:bg-primary/10 transition-all shadow-sm">
                  <div className="size-12 rounded-xl bg-background flex items-center justify-center shadow-md text-primary">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest leading-none mb-1">Total Quotations</p>
                    <p className="text-3xl font-black text-foreground tracking-tighter leading-none">{c.quotationCount}</p>
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
