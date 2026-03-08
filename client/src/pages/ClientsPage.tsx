import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Phone, Building2, CheckCircle, XCircle, Users, Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { useClients } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ClientsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('client.create');

    const { data: raw, isLoading } = useClients({ search, page, limit: 20 });
    const resp: any = raw;
    const clients: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Clients Directory</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            {pagination.total ?? 0} Enrolled Entities
                        </p>
                    </div>
                </div>
                {canCreate && (
                    <Link to="/clients/new">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} strokeWidth={3} /> Add New Client
                        </Button>
                    </Link>
                )}
            </motion.div>

            {/* Search Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative group max-w-2xl"
            >
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by name, phone, firm name, or GSTIN..."
                    className="pl-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/30 shadow-sm backdrop-blur-md"
                />
            </motion.div>

            {/* Content List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 bg-muted/40 rounded-[32px] animate-pulse border border-border/30" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {clients.map((c: any, idx: number) => (
                            <motion.div
                                key={c._id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Link to={`/clients/${c._id}`} className="group block h-full">
                                    <div className="bg-white dark:bg-card/20 border border-border dark:border-border/50 rounded-[32px] p-6 h-full transition-all group-hover:bg-card/80 group-hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] group-hover:border-primary/20 group-hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl">

                                        <div className="absolute top-0 right-0 w-20 h-20 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                    {c.name?.charAt(0) ?? '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-foreground font-black tracking-tight text-lg truncate group-hover:text-primary transition-colors">
                                                        {c.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                                        {c.clientType === 'company' ? (
                                                            <Building2 size={12} className="text-primary/50" />
                                                        ) : (
                                                            <Users size={12} className="text-indigo-500/50" />
                                                        )}
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{c.clientType ?? 'Individual'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-muted px-2 py-2 rounded-xl text-muted-foreground/40 group-hover:bg-primary group-hover:text-white transition-all">
                                                <ArrowUpRight size={16} />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {c.firmName && (
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Building2 size={14} className="text-muted-foreground/30" />
                                                    <span className="text-muted-foreground/80 font-bold truncate">{c.firmName}</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-2 border-t border-border/30 pt-4">
                                                {c.phone && (
                                                    <div className="flex items-center gap-3 text-[11px] font-black tracking-wider text-muted-foreground/60 uppercase">
                                                        <Phone size={12} className="text-blue-500/40" />
                                                        {c.phone}
                                                    </div>
                                                )}
                                                {c.email && (
                                                    <div className="flex items-center gap-3 text-[11px] font-black tracking-wider text-muted-foreground/60 uppercase">
                                                        <Mail size={12} className="text-violet-500/40" />
                                                        {c.email}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                                    <MapPin size={12} className="text-rose-500/40" />
                                                    <span className="text-muted-foreground/40">{c.city || 'Not Set'}</span>
                                                </div>
                                                {c.gstin && (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors",
                                                        c.gstVerified ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/10" : "bg-muted text-muted-foreground/40 border-border"
                                                    )}>
                                                        {c.gstVerified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                        {c.gstin}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {!isLoading && clients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-card/20 rounded-[48px] border-2 border-dashed border-border/50">
                    <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                        <Users size={48} className="text-muted-foreground/20" />
                    </div>
                    <h3 className="text-foreground text-xl font-black mb-2">No clients found</h3>
                    <p className="text-muted-foreground max-w-xs mb-8">Try adjusting your search criteria or add a new client to the directory.</p>
                    {canCreate && (
                        <Link to="/clients/new">
                            <Button className="bg-primary hover:bg-primary/90 font-black text-xs uppercase tracking-widest px-8 h-12 rounded-2xl">
                                Register First Client
                            </Button>
                        </Link>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="flex items-center justify-between px-8 py-6 bg-white/80 dark:bg-card/30 border border-border dark:border-border/50 rounded-[32px]"
                >
                    <span className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">
                        Page {page} of {pagination.pages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.pages}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-widest"
                        >
                            Next
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
