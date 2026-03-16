import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Phone, Building2, CheckCircle, XCircle, Users, MapPin, ArrowUpRight, Edit2, Trash2 } from 'lucide-react';
import { useClients, useDeleteClientPermanent } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';

const CLIENT_TYPE_LABELS: Record<string, string> = {
    direct_client: 'Direct Client',
    architect: 'Architect Firm Name',
    project_designer: 'Project Designer',
    factory_manager: 'Factory Manager'
};

export default function ClientsPage() {
    const [search, setSearch] = useState('');
    const [clientType, setClientType] = useState('');
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('client.create');

    const { data: raw, isLoading } = useClients({ search, clientType: clientType || undefined, page, limit: 20 });
    const resp: any = raw;
    const clients: any[] = resp?.data ?? [];
    const pagination: any = resp?.pagination ?? {};

    const deleteClientMutation = useDeleteClientPermanent();

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteClientMutation.mutateAsync(deleteId);
            toast.success('Client deleted successfully');
            setDeleteId(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete client');
        }
    };

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

            {/* Search & Filter Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
                <div className="md:col-span-3 relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by name, phone, firm name, or GSTIN..."
                        className="pl-12 bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/30 shadow-sm backdrop-blur-md w-full"
                    />
                </div>
                <div>
                    <Select value={clientType || 'all'} onValueChange={(v) => { setClientType(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="h-14! bg-white dark:bg-card/50 border-border dark:border-border/60 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm focus:ring-2 focus:ring-primary/10 transition-all">
                            <SelectValue placeholder="FILTER BY TYPE" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-border/50">
                            <SelectItem value="all" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors py-3">All Categories</SelectItem>
                            <SelectItem value="direct_client" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors py-3">Direct Clients</SelectItem>
                            <SelectItem value="architect" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors py-3">Architects</SelectItem>
                            <SelectItem value="project_designer" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors py-3">Project Designers</SelectItem>
                            <SelectItem value="factory_manager" className="rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors py-3">Factory Managers</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(search || clientType) && (
                    <div className="md:col-span-4 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest ml-2">Active Filters:</span>
                        {clientType && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="text-[9px] font-black uppercase text-primary tracking-widest">{CLIENT_TYPE_LABELS[clientType]}</span>
                                <button onClick={() => setClientType('')} className="text-primary hover:text-primary/70">
                                    <XCircle size={12} />
                                </button>
                            </div>
                        )}
                        {search && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="text-[9px] font-black uppercase text-primary tracking-widest">Search: {search}</span>
                                <button onClick={() => setSearch('')} className="text-primary hover:text-primary/70">
                                    <XCircle size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Content List */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-64 bg-muted/40 rounded-[32px] animate-pulse border border-border/30" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {clients.map((c: any, idx: number) => (
                            <motion.div
                                key={c._id}
                                layout
                                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Link to={`/clients/${c._id}`} className="group block h-full">
                                    <div className="bg-white dark:bg-card/20 border border-border dark:border-border/50 rounded-[32px] p-6 h-full flex flex-col transition-all hover:bg-card/80 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl group">
                                        
                                        {/* Background Accent */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* Quick Actions Overlay */}
                                        <div className="absolute top-4 right-4 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                            <Link 
                                                to={`/clients/${c._id}/edit`}
                                                className="size-10 rounded-xl bg-white/80 dark:bg-card/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setDeleteId(c._id);
                                                }}
                                                className="size-10 rounded-xl bg-white/80 dark:bg-card/50 border border-border flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Card Header: Avatar & Type */}
                                        <div className="flex items-start justify-between mb-6 pr-10">
                                            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary/10 to-indigo-500/10 text-primary flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform shrink-0">
                                                {c.name?.charAt(0) ?? '?'}
                                            </div>
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-xs transition-colors shrink-0",
                                                "bg-primary/5 text-primary/80 border-primary/20"
                                            )}>
                                                {CLIENT_TYPE_LABELS[c.clientType] ?? 'Direct Client'}
                                            </div>
                                        </div>

                                        {/* Client Identity */}
                                        <div className="mb-4 flex-1">
                                            <h3 className="text-foreground font-black tracking-tight text-[17px] mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {c.name}
                                            </h3>
                                            {c.firmName && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-semibold mb-3">
                                                    <Building2 size={12} className="shrink-0" />
                                                    <span className="truncate">{c.firmName}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact & Meta */}
                                        <div className="space-y-3 pt-4 border-t border-border/40">
                                            <div className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground/80">
                                                <div className="size-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                                    <Phone size={12} />
                                                </div>
                                                {c.phone || 'No phone'}
                                            </div>
                                            <div className="flex items-center gap-2.5 text-xs font-bold text-muted-foreground/80">
                                                <div className="size-6 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                                    <MapPin size={12} />
                                                </div>
                                                <span className="truncate">{c.city || 'Global'}</span>
                                            </div>

                                            {c.gstin && (
                                                <div className={cn(
                                                    "mt-4 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                                    c.gstVerified 
                                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                                                        : "bg-muted text-muted-foreground/50 border-border"
                                                )}>
                                                    {c.gstVerified ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                    {c.gstin}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Icon */}
                                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                                                <ArrowUpRight size={16} strokeWidth={3} />
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

            <ConfirmationDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Client?"
                description="This will permanently remove the client and all associated local data. This action cannot be undone."
                onConfirm={handleDelete}
                variant="destructive"
                confirmText="Permanently Delete"
                isPending={deleteClientMutation.isPending}
            />
        </div>
    );
}
