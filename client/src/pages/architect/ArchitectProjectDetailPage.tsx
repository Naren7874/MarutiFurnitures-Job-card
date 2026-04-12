import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Building2, MapPin, Calendar, ChevronRight, Activity, Phone, Mail, Package } from 'lucide-react';
import { useArchitectProjectById } from '../../hooks/useApi';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { HoldBanner } from '@/components/ui/HoldBanner';

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
            {project.status === 'on_hold' && (
                <HoldBanner 
                    entityType="Project" 
                    reason={project.onHoldReason} 
                    onAt={project.onHoldAt} 
                />
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/architect/projects')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">{project.projectName}</h1>
                            <span className={cn('px-4 py-1.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest border shadow-sm', cfg.bg, cfg.color, cfg.border)}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/60 text-sm md:text-base font-bold mt-2 tracking-tight">{project.projectNumber}</p>
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Client */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <Building2 size={14} /> Client Details
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-black text-lg md:text-xl text-foreground tracking-tight leading-tight">{project.clientId?.name || '—'}</h3>
                        {project.clientId?.firmName && <p className="text-sm font-bold text-muted-foreground/70 tracking-tight italic">{project.clientId.firmName}</p>}
                    </div>

                    <div className="space-y-2.5 pt-1">
                        {project.clientId?.phone && (
                            <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-bold">
                                <Phone size={14} className="text-primary/60" /> {project.clientId.phone}
                            </div>
                        )}
                        {project.clientId?.email && (
                            <div className="flex items-center gap-2.5 text-sm text-muted-foreground font-bold truncate">
                                <Mail size={14} className="text-primary/60" /> {project.clientId.email}
                            </div>
                        )}
                    </div>
                </div>

                {/* Site Address */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 pb-2 border-b border-border/20">
                        <MapPin size={14} /> Site Address
                    </div>
                    <div className="text-sm text-muted-foreground/80 font-semibold space-y-2">
                        {project.siteAddress?.location && <p className="font-black text-foreground text-base md:text-lg tracking-tight">{project.siteAddress.location}</p>}
                        {project.siteAddress?.line1 && <p>{project.siteAddress.line1}</p>}
                        {project.siteAddress?.line2 && <p>{project.siteAddress.line2}</p>}
                        {project.siteAddress?.pincode && <p className="pt-2 font-bold text-muted-foreground">Pincode: <span className="font-black text-foreground">{project.siteAddress.pincode}</span></p>}
                        {!project.siteAddress?.location && !project.siteAddress?.line1 && (
                            <p className="italic opacity-50 font-medium">No site address provided</p>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 pb-2 border-b border-border/20">
                        <Calendar size={14} /> Timeline
                    </div>
                    <div className="grid grid-cols-1 gap-3.5 pt-1">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground/70 font-bold">Created On</span>
                            <span className="font-black text-foreground tracking-tight">{fmtDate(project.createdAt)}</span>
                        </div>
                        {project.expectedDelivery && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground/70 font-bold">Expected Delivery</span>
                                <span className="font-black text-primary tracking-tight">{fmtDate(project.expectedDelivery)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground/70 font-bold">Project Priority</span>
                            <span className={cn('font-black uppercase tracking-widest text-[11px] px-2.5 py-0.5 rounded-full border', project.priority === 'urgent' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : project.priority === 'high' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20')}>{project.priority || 'Medium'}</span>
                        </div>
                        {project.quotationId && (
                            <div className="flex justify-between items-center text-sm pt-4 border-t border-border/30">
                                <span className="text-muted-foreground/70 font-bold">Linked Quotation</span>
                                <Link to={`/architect/quotations/${project.quotationId._id || project.quotationId}`} className="font-black text-primary hover:underline flex items-center gap-1.5 group">
                                    <span className="tracking-tight">{project.quotationId.quotationNumber || 'View Detail'}</span>
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Related Job Cards */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm"><Package size={18} /></div>
                    <p className="font-black text-lg md:text-xl tracking-tight text-foreground">Related Job Cards <span className="text-muted-foreground/40 ml-1">({jobCards.length})</span></p>
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
                                        className="group block p-6 bg-card border border-border rounded-22xl hover:border-primary/40 hover:shadow-xl transition-all shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            {jc.items?.[0]?.photo ? (
                                                <div className="size-12 rounded-2xl overflow-hidden border border-primary/20 shadow-sm relative group-hover:ring-2 ring-primary/50 transition-all">
                                                    <img src={jc.items[0].photo} alt={jc.jobCardNumber} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                    <Activity size={22} />
                                                </div>
                                            )}
                                            <Badge variant="outline" className={cn('text-xs font-black border rounded-full px-3 py-1', jcCfg.color)}>{jcCfg.label}</Badge>
                                        </div>
                                        <h4 className="font-black text-base md:text-lg text-foreground line-clamp-1 tracking-tight uppercase leading-tight">{jc.jobCardNumber}</h4>
                                        <p className="text-xs text-muted-foreground/60 font-black uppercase mt-1.5 tracking-tight truncate">
                                            {jc.items?.[0]?.category && !jc.title?.startsWith(jc.items[0].category)
                                                ? `${jc.items[0].category} - ${jc.title}`
                                                : jc.title}
                                        </p>
                                        <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground font-bold flex items-center gap-2">
                                                <Package size={14} className="text-primary/50" /> {jc.items?.length || 0} items
                                            </p>
                                            <ChevronRight size={18} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
