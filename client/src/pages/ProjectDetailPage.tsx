import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, FolderOpen, Building2, MapPin, Calendar, Users,
    ChevronRight, AlertTriangle, CheckCircle2, Clock,
    Loader2, Package, Activity, Phone, Mail
} from 'lucide-react';
import { useProject, useUpdateProjectStatus, useUpdateWhatsApp } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    planning: { label: 'Planning', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    active: { label: 'Active', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    on_hold: { label: 'On Hold', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    completed: { label: 'Completed', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    cancelled: { label: 'Cancelled', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const JC_STATUS: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'text-blue-500' },
    in_store: { label: 'In Store', color: 'text-yellow-600' },
    in_production: { label: 'Production', color: 'text-primary' },
    qc_pending: { label: 'QC Pending', color: 'text-purple-500' },
    qc_passed: { label: 'QC Passed', color: 'text-emerald-500' },
    dispatched: { label: 'Dispatched', color: 'text-cyan-500' },
    delivered: { label: 'Delivered', color: 'text-green-500' },
    cancelled: { label: 'Cancelled', color: 'text-rose-500' },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useProject(id!);
    const project: any = (raw as any)?.data;

    const statusMut = useUpdateProjectStatus(id!);
    const whatsappMut = useUpdateWhatsApp(id!);

    const [statusChanging, setStatusChanging] = useState(false);
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'super_admin';
    const userId = user?.id;

    const handleStatusChange = async (newStatus: string) => {
        setStatusChanging(true);
        await statusMut.mutateAsync({ status: newStatus });
        setStatusChanging(false);
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted/20 rounded-3xl animate-pulse border border-border/20" />
                ))}
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-8 text-center">
                <FolderOpen size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-bold">Project not found</p>
                <Link to="/projects" className="text-primary text-sm font-bold mt-4 inline-block">← Back to Projects</Link>
            </div>
        );
    }

    // Access check for staff
    const isAssigned = project.assignedStaff?.some((u: any) => (u._id || u.id || u) === userId) ||
                       (project.salesPerson?.id || project.salesPerson?._id || project.salesPerson) === userId;

    if (!isSuperAdmin && !isAssigned) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle size={48} className="mx-auto text-rose-500/20 mb-4" />
                <h2 className="text-xl font-black text-foreground mb-2">Access Denied</h2>
                <p className="text-muted-foreground/60 max-w-sm mx-auto">You are not assigned to this project and do not have permission to view its details.</p>
                <Link to="/projects" className="text-primary text-sm font-black mt-6 inline-block uppercase tracking-widest hover:underline">← Return to Portfolio</Link>
            </div>
        );
    }

    const cfg = STATUS_CFG[project.status] || STATUS_CFG.planning;
    const jobCards: any[] = project.jobCards || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/projects')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
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

                {/* Status Changer */}
                <div className="flex items-center gap-3">
                    <Select value={project.status} onValueChange={handleStatusChange} disabled={statusChanging}>
                        <SelectTrigger className="h-10 w-44 rounded-xl font-bold text-xs border-border/60">
                            {statusChanging ? <Loader2 size={13} className="animate-spin mr-2" /> : null}
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {Object.entries(STATUS_CFG).map(([v, c]) => (
                                <SelectItem key={v} value={v} className={cn('font-bold text-xs', c.color)}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Client */}
                <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/20">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                            <Building2 size={12} /> Client Details
                        </div>
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
                        {project.architect && (
                            <div className="border-t border-border/30 pt-3 mt-3 space-y-1">
                                <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 font-bold">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded-md">Ar.</span> {project.architect}
                                </div>
                                {project.architectContact && (
                                    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/50 font-medium pl-8">
                                        <Phone size={10} className="opacity-50" /> {project.architectContact}
                                    </div>
                                )}
                            </div>
                        )}
                        {project.projectDesigner && (
                            <div className="border-t border-border/30 pt-3 mt-3 space-y-1">
                                <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 font-bold">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground/40 bg-muted px-1.5 py-0.5 rounded-md">Designer</span> {project.projectDesigner}
                                </div>
                                {project.projectDesignerContact && (
                                    <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground/50 font-medium pl-10">
                                        <Phone size={10} className="opacity-50" /> {project.projectDesignerContact}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Site Address */}
                <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
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
                <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
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
                    </div>
                </div>
            </div>

            {/* WhatsApp Group Linking */}
            <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#25D366] pb-2 border-b border-[#25D366]/20">
                    <Activity size={12} /> WhatsApp Project Group
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Group ID</Label>
                        <Input
                            placeholder="e.g. 12036302[...]@g.us"
                            defaultValue={project.whatsappGroupId}
                            id="whatsappGroupId"
                            className="rounded-xl h-10 font-mono text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Invite Link</Label>
                        <Input
                            placeholder="https://chat.whatsapp.com/..."
                            defaultValue={project.whatsappInviteLink}
                            id="whatsappInviteLink"
                            className="rounded-xl h-10 text-xs"
                        />
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="rounded-xl font-black text-xs gap-2 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10"
                    disabled={whatsappMut.isPending}
                    onClick={async () => {
                        const groupId = (document.getElementById('whatsappGroupId') as HTMLInputElement).value;
                        const link = (document.getElementById('whatsappInviteLink') as HTMLInputElement).value;
                        await whatsappMut.mutateAsync({ whatsappGroupId: groupId, whatsappInviteLink: link });
                    }}
                >
                    {whatsappMut.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                    Save WhatsApp Group
                </Button>
            </div>

            {/* Assigned Staff */}
            {project.assignedStaff?.length > 0 && (
                <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4 pb-3 border-b border-border/20">
                        <Users size={12} /> Assigned Staff ({project.assignedStaff.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {project.assignedStaff.map((s: any) => (
                            <div key={s._id} className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-xl border border-border/30">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center uppercase">
                                    {s.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">{s.name}</p>
                                    <p className="text-[10px] text-muted-foreground/50 capitalize">{s.department || s.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Job Cards */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary"><Package size={14} /></div>
                    <p className="font-black text-sm uppercase tracking-wider text-foreground">Job Cards ({jobCards.length})</p>
                </div>

                {jobCards.length === 0 ? (
                    <div className="py-16 text-center bg-muted/10 border-2 border-dashed border-border/30 rounded-3xl">
                        <Package size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-muted-foreground/50 font-bold text-sm">No job cards yet</p>
                        <p className="text-muted-foreground/30 text-xs font-medium mt-1">Job cards are created automatically when a quotation is approved.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {jobCards.map((jc: any, i: number) => {
                            const jcCfg = JC_STATUS[jc.status] || { label: jc.status, color: 'text-muted-foreground' };
                            const overdue = jc.expectedDelivery && new Date(jc.expectedDelivery) < new Date() && !['delivered', 'closed', 'cancelled'].includes(jc.status);
                            return (
                                <motion.div
                                    key={jc._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <Link
                                        to={`/jobcards/${jc._id}`}
                                        className="group flex items-center justify-between p-4 bg-white dark:bg-card/20 border border-border/30 rounded-2xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <Activity size={16} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-black text-sm text-foreground">{jc.title}</p>
                                                    {overdue && <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-0.5"><AlertTriangle size={9} /> Overdue</span>}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/40 font-bold">{jc.jobCardNumber} · Expected {fmtDate(jc.expectedDelivery)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn('text-[10px] font-black uppercase tracking-wider', jcCfg.color)}>{jcCfg.label}</span>
                                            <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Activity Log */}
            {project.activityLog?.length > 0 && (
                <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2 pb-3 border-b border-border/20">
                        <Clock size={12} /> Recent Activity
                    </p>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {[...project.activityLog].reverse().slice(0, 10).map((log: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 text-xs">
                                <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 size={10} className="text-muted-foreground/40" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground/80">{log.action?.replace(/_/g, ' ')}</p>
                                    <p className="text-muted-foreground/40">{fmtDate(log.timestamp)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
