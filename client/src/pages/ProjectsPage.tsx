import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, Calendar, Building2, ChevronRight, MoreHorizontal, FilterX, LayoutGrid, Clock, CheckCircle2, X } from 'lucide-react';
import { useProjects } from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { apiGet, apiPost } from '../lib/axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    planning: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/20', icon: Clock },
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', icon: LayoutGrid },
    on_hold: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', icon: Clock },
    completed: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20', icon: CheckCircle2 },
    cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', icon: FolderOpen },
};

const StatCard = ({ icon: Icon, label, value, colorClass, delay = 0 }: any) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay }}
        whileHover={{ y: -4 }}
        className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all"
    >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner", colorClass)}>
            <Icon size={18} strokeWidth={2.5} />
        </div>
        <div>
            <p className="text-muted-foreground/50 text-[11px] font-black uppercase tracking-[0.15em] mb-1">{label}</p>
            <p className="text-foreground text-2xl font-black tracking-tighter leading-tight">{value}</p>
        </div>
    </motion.div>
);

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [modalQuotations, setModalQuotations] = useState<any[]>([]);
    const [selectedQ, setSelectedQ] = useState<any>(null);
    const [priority, setPriority] = useState('medium');
    const [expectedDelivery, setExpectedDelivery] = useState('');
    const [creating, setCreating] = useState(false);
    const { hasPermission } = useAuthStore();
    const canCreate = hasPermission('project.create');

    const openModal = async () => {
        try {
            const res: any = await apiGet('/quotations', { status: 'approved', limit: 50 });
            setModalQuotations(res?.data || []);
        } catch { setModalQuotations([]); }
        setSelectedQ(null); setPriority('medium'); setExpectedDelivery(''); setShowModal(true);
    };

    const handleCreate = async () => {
        if (!selectedQ) return;
        setCreating(true);
        try {
            const res: any = await apiPost('/projects', {
                quotationId: selectedQ._id,
                priority,
                expectedDelivery: expectedDelivery || undefined,
            });
            const projId = res?.data?._id || res?._id;
            setShowModal(false);
            if (projId) navigate(`/projects/${projId}`);
            else window.location.reload();
        } catch (e: any) {
            alert(e?.response?.data?.message || 'Failed to create project');
        } finally { setCreating(false); }
    };

    const { data: raw, isLoading } = useProjects({ search, status, page, limit: 12 });
    const { user } = useAuthStore();
    const userId = user?.id;
    const isSuperAdmin = user?.role === 'super_admin';

    const resp: any = raw;
    const rawProjects: any[] = resp?.data ?? [];
    
    // Filter projects if not super_admin
    const projects = isSuperAdmin 
        ? rawProjects 
        : rawProjects.filter(p => 
            p.assignedStaff?.some((u: any) => (u._id || u.id || u) === userId) ||
            (p.salesPerson?.id || p.salesPerson?._id || p.salesPerson) === userId
        );

    const pagination: any = resp?.pagination ?? {};

    const stats = {
        total: pagination.total ?? 0,
        active: projects.filter(p => p.status === 'active').length,
        planning: projects.filter(p => p.status === 'planning').length,
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
                    <h1 className="text-4xl font-black tracking-tighter text-foreground mb-3 leading-none">Project Portfolio</h1>
                    <div className="flex items-center gap-3.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                        <p className="text-muted-foreground/60 text-[13px] font-black uppercase tracking-[0.15em]">
                            Enterprise Asset Management
                        </p>
                    </div>
                </div>
                {canCreate && (
                    <Button onClick={openModal} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <Plus size={18} strokeWidth={3} /> Initiate Project
                    </Button>
                )}
            </motion.div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={FolderOpen}
                    label="Active Projects"
                    value={stats.active}
                    colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    delay={0.1}
                />
                <StatCard
                    icon={LayoutGrid}
                    label="Pipeline Total"
                    value={stats.total}
                    colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    delay={0.2}
                />
                <StatCard
                    icon={Clock}
                    label="In Planning"
                    value={stats.planning}
                    colorClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    delay={0.3}
                />
                <StatCard
                    icon={Building2}
                    label="Client Stakeholders"
                    value={new Set(projects.map(p => p.clientId?._id)).size}
                    colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                    delay={0.4}
                />
            </div>

            {/* Filters Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
            >
                <div className="relative flex-1 min-w-[300px] group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Filter by Project Name, ID or External Reference..."
                        className="pl-12 bg-card border-border/80 text-foreground h-12 rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all font-medium placeholder:text-muted-foreground/40 shadow-sm backdrop-blur-md"
                    />
                </div>
                <Select value={status || 'all'} onValueChange={(v: string) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
                    <SelectTrigger className="h-12 bg-card border-border/80 text-foreground rounded-2xl font-bold text-xs uppercase tracking-widest px-6 shadow-sm min-w-[200px] transition-all focus:ring-primary/10">
                        <SelectValue placeholder="Project Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl backdrop-blur-xl">
                        <SelectItem value="all" className="font-black text-[10px] uppercase tracking-widest py-3">All Phases</SelectItem>
                        <SelectItem value="planning" className="font-black text-[10px] uppercase tracking-widest py-3 text-indigo-500">Planning</SelectItem>
                        <SelectItem value="active" className="font-black text-[10px] uppercase tracking-widest py-3 text-emerald-500">Active Execution</SelectItem>
                        <SelectItem value="on_hold" className="font-black text-[10px] uppercase tracking-widest py-3 text-amber-500">On Hold</SelectItem>
                        <SelectItem value="completed" className="font-black text-[10px] uppercase tracking-widest py-3 text-slate-500">Archived</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
                    className="h-12 rounded-2xl text-muted-foreground hover:text-rose-500 font-black text-[11px] uppercase tracking-widest px-8 transition-colors"
                >
                    <FilterX size={16} className="mr-2.5" /> Reset
                </Button>
            </motion.div>

            {/* Grid Area */}
            <div className="relative">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-64 bg-card/40 rounded-[32px] animate-pulse border border-border/30 backdrop-blur-md shadow-xs" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence mode="popLayout">
                            {projects.map((p, idx) => {
                                const cfg = STATUS_CONFIG[p.status?.toLowerCase()] || STATUS_CONFIG.planning;
                                const StatusIcon = cfg.icon;
                                return (
                                    <motion.div
                                        key={p._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: (idx % 8) * 0.05 }}
                                    >
                                        <Link
                                            to={`/projects/${p._id}`}
                                            className="group relative bg-card border border-border/60 rounded-[32px] p-6 h-full flex flex-col transition-all hover:bg-card/80 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                                    <FolderOpen size={20} strokeWidth={2.5} />
                                                </div>
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-xs transition-colors",
                                                    cfg.bg, cfg.text, cfg.border
                                                )}>
                                                    <StatusIcon size={12} className="shrink-0" />
                                                    {p.status?.replace(/_/g, ' ')}
                                                </span>
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="text-foreground font-black text-lg tracking-tight mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                                                    {p.projectName}
                                                </h3>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                    <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">{p.projectNumber}</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Building2 size={14} className="text-muted-foreground/30" />
                                                        <p className="text-muted-foreground/80 font-bold text-xs truncate">{p.clientId?.name}</p>
                                                    </div>
                                                    {p.expectedCompletion && (
                                                        <div className="flex items-center gap-2.5">
                                                            <Calendar size={14} className="text-rose-500/30" />
                                                            <p className="text-muted-foreground/60 text-[11px] font-bold">
                                                                {new Date(p.expectedCompletion).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-8 pt-5 border-t border-border/20 flex items-center justify-between">
                                                <div className="flex -space-x-2">
                                                    {[...Array(3)].map((_, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                                            <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/40" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                    <button className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/30 text-muted-foreground hover:text-primary transition-colors">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                                                        <ChevronRight size={14} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {projects.length === 0 && !isLoading && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center text-center bg-card/20 rounded-[48px] border-2 border-dashed border-border/50">
                                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                                    <FolderOpen size={40} className="text-muted-foreground/20" />
                                </div>
                                <h3 className="text-foreground text-xl font-black mb-2 tracking-tight">Zero Projects Detected</h3>
                                <p className="text-muted-foreground/60 max-w-xs mb-8 font-medium">No active or archived projects match your current filters.</p>
                                {canCreate && (
                                    <Link to="/projects/new">
                                        <Button className="bg-primary hover:bg-primary/90 font-black text-[10px] uppercase tracking-[0.2em] px-10 h-14 rounded-2xl shadow-xl shadow-primary/20">
                                            Establish First Project
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="flex items-center justify-between px-8 py-6 bg-card border border-border focus-within:border-primary/50 rounded-[32px] shadow-sm"
                >
                    <span className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.2em]">
                        Project Manifest Page {page} of {pagination.pages}
                    </span>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-11 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                        >
                            Back
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.pages}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="h-11 px-8 rounded-xl border-border/60 text-muted-foreground hover:text-primary transition-all font-black text-[11px] uppercase tracking-widest"
                        >
                            Ahead
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* ── Create Project Modal ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card border border-border/50 rounded-3xl w-full max-w-lg shadow-2xl p-8 space-y-6"
                            onClick={e => e.stopPropagation()}>

                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-foreground">Initiate New Project</h2>
                                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground transition-colors"><X size={18} /></button>
                            </div>

                            {/* Select Approved Quotation */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Select Approved Quotation *</label>
                                {modalQuotations.length === 0 ? (
                                    <p className="text-sm text-muted-foreground/50 bg-muted/20 rounded-xl p-4 text-center">
                                        No approved quotations available. Approve a quotation first.
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {modalQuotations.map((q: any) => (
                                            <button key={q._id}
                                                onClick={() => setSelectedQ(q)}
                                                className={cn("w-full text-left p-3 rounded-xl border transition-all",
                                                    selectedQ?._id === q._id
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                                        : "border-border/30 hover:border-primary/30 bg-muted/10"
                                                )}>
                                                <p className="font-bold text-sm text-foreground">{q.projectName || q.quotationNumber}</p>
                                                <p className="text-xs text-muted-foreground/50 mt-0.5">
                                                    {q.quotationNumber} · {q.clientId?.name || 'Client'} · ₹{(q.grandTotal || 0).toLocaleString('en-IN')}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Expected Delivery */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Expected Delivery</label>
                                <DatePicker 
                                    date={expectedDelivery ? parseISO(expectedDelivery) : undefined} 
                                    setDate={(date) => setExpectedDelivery(date ? format(date, 'yyyy-MM-dd') : '')}
                                    className="h-11 border-border/50 bg-muted/20 font-bold"
                                />
                            </div>

                            <Button
                                onClick={handleCreate}
                                disabled={!selectedQ || creating}
                                className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-primary/20"
                            >
                                {creating ? 'Creating...' : <><Plus size={16} /> Create Project</>}
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
