import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Building2, MapPin, Calendar, ChevronRight, Activity, Phone, Mail, Package } from 'lucide-react';
import { useArchitectProjectById } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    planning: { label: 'Planning', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    active: { label: 'Active', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    on_hold: { label: 'On Hold', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    completed: { label: 'Completed', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    cancelled: { label: 'Cancelled', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const JC_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'text-yellow-500' },
    production: { label: 'Production', color: 'text-blue-500' },
    qc: { label: 'QC', color: 'text-purple-500' },
    dispatch: { label: 'Dispatch', color: 'text-orange-500' },
    completed: { label: 'Completed', color: 'text-emerald-500' },
    cancelled: { label: 'Cancelled', color: 'text-rose-500' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ArchitectProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useArchitectProjectById(id!);
    const project: any = (raw as any)?.data;

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-60 w-full rounded-2xl" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-8 text-center">
                <FolderOpen size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-bold">Project not found</p>
                <Link to="/architect/projects" className="text-primary text-sm font-bold mt-4 inline-block">← Back to Projects</Link>
            </div>
        );
    }

    const cfg = STATUS_CFG[project.status] || STATUS_CFG.planning;
    const jobCards: any[] = project.jobCards || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/architect/projects')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">{project.projectName}</h1>
                            <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', cfg.bg, cfg.color, cfg.border)}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/50 text-xs font-bold mt-1">{project.projectNumber}</p>
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Client */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        <Building2 size={12} /> Client Details
                    </div>
                    <div>
                        <h3 className="font-black text-[15px] text-foreground tracking-tight">{project.clientId?.name || '—'}</h3>
                        {project.clientId?.firmName && <p className="text-[11px] font-bold text-muted-foreground/60 tracking-wide mt-0.5">{project.clientId.firmName}</p>}
                    </div>

                    <div className="space-y-2 pt-1">
                        {project.clientId?.phone && (
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 font-bold">
                                <Phone size={13} className="text-blue-500/60" /> {project.clientId.phone}
                            </div>
                        )}
                        {project.clientId?.email && (
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 font-bold truncate">
                                <Mail size={13} className="text-violet-500/60" /> {project.clientId.email}
                            </div>
                        )}
                    </div>
                </div>

                {/* Site Address */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pb-2 border-b border-border/20">
                        <MapPin size={12} /> Site Address
                    </div>
                    <div className="text-xs text-muted-foreground/70 font-semibold space-y-1.5">
                        {project.siteAddress?.location && <p className="font-black text-foreground text-[13px]">{project.siteAddress.location}</p>}
                        {project.siteAddress?.line1 && <p>{project.siteAddress.line1}</p>}
                        {project.siteAddress?.line2 && <p>{project.siteAddress.line2}</p>}
                        {project.siteAddress?.pincode && <p className="pt-1">Pincode: <span className="font-bold text-foreground">{project.siteAddress.pincode}</span></p>}
                        {!project.siteAddress?.location && !project.siteAddress?.line1 && (
                            <p className="italic opacity-50 font-normal">No site address provided</p>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pb-2 border-b border-border/20">
                        <Calendar size={12} /> Timeline
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground/50 font-bold">Created</span>
                            <span className="font-bold text-foreground">{fmtDate(project.createdAt)}</span>
                        </div>
                        {project.expectedDelivery && (
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground/50 font-bold">Expected</span>
                                <span className="font-bold text-foreground">{fmtDate(project.expectedDelivery)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground/50 font-bold">Priority</span>
                            <span className={cn('font-black capitalize', project.priority === 'urgent' ? 'text-rose-500' : project.priority === 'high' ? 'text-amber-500' : 'text-foreground')}>{project.priority || 'Medium'}</span>
                        </div>
                        {project.quotationId && (
                            <div className="flex justify-between text-xs pt-2 border-t border-border/20">
                                <span className="text-muted-foreground/50 font-bold">Quotation</span>
                                <Link to={`/architect/quotations/${project.quotationId._id || project.quotationId}`} className="font-black text-primary hover:underline">
                                    {project.quotationId.quotationNumber || 'View Quotation'}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Related Job Cards */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><Package size={14} /></div>
                    <p className="font-black text-sm uppercase tracking-wider text-foreground">Job Cards ({jobCards.length})</p>
                </div>

                {jobCards.length === 0 ? (
                    <div className="py-16 text-center bg-muted/10 border-2 border-dashed border-border/30 rounded-3xl">
                        <Package size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground/50 font-bold text-sm">No job cards yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobCards.map((jc: any, i: number) => {
                            const jcCfg = JC_STATUS[jc.status] || { label: jc.status, color: 'text-muted-foreground' };
                            return (
                                <motion.div
                                    key={jc._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Link
                                        to={`/architect/jobcards/${jc._id}`}
                                        className="group block p-5 bg-card border border-border/60 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Activity size={18} />
                                            </div>
                                            <Badge variant="outline" className={cn('text-[10px] font-bold border rounded-full px-2 py-0.5', jcCfg.color)}>{jcCfg.label}</Badge>
                                        </div>
                                        <h4 className="font-black text-sm text-foreground line-clamp-1">{jc.title}</h4>
                                        <p className="text-[10px] text-muted-foreground/50 font-bold mt-1">{jc.jobCardNumber}</p>
                                        <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between">
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Package size={10} /> {jc.items?.length || 0} items
                                            </p>
                                            <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>


        </motion.div>
    );
}
