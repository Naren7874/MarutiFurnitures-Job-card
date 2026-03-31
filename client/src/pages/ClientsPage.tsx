import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Phone, Building2, XCircle, Users, MapPin, ArrowUpRight, Edit2, Trash2, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
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
    const [sortBy, setSortBy] = useState('createdAt:desc');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const { hasPermission } = useAuthStore();
    const navigate = useNavigate();
    const canCreate = hasPermission('client.create');
    const canEdit   = hasPermission('client.edit');
    const canDelete = hasPermission('client.delete');

    const { data: raw, isLoading } = useClients({ 
        search, 
        clientType: clientType || undefined, 
        page, 
        limit: viewMode === 'table' ? 50 : 20,
        sortBy
    });
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
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">Clients</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            {pagination.total ?? 0} Clients Added
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex p-1 bg-card border border-border/60 rounded-2xl shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-2 rounded-xl transition-all",
                                viewMode === 'table' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <List size={20} />
                        </button>
                    </div>

                    {canCreate && (
                        <Link to="/clients/new">
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs tracking-[0.15em] h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                                <Plus size={18} strokeWidth={3} /> Add Client
                            </Button>
                        </Link>
                    )}
                </div>
            </motion.div>

            {/* Search & Filter Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
                <div className="md:col-span-3 relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by name, phone, company, or GST number"
                        disableTitleCase={true}
                        className="pl-12 bg-card border-border/80 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/40 shadow-sm backdrop-blur-md w-full"
                    />
                </div>
                
                <div className="md:col-span-1.5">
                    <Select value={clientType || 'all'} onValueChange={(v) => { setClientType(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="h-14! bg-card border-border/80 text-foreground rounded-2xl font-bold text-xs uppercase tracking-[0.15em] px-6 shadow-sm focus:ring-2 focus:ring-primary/10 transition-all">
                            <SelectValue placeholder="FILTER BY TYPE" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-border/50">
                            <SelectItem value="all" className="rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] py-3">All Client Types</SelectItem>
                            <SelectItem value="direct_client" className="rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] py-3">Direct Clients</SelectItem>
                            <SelectItem value="architect" className="rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] py-3">Architects</SelectItem>
                            <SelectItem value="project_designer" className="rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] py-3">Project Designers</SelectItem>
                            <SelectItem value="factory_manager" className="rounded-xl font-bold text-[10px] uppercase tracking-[0.15em] py-3">Factory Managers</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-1.5">
                    <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                        <SelectTrigger className="h-14! bg-card border-border/80 text-foreground rounded-2xl font-bold text-xs uppercase tracking-[0.15em] px-6 shadow-sm focus:ring-2 focus:ring-primary/10 transition-all">
                            <div className="flex items-center gap-2">
                                <ArrowUpDown size={14} className="text-primary" />
                                <SelectValue placeholder="SORT BY" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-border/50">
                            <SelectItem value="createdAt:desc" className="rounded-xl font-bold text-[12px] tracking-[0.15em] py-3">Newest First</SelectItem>
                            <SelectItem value="name:asc" className="rounded-xl font-bold text-[12px] tracking-[0.15em] py-3">Name (A-Z)</SelectItem>
                            <SelectItem value="name:desc" className="rounded-xl font-bold text-[12px] tracking-[0.15em] py-3">Name (Z-A)</SelectItem>
                            <SelectItem value="firmName:asc" className="rounded-xl font-bold text-[12px] tracking-[0.15em] py-3">Firm (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {(search || clientType) && (
                    <div className="md:col-span-6 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-[0.15em] ml-2">Active Filters:</span>
                        {clientType && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em]">{CLIENT_TYPE_LABELS[clientType]}</span>
                                <button onClick={() => setClientType('')} className="text-primary hover:text-primary/70">
                                    <XCircle size={12} />
                                </button>
                            </div>
                        )}
                        {search && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                                <span className="text-[9px] font-black uppercase text-primary tracking-[0.15em]">Search: {search}</span>
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
                <div className={cn(
                    viewMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                        : "space-y-4"
                )}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className={cn(
                            "bg-muted/40 animate-pulse border border-border/30",
                            viewMode === 'grid' ? "h-64 rounded-[32px]" : "h-16 rounded-2xl"
                        )} />
                    ))}
                </div>
            ) : viewMode === 'grid' ? (
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
                                <div 
                                    onClick={() => navigate(`/clients/${c._id}`)} 
                                    className="group block h-full cursor-pointer"
                                >
                                    <div className="bg-card border border-border/60 rounded-[32px] p-5 h-full flex flex-row items-center gap-5 transition-all hover:bg-card/80 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 relative overflow-hidden group">
                                        
                                        {/* Background Accent */}
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                        {/* Avatar Section */}
                                        <div className="shrink-0 relative z-10">
                                            <div className="w-16 h-16 rounded-[24px] bg-linear-to-br from-primary/10 to-indigo-500/10 text-primary flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                                                {c.name?.charAt(0) ?? '?'}
                                            </div>
                                        </div>

                                        {/* Info Section */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 relative z-10">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-foreground font-black tracking-tight text-[16px] group-hover:text-primary transition-colors truncate pr-8">
                                                    {c.name}
                                                </h3>
                                            </div>
                                            
                                            {c.firmName && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-bold -mt-0.5">
                                                    <Building2 size={11} className="shrink-0" />
                                                    <span className="truncate">{c.firmName}</span>
                                                </div>
                                            )}

                                            <div className="flex flex-row items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80">
                                                    <Phone size={10} className="text-blue-500" />
                                                    <span className="truncate">{c.phone || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/80">
                                                    <MapPin size={10} className="text-rose-500" />
                                                    <span className="truncate">{c.address?.city || 'Location is not added'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Icon (Floating) */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                                <ArrowUpRight size={14} strokeWidth={3} />
                                            </div>
                                        </div>

                                        {/* Quick Actions (Hover state) */}
                                        {(canEdit || canDelete) && (
                                            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
                                                {canEdit && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/clients/${c._id}/edit`); }}
                                                        className="size-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setDeleteId(c._id);
                                                        }}
                                                        className="size-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm"
                >
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Client Name</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Firm Name</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact</th>
                                {(canEdit || canDelete) && <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((c) => (
                                <tr 
                                    key={c._id} 
                                    onClick={() => navigate(`/clients/${c._id}`)}
                                    className="border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                {c.name?.charAt(0)}
                                            </div>
                                            <span className="text-foreground font-bold text-sm group-hover:text-primary transition-colors">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-muted-foreground text-sm font-medium">{c.firmName || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-foreground text-sm font-bold">{c.phone}</span>
                                            {c.email && <span className="text-muted-foreground text-[10px]">{c.email}</span>}
                                        </div>
                                    </td>
                                    {(canEdit || canDelete) && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit && (
                                                    <Link 
                                                        to={`/clients/${c._id}/edit`}
                                                        className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Edit2 size={16} />
                                                    </Link>
                                                )}
                                                {canDelete && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setDeleteId(c._id);
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
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
                            <Button className="bg-primary hover:bg-primary/90 font-black text-xs uppercase tracking-[0.15em] px-8 h-12 rounded-2xl">
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
                    className="flex items-center justify-between px-8 py-6 bg-card border border-border focus-within:border-primary/50 rounded-[32px] shadow-sm"
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
                            className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-[0.15em]"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.pages}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-10 px-6 rounded-xl border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all font-bold text-[10px] uppercase tracking-[0.15em]"
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
