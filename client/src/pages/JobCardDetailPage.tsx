import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, downloadPdf, apiUpload } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowLeft, AlertTriangle, Pencil, CheckCircle2, XCircle,
    Package, Loader2, Clock, CheckCheck,
    Truck, Shield, Wrench, TriangleAlert, User,
    CalendarCheck, MapPin, Camera, FileText, MessageSquare, Download,
    ShieldCheck, Zap, Maximize2, Fingerprint, Wind, History, Layers, Phone,
    Archive, ArchiveRestore, AlertCircle, Sparkles, PackageCheck, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useDispatchTeam } from '@/hooks/useApi';

import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { cn } from '../lib/utils';
import { ImagePreview } from '@/components/ui/image-preview';
import { DatePicker } from '@/components/ui/date-picker';

// ── Status config ─────────────────────────────────────────────────────────────

const JOB_STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_production: 'bg-primary/10 text-primary border-primary/20',
    qc_pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    qc_passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    qc_failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dispatched: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-muted text-muted-foreground border-border',
};

const SUB_STAGE_ORDER = [
    'cutting', 'edge_banding', 'cnc_drilling', 'assembly',
    'polishing', 'finishing', 'hardware_fitting', 'packing',
];

const SUB_STAGE_ICONS: Record<string, any> = {
    cutting: Wrench, edge_banding: Wind, cnc_drilling: Zap,
    assembly: Package, polishing: ShieldCheck, finishing: Sparkles,
    hardware_fitting: Wrench, packing: Archive,
};

// ── Helper components ─────────────────────────────────────────────────────────

// ── Helper components ─────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, color, children, overflowVisible }: any) {
    return (
        <div className={cn(
            "mt-4 bg-card dark:bg-card/20 border border-border/30 rounded-2xl shadow-sm",
            overflowVisible ? "relative z-20 overflow-visible" : "overflow-hidden"
        )}>
            <div className={cn('flex items-center gap-3 px-6 py-3.5 border-b border-border/20 rounded-t-2xl', color)}>
                <Icon size={14} />
                <h3 className="font-black text-[13px] uppercase tracking-wider">{title}</h3>
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobCardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();
    const { hasPermission, user } = useAuthStore();
    const isSuperAdmin = user?.role === 'super_admin';
    const isManager = ['admin', 'management', 'sales'].includes(user?.role || '');
    const userId = user?.id;

    const canEditJC = hasPermission('jobcard.edit');
    const canSeeProd = hasPermission('productionStage.view');
    const canSeeQC = hasPermission('qcStage.view');
    const canSeeDispatch = hasPermission('dispatchStage.view');
    // Edit permissions (full access vs read-only for the tab)
    const canEditProd = hasPermission('productionStage.edit');
    const canEditQC = hasPermission('qcStage.edit');
    const canEditDispatch = hasPermission('dispatchStage.edit');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const startProdMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/production/start`, {}),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['jobcard', id] });
            toast.success('Production started!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to start production');
        }
    });

    const { data: raw, isLoading } = useQuery({
        queryKey: ['jobcard', id],
        queryFn: () => apiGet(`/jobcards/${id}`),
        enabled: !!id,
    });
    const jc: any = (raw as any)?.data ?? {};

    const isOverdue = jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status);

    // Build visible tabs list based on permissions + role-based focus
    const ALL_TABS = [
        { value: 'overview', label: 'Overview', icon: FileText, show: true },
        { value: 'production', label: 'Factory Manager', icon: Wrench, show: canSeeProd },
        { value: 'qc', label: 'QC', icon: Shield, show: canSeeQC },
        { value: 'dispatch', label: 'Dispatch', icon: Truck, show: canSeeDispatch },
        { value: 'closure', label: 'Closure', icon: Archive, show: isSuperAdmin || isManager || user?.role === 'sales' || user?.role === 'accountant' },
    ];

    const visibleTabs = ALL_TABS.filter(t => {
        if (!t.show) return false;
        if (isSuperAdmin || isManager) return true;

        const role = user?.role?.toLowerCase();

        // Specific restrictions for technical roles
        if (role === 'production') {
            return ['overview', 'production'].includes(t.value);
        }
        if (role === 'qc') {
            return ['overview', 'production', 'qc'].includes(t.value);
        }
        if (role === 'dispatch') {
            return ['overview', 'dispatch'].includes(t.value);
        }
        if (role === 'accountant') {
            return ['overview', 'closure'].includes(t.value);
        }

        return true; 
    });

    if (isLoading) {
        return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />)}</div>;
    }

    if (!jc._id) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                    <Package size={40} className="text-muted-foreground/20" />
                </div>
                <h3 className="text-foreground text-xl font-black mb-2 tracking-tight">Job Card Isolated</h3>
                <p className="text-muted-foreground/60 max-w-xs mb-8 font-medium">The requested identifier does not correspond to an active operational unit.</p>
                <Link to="/jobcards">
                    <Button variant="outline" className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-10 h-12 shadow-sm">
                        ← Back to Pipeline
                    </Button>
                </Link>
            </div>
        );
    }


    // Access check for staff
    const isAssigned = jc.assignedTo && Object.values(jc.assignedTo).some((dept: any) => 
        Array.isArray(dept) && dept.some((u: any) => (u._id || u.id || u) === userId)
    );
    const isSalesperson = (jc.salesperson?.id || jc.salesperson?._id || jc.salesperson) === userId ||
                          (jc.projectId?.salesperson?.id || jc.projectId?.salesperson?._id || jc.projectId?.salesperson) === userId;

    if (!isSuperAdmin && !isManager && !isAssigned && !isSalesperson) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-24 h-24 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-8 border border-rose-500/20 shadow-xl shadow-rose-500/5">
                    <Shield size={48} className="text-rose-500/40" />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">Security Clearance Required</h2>
                <p className="text-muted-foreground/60 max-w-md mx-auto mb-10 font-medium italic leading-relaxed">
                    Your account is not currently assigned to this operational lifecycle stage or associated project. Please contact your department head for assignment.
                </p>
                <Link to="/jobcards">
                    <Button className="bg-primary hover:bg-primary/90 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] px-14 h-16 shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        ← Return to Pipeline
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-4">
            <Link to="/jobcards" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold">
                <ArrowLeft size={16} /> Back to Job Cards
            </Link>

            {/* Header Card */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card dark:bg-card/20 border border-border/30 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-primary text-xs font-black tracking-widest uppercase">{jc.jobCardNumber}</p>
                        {jc.items?.[0]?.category && (
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider mb-1">
                                {jc.items[0].category}
                            </div>
                        )}
                        <h1 className="text-foreground text-2xl font-black mt-1 tracking-tight">
                            {jc.items?.[0]?.category && !jc.title?.startsWith(jc.items[0].category) 
                                ? `${jc.items[0].category} - ${jc.title}` 
                                : jc.title}
                        </h1>
                        <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-foreground text-base font-black tracking-tight">{jc.clientId?.name}</p>
                            <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.15em]">{jc.projectId?.projectName || 'No Project'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3">
                            <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-widest', JOB_STATUS_BADGE[jc.status] ?? 'bg-muted text-muted-foreground border-border')}>
                                {jc.status?.replace(/_/g, ' ')}
                            </span>
                            {isOverdue && (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20 animate-pulse">
                                    <AlertTriangle size={12} /> OVERDUE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {jc.status === 'active' && canEditProd && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => startProdMut.mutate()}
                                    disabled={startProdMut.isPending}
                                    className="h-8 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm"
                                >
                                    {startProdMut.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Package size={14} className="mr-2" />}
                                    Start Production
                                </Button>
                            )}
                            {canEditJC && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="h-8 rounded-lg text-xs font-bold border-border/40 hover:bg-muted"
                                >
                                    <Pencil size={14} className="mr-2" /> Edit Details
                                </Button>
                            )}
                            <Button
                                variant="default"
                                size="sm"
                                disabled={isDownloading}
                                onClick={async () => {
                                    setIsDownloading(true);
                                    try {
                                        await downloadPdf(`/jobcards/${id}/pdf`, `${jc.jobCardNumber}.pdf`);
                                    } finally {
                                        setIsDownloading(false);
                                    }
                                }}
                                className="h-8 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer disabled:opacity-70"
                            >
                                {isDownloading ? (
                                    <Loader2 size={14} className="mr-2 animate-spin" />
                                ) : (
                                    <Download size={14} className="mr-2" />
                                )}
                                {isDownloading ? 'Generating...' : 'Download PDF'}
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-5 border-t border-border/40">
                    {[
                        { label: 'Priority', value: jc.priority },
                        { label: 'Expect Del.', value: jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
                        { label: 'Quotation', value: jc.quotationId?.quotationNumber ?? '—' },
                        { label: 'Created', value: jc.createdAt ? new Date(jc.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                            <p className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">{label}</p>
                            <p className="text-foreground text-sm font-bold capitalize">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Assigned Team */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-6 pt-5 border-t border-border/40">
                    {[
                        { label: 'Sales Executive', value: jc.salesperson?.name },
                        { label: 'Factory Manager', value: jc.assignedTo?.production?.map((u: any) => u.name).join(', ') },
                        { label: 'QC Officer', value: jc.assignedTo?.qc?.map((u: any) => u.name).join(', ') },
                        { label: 'Dispatch Team', value: jc.assignedTo?.dispatch?.map((u: any) => u.name).join(', ') },
                        { label: 'Accountant', value: jc.assignedTo?.accounts?.map((u: any) => u.name).join(', ') },
                    ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                            <p className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">{label}</p>
                            {value ? (
                                <p className="text-foreground text-sm font-bold truncate">{value}</p>
                            ) : (
                                <p className="text-muted-foreground/30 text-sm font-medium italic">Not Set</p>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Stage Tabs — filtered by role permissions */}
            <Tabs defaultValue="overview">
                <TabsList className="flex flex-wrap sm:flex-nowrap  py-4 rounded-3xl w-full gap-1.5 h-14 mb-2 shadow-sm">
                    {visibleTabs.map(t => (
                        <TabsTrigger key={t.value} value={t.value}
                            className="flex-1 h-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[12px] sm:text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-md transition-all active:scale-95 px-2 sm:px-4">
                            <t.icon size={16} className="shrink-0" />
                            <span className="hidden sm:inline">{t.label}</span>
                            <span className="sm:hidden">{t.label.slice(0, 3)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="mt-4"><OverviewTab jc={jc} /></TabsContent>
                {visibleTabs.some(t => t.value === 'production') && (
                    <TabsContent value="production" className="mt-4"><ProductionTab id={id!} jc={jc} qcClient={qc} canEdit={canEditProd} /></TabsContent>
                )}
                {visibleTabs.some(t => t.value === 'qc') && (
                    <TabsContent value="qc" className="mt-4"><QCTab id={id!} jc={jc} qcClient={qc} canEdit={canEditQC} /></TabsContent>
                )}
                {visibleTabs.some(t => t.value === 'dispatch') && (
                    <TabsContent value="dispatch" className="mt-4"><DispatchTab id={id!} jc={jc} qcClient={qc} canEdit={canEditDispatch} /></TabsContent>
                )}
                {visibleTabs.some(t => t.value === 'closure') && (
                    <TabsContent value="closure" className="mt-4"><ClosureTab id={id!} jc={jc} qcClient={qc} /></TabsContent>
                )}
            </Tabs>

            {/* Modals */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <EditJobCardModal
                        jc={jc}
                        onClose={() => setIsEditModalOpen(false)}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            qc.invalidateQueries({ queryKey: ['jobcard', id] });
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}


// ── Components ───────────────────────────────────────────────────────────────
function AssignedStaffList({ users, roleLabel, color = 'bg-primary' }: { users: any[], roleLabel: string, color?: string }) {
    if (!users || users.length === 0) return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">{roleLabel}</p>
            <p className="text-[10px] font-bold text-muted-foreground/30">Not assigned</p>
        </div>
    );
    return (
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">{roleLabel}</p>
            <div className="flex flex-wrap gap-2">
                {users.map((u: any) => (
                    <div key={u._id || u} className="flex items-center gap-2">
                        <div className={cn("w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white uppercase ring-2", color, color === 'bg-primary' ? 'ring-primary/10' : 'ring-current/10')} title={u.name}>
                            {u.name?.charAt(0) || <User size={12} />}
                        </div>
                        <span className="text-[11px] font-bold text-foreground">{u.name || 'Anonymous'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ jc }: any) {
    const item = jc.items?.[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-10">
            {/* ── Block 1: The REFINED HERO (12 Cols) ── */}
            <div className="md:col-span-12">
                <div className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/20 dark:border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-xl group min-h-[450px]">
                    {/* Visual Anchor (Left 35%) */}
                    <div className="lg:w-[35%] relative min-h-[400px] lg:h-auto overflow-hidden bg-muted/20 border-r border-border/10 flex flex-col">
                        <div className="flex-1 relative overflow-hidden group/main">
                            {item?.photo ? (
                                <div className="w-full h-full transition-transform duration-1000 group-hover/main:scale-110">
                                    <ImagePreview src={item.photo} alt="Item Preview" />
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/10">
                                    <Package size={100} strokeWidth={0.5} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3">Visual Pending</p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Content Section (Right 65%) */}
                    <div className="lg:w-[65%] p-10 lg:p-12 flex flex-col relative">
                        {/* Identity Pillar */}
                        <div className="mb-8">

                            <h1 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight mb-3 uppercase">
                                {item?.category || 'No Category'}
                            </h1>
                            <h2 className="text-lg lg:text-xl font-bold text-foreground/60 tracking-tight leading-snug mb-6">
                                {item?.description || jc.title}
                            </h2>
                            {item?.specifications?.notes && (
                                <div className="p-5 rounded-2xl bg-muted/10 border border-border/10 max-w-xl">
                                    <p className="text-muted-foreground/50 text-xs font-medium leading-relaxed italic">
                                        "{item.specifications.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Technical Grid (Integrated) */}
                        <div className="mt-auto pt-8 border-t border-border/10 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Specs Column */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Dimensions</p>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                        <Maximize2 size={14} className="text-blue-500/60" />
                                        <p className="text-sm font-black text-foreground/90 tracking-tight italic">{item?.specifications?.size || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Quantity</p>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                        <Package size={14} className="text-primary/60" />
                                        <p className="text-sm font-black text-foreground/90 uppercase tracking-tight">{item?.qty} {item?.unit || 'PCS'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Material</p>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                        <Fingerprint size={14} className="text-amber-500/60" />
                                        <p className="text-[11px] font-black text-foreground/70 uppercase tracking-tight leading-tight">{item?.specifications?.material || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Finish</p>
                                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                        <Wind size={14} className="text-emerald-500/60" />
                                        <p className="text-[11px] font-black text-foreground/70 uppercase tracking-tight leading-tight">{item?.specifications?.polish || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Client & Project Details Column */}
                            <div className="space-y-4">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Contact & Logistics</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                            <Phone size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-indigo-600/50 uppercase tracking-widest">Client Phone</p>
                                            <p className="text-xs font-black">{jc.clientId?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {jc.projectId?.whatsapp && (
                                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                <MessageSquare size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-emerald-600/50 uppercase tracking-widest">Project WhatsApp</p>
                                                <p className="text-xs font-black">{jc.projectId.whatsapp}</p>
                                            </div>
                                        </div>
                                    )}
                                    {jc.clientId?.address && (
                                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/10">
                                            <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground mt-0.5">
                                                <MapPin size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">Full Address</p>
                                                <p className="text-[10px] font-bold text-foreground/60 leading-relaxed italic">
                                                    {(typeof jc.clientId.address === 'object') 
                                                        ? [jc.clientId.address.houseNumber, jc.clientId.address.line1, jc.clientId.address.line2, jc.clientId.address.city, jc.clientId.address.pincode].filter(Boolean).join(', ')
                                                        : jc.clientId.address}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fabric Column */}
                            <div className="space-y-3">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] pl-0.5">Fabrication</p>
                                <div className="flex flex-wrap gap-2">
                                    {(item?.specifications?.fabrics?.length > 0) ? (
                                        item.specifications.fabrics.map((f: string, fi: number) => (
                                            <div key={fi} className="inline-flex items-center gap-2 bg-violet-500/5 border border-violet-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-foreground/60 uppercase">
                                                <span className="opacity-30">#{fi + 1}</span> {f}
                                            </div>
                                        ))
                                    ) : item?.specifications?.fabric ? (
                                        <div className="inline-flex items-center bg-violet-500/5 border border-violet-500/10 px-3 py-1.5 rounded-lg text-[10px] font-black text-foreground/60 uppercase">
                                            {item.specifications.fabric}
                                        </div>
                                    ) : (
                                        <p className="text-[9px] font-bold text-muted-foreground/20 italic uppercase">No fabrics</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Block 4: VISUAL ARCHIVE (12 Cols) ── */}
            {(item?.fabricPhoto || (item?.photos?.length > 0)) && (
                <div className="md:col-span-12">
                    <VisualArchiveBlock 
                        photos={item.photos} 
                        fabricPhoto={item.fabricPhoto} 
                    />
                </div>
            )}

            {/* ── Block 5: ACTIVITY LOG (Full) ── */}
            <div className="md:col-span-12">
                <div className="bg-card/20 backdrop-blur-md border border-border/10 rounded-[2.5rem] p-10 shadow-sm max-h-[400px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3.5 rounded-2xl bg-slate-500/5 text-slate-500/50 border border-slate-500/10"><Clock size={18} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-[0.15em] text-foreground">Activity Log</h4>
                            <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">History</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                        {jc.activityLog?.length > 0 ? (
                            jc.activityLog.slice().reverse().map((log: any, i: number) => (
                                <div key={log.timestamp || log._id || i} className="flex gap-4 p-4 bg-background/30 border border-border/5 rounded-2xl hover:border-primary/20 transition-all group/log">
                                    <div className="w-2 h-2 rounded-full bg-primary/30 mt-1.5" />
                                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <p className="text-xs font-black text-foreground/80 uppercase tracking-tight">{log.action?.replace(/_/g, ' ')}</p>
                                        <div className="flex items-center gap-3 opacity-30">
                                            <p className="text-[8px] font-black uppercase tracking-widest">{log.doneByName || 'System'}</p>
                                            <p className="text-[8px] font-black uppercase tracking-widest">
                                                {new Date(log.timestamp).toLocaleString('en-IN', {
                                                    day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Kolkata'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-16 flex flex-col items-center justify-center border border-dashed border-border/10 rounded-2xl">
                                <History size={32} className="text-muted-foreground/10" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Shared Bento Helpers ──────────────────────────────────────────────────────


function VisualArchiveBlock({ photos, fabricPhoto }: { photos: string[], fabricPhoto?: string }) {
    const allPhotos = [...(fabricPhoto ? [fabricPhoto] : []), ...(photos || [])];
    
    if (allPhotos.length === 0) return null;

    return (
        <div className="bg-card dark:bg-card/20 backdrop-blur-xl border border-border/10 rounded-[2.5rem] p-10 shadow-sm transition-all duration-500 hover:border-primary/30 group">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        <Camera size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-[0.15em] text-foreground">Visual Archive</h4>
                        <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">Reference Photos</p>
                    </div>
                </div>
                <div className="px-4 py-1.5 rounded-xl bg-muted/40 border border-border/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {allPhotos.length} {allPhotos.length === 1 ? 'Reference' : 'References'}
                </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
                {fabricPhoto && (
                    <div className="space-y-3">
                        <div className="aspect-square rounded-3xl overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in group/photo shadow-lg">
                            <ImagePreview src={fabricPhoto} alt="Fabric Reference" />
                        </div>
                        <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Fabric Ref</p>
                    </div>
                )}
                {photos?.map((url: string, i: number) => (
                    <div key={i} className="space-y-3">
                        <div className="aspect-square rounded-3xl overflow-hidden border border-border/20 bg-muted/20 hover:border-primary/50 transition-all cursor-zoom-in group/photo shadow-lg">
                            <ImagePreview src={url} alt={`Reference ${i+1}`} />
                        </div>
                        <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Ref #{i+1}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Read-only banner for tabs visible but not editable ───────────────────────
function ReadOnlyBanner() {
    return (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold">
            <Shield size={13} />
            View only — your role cannot edit this stage
        </div>
    );
}

// ── Production Tab ────────────────────────────────────────────────────────────
function ProductionTab({ id, jc, qcClient, canEdit }: any) {
    const { data: pRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'production'], queryFn: () => apiGet(`/jobcards/${id}/production`) });
    const { data: qRaw } = useQuery({ 
        queryKey: ['jobcard', id, 'qc'], 
        queryFn: () => apiGet(`/jobcards/${id}/qc`),
        enabled: !!id 
    });
    const stage: any = (pRaw as any)?.data ?? null;
    const qcStage: any = (qRaw as any)?.data ?? null;
    const [note, setNote] = useState('');
    const [noteWorker, setNoteWorker] = useState('');

    const isLocked = !['in_production', 'qc_failed', 'active'].includes(jc.status);
    const effectiveCanEdit = canEdit && !isLocked;

    const lastRework = qcStage?.reworkHistory?.[qcStage.reworkHistory.length - 1];
    const showReworkAlert = (jc.status === 'in_production' || jc.status === 'qc_failed') && qcStage?.verdict === 'fail';

    const resetProdMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/production/reset`),
        onSuccess: () => {
            qcClient.invalidateQueries({ queryKey: ['jobcard', id] });
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'production'] });
            toast.success('Production reset! Ready for rework.');
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reset production'),
    });

    const subStageMut = useMutation({
        mutationFn: ({ substage, status, workerName }: any) => apiPatch(`/jobcards/${id}/production/substage`, { name: substage, status, workerName }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'production'] }),
    });

    const noteMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/production/note`, { note, workerName: noteWorker }),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'production'] }); setNote(''); setNoteWorker(''); },
    });

    const doneMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/production/done`),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'production'] }); },
    });

    const shortageMut = useMutation({
        mutationFn: (reason: string) => apiPatch(`/jobcards/${id}/production/shortage`, { shortageNote: reason }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'production'] }),
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage) return <EmptyStage name="Production Stage" />;

    const substages: any[] = stage.substages || [];
    const doneCount = substages.filter(s => s.status === 'done').length;

    const getSubstageStatus = (name: string) => substages.find((s: any) => s.name === name) ?? { name, status: 'pending' };

    const cycleStatus = (name: string, current: string) => {
        const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'done' : 'pending';
        subStageMut.mutate({ substage: name, status: next, workerName: '' });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}
            {canEdit && isLocked && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold">
                    <History size={13} />
                    Stage Locked — Job Card is currently {jc.status?.replace(/_/g, ' ')}
                </div>
            )}
            {/* Rework Banner (Premium) */}
            {showReworkAlert && lastRework && (
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    className="p-6 rounded-[32px] bg-rose-500/10 border border-rose-500/20 shadow-xl mb-4 relative overflow-hidden group">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-rose-500/10 transition-colors duration-700" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500/60 leading-none mb-1.5">Attention Required</p>
                                <h3 className="text-xl font-black text-rose-600 tracking-tight">Rework Blueprint · Attempt #{qcStage.reworkCount || qcStage.reworkHistory?.length}</h3>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-rose-500/20 text-rose-600 border-rose-500/30 text-[10px] font-black py-1 px-4 rounded-full animate-pulse uppercase tracking-widest">
                            QC Failed
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl bg-white/40 dark:bg-black/20 border border-rose-500/20 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 mb-2 flex items-center gap-2">
                                    <MessageSquare size={12} /> Failure Reason
                                </p>
                                <p className="text-sm font-bold text-rose-700/80 dark:text-rose-400/80 leading-relaxed italic">
                                    "{lastRework.failReason || 'No specific reason provided'}"
                                </p>
                            </div>

                            {lastRework.defectSummary && (
                                <div className="p-5 rounded-2xl bg-white/40 dark:bg-black/20 border border-rose-500/20 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 mb-2 flex items-center gap-2">
                                        <Layers size={12} /> Defect Summary
                                    </p>
                                    <p className="text-xs font-bold text-rose-700/70 dark:text-rose-400/70 leading-relaxed">
                                        {lastRework.defectSummary}
                                    </p>
                                </div>
                            )}

                            {/* Failed Checklist Items */}
                            {qcStage.checklist?.some((item: any) => item.passed === false) && (
                                <div className="p-5 rounded-2xl bg-white/40 dark:bg-black/20 border border-rose-500/20 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 mb-3 flex items-center gap-2">
                                        <Shield size={12} /> Failed Parameters
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {qcStage.checklist.filter((item: any) => item.passed === false).map((item: any, i: number) => (
                                            <Badge key={i} variant="outline" className="bg-rose-500/5 text-rose-500 border-rose-500/20 text-[9px] font-black px-3 py-1 rounded-lg">
                                                {item.parameter}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Defect Gallery */}
                        {qcStage?.defectPhotos?.length > 0 && (
                            <div className="space-y-2">
                                <div className="p-5 rounded-2xl bg-white/40 dark:bg-black/20 border border-rose-500/20 shadow-sm h-full">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 mb-3 flex items-center gap-2">
                                        <Camera size={12} /> Visual Evidence
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {qcStage.defectPhotos.map((photo: any, i: number) => (
                                            <div key={i} className="group/photo relative aspect-square rounded-xl overflow-hidden border border-rose-500/20 bg-muted/20">
                                                <ImagePreview src={photo.url} alt={`Defect ${i + 1}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-rose-500/10 pt-6 relative z-10">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/30 pl-1">
                            <Clock size={12} /> Sent back {new Date(lastRework.sentBackAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric' })}
                        </div>

                        {/* Acknowledge & Start Rework Button */}
                        {canEdit && doneCount > 0 && (
                            <Button
                                onClick={() => resetProdMut.mutate()}
                                disabled={resetProdMut.isPending}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 h-11 rounded-xl shadow-lg shadow-rose-600/20 border-none uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                            >
                                {resetProdMut.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Zap size={14} className="mr-2 fill-current" />}
                                Acknowledge & Start Rework
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[24px] border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 shadow-xl shadow-primary/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                        <Wrench size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-primary/60 leading-none mb-1">Production Stage</h3>
                        <p className="font-bold text-lg text-foreground tracking-tight">Manufacturing Phase</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-2">Target Delivery</p>
                        <p className={cn('text-sm font-black', !jc.expectedDelivery ? 'text-muted-foreground/30 italic' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending assignment'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.production} roleLabel="Factory Manager" color="bg-primary" />
                    <div className="col-span-1 sm:col-span-2 sm:flex sm:justify-end">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-2 sm:text-right">Stage Status</p>
                            <span className={cn(
                                'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black border uppercase tracking-widest',
                                jc.status === 'in_production' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            )}>
                                <span className={cn("w-2 h-2 rounded-full bg-current", jc.status === 'in_production' && "animate-pulse")} />
                                {jc.status?.replace(/_/g, ' ') || 'pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <SectionCard title="Lifecycle Management" icon={History} color="text-primary">
            <div className="space-y-6">
                {/* Progress bar */}
                <div className="px-1">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/50">Overall Progress</p>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{Math.round((doneCount / SUB_STAGE_ORDER.length) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-muted/30 rounded-full overflow-hidden border border-border/5 p-px">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(doneCount / SUB_STAGE_ORDER.length) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-linear-to-r from-primary to-emerald-400 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
                    </div>
                </div>

                {/* Substage cards */}
                <div className="grid grid-cols-2 gap-3">
                    {SUB_STAGE_ORDER.map((name, i) => {
                        const s = getSubstageStatus(name);
                        const Icon = SUB_STAGE_ICONS[name] || Wrench;
                        return (
                            <button key={name} onClick={effectiveCanEdit ? () => cycleStatus(name, s.status) : undefined}
                                disabled={!effectiveCanEdit}
                                className={cn('group relative p-4 rounded-2xl border text-left transition-all duration-300', {
                                    'opacity-40 cursor-default grayscale': !effectiveCanEdit,
                                    'bg-card/50 border-border/30 hover:border-border/60 hover:bg-card/80': s.status === 'pending',
                                    'bg-primary/5 border-primary/40 shadow-[0_0_20px_rgba(var(--primary),0.1)]': s.status === 'in_progress',
                                    'bg-emerald-500/5 border-emerald-500/40': s.status === 'done',
                                })}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={cn('p-2 rounded-xl border transition-colors', {
                                        'bg-muted/40 border-border/20 text-muted-foreground/40': s.status === 'pending',
                                        'bg-primary/20 border-primary/30 text-primary animate-pulse': s.status === 'in_progress',
                                        'bg-emerald-500/20 border-emerald-500/30 text-emerald-500': s.status === 'done',
                                    })}>
                                        <Icon size={14} strokeWidth={2.5} />
                                    </div>
                                    <span className={cn('text-[10px] font-black uppercase tracking-tighter opacity-30', {
                                        'opacity-100 text-emerald-500': s.status === 'done',
                                    })}>{s.status === 'done' ? <CheckCheck size={14} /> : `#${i + 1}`}</span>
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-wider mb-0.5">{name.replace(/_/g, ' ')}</p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <div className={cn('w-1.5 h-1.5 rounded-full', {
                                        'bg-muted-foreground/20': s.status === 'pending',
                                        'bg-primary shadow-[0_0_5px_rgba(var(--primary),0.5)]': s.status === 'in_progress',
                                        'bg-emerald-500': s.status === 'done',
                                    })} />
                                    <p className={cn('text-[9px] font-black uppercase tracking-widest', {
                                        'text-muted-foreground/30': s.status === 'pending',
                                        'text-primary': s.status === 'in_progress',
                                        'text-emerald-500': s.status === 'done',
                                    })}>{s.status.replace('_', ' ')}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Notes */}
                {effectiveCanEdit && (
                    <div className="space-y-2">
                        <Input value={noteWorker} onChange={e => setNoteWorker(e.target.value)} placeholder="Worker name (optional)" className="rounded-xl h-9 text-xs font-bold" />
                        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add progress note…" rows={2} className="rounded-xl text-xs" />
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => noteMut.mutate()} disabled={!note || noteMut.isPending} className="rounded-xl font-black text-xs flex-1 gap-1">
                                {noteMut.isPending ? <Loader2 size={12} className="animate-spin" /> : null} Add Note
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => shortageMut.mutate('Material shortage flagged')} className="rounded-xl font-black text-xs gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                                <TriangleAlert size={12} /> Flag Shortage
                            </Button>
                        </div>
                    </div>
                )}

                {/* Notes history */}
                {stage.notes?.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Progress Notes</p>
                        {stage.notes.slice(-3).reverse().map((n: any, i: number) => (
                            <div key={n._id || n.addedAt || i} className="p-3 rounded-xl bg-muted/20 border border-border/20">
                                <p className="text-xs font-bold text-foreground/80">{n.note}</p>
                                <p className="text-[10px] text-muted-foreground/40 mt-1">{n.workerName && `${n.workerName} · `}{new Date(n.addedAt).toLocaleDateString('en-IN')}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Mark Done */}
                {effectiveCanEdit && doneCount === SUB_STAGE_ORDER.length && (
                    <Button onClick={() => doneMut.mutate()} disabled={doneMut.isPending}
                        className="w-full h-11 rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                        {doneMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                        Mark Production Complete → Move to QC
                    </Button>
                )}
                {effectiveCanEdit && doneCount < SUB_STAGE_ORDER.length && (
                    <p className="text-center text-muted-foreground/30 text-xs font-bold">Complete all {SUB_STAGE_ORDER.length - doneCount} remaining sub-stages to proceed</p>
                )}
            </div>
        </SectionCard>
        </motion.div>
    );
}

// ── QC Tab ────────────────────────────────────────────────────────────────────

const QC_PARAMETERS = [
    'Dimensions Accuracy', 'Finish Quality', 'Hardware Fitting',
    'Structural Integrity', 'Laminate / Polish Quality',
];

function QCTab({ id, jc, qcClient, canEdit }: any) {
    const { data: qRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'qc'], queryFn: () => apiGet(`/jobcards/${id}/qc`) });
    const stage: any = (qRaw as any)?.data ?? null;

    const [checklist, setChecklist] = useState<Record<string, any>>({});
    const [failReason, setFailReason] = useState('');
    const [defectSummary, setDefectSummary] = useState('');

    const checkMut = useMutation({
        mutationFn: () => apiPut(`/jobcards/${id}/qc/checklist`, {
            checklist: QC_PARAMETERS.map(p => ({
                parameter: p,
                passed: checklist[p]?.passed ?? false,
                notes: checklist[p]?.notes ?? '',
            })),
        }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }),
    });

    const passMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/qc/pass`),
        onSuccess: () => { 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcards'] }); 
        },
    });

    const failMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/qc/fail`, { failReason, defectSummary }),
        onSuccess: () => { 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcards'] }); 
        },
    });

    const uploadPhotosMut = useMutation({
        mutationFn: (fd: FormData) => apiUpload(`/jobcards/${id}/qc/defect-photos`, fd),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }),
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage) return <EmptyStage name="QC Stage" />;

    const existingChecklist: Record<string, any> = {};
    stage.checklist?.forEach((c: any) => { existingChecklist[c.parameter] = c; });
    const merged = { ...existingChecklist, ...checklist };
    const mergedCount = Object.values(merged).filter((v: any) => v.passed).length;

    const allPassed = QC_PARAMETERS.every(p => merged[p]?.passed);

    const isLocked = jc.status !== 'qc_pending';
    const effectiveCanEdit = canEdit && !isLocked;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}
            {canEdit && isLocked && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 text-xs font-bold">
                    <History size={13} />
                    Stage Locked — Job Card is {jc.status?.replace(/_/g, ' ')}
                </div>
            )}

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[20px] border border-purple-500/20 bg-linear-to-br from-purple-500/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Shield size={14} className="text-purple-500" />
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">QC Stage</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Expected Delivery</p>
                        <p className={cn('text-sm font-bold', !jc.expectedDelivery ? 'text-muted-foreground/40' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.qc} roleLabel="Assigned QC Team" color="bg-purple-500" />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Stage Status</p>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wide',
                            jc.status === 'qc_pending' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            jc.status === 'qc_passed'  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {jc.status?.replace(/_/g, ' ') || 'pending'}
                        </span>
                    </div>
                </div>
            </motion.div>

            <SectionCard title="Quality Assurance" icon={ShieldCheck} color="text-purple-500">
            <div className="space-y-6">
                {/* Verdict badge */}
                {stage.verdict && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className={cn('flex items-center gap-3 px-5 py-4 rounded-[20px] font-black text-sm border shadow-sm',
                        stage.verdict === 'pass' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20')}>
                        <div className={cn('p-2 rounded-xl', stage.verdict === 'pass' ? 'bg-emerald-500/20' : 'bg-rose-500/20')}>
                            {stage.verdict === 'pass' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        </div>
                        <div className="flex-1">
                            <p className="uppercase tracking-tighter">QC {stage.verdict === 'pass' ? 'PASSED' : 'FAILED'}</p>
                            <p className="text-[10px] font-bold opacity-60">Verified by inspector · {new Date(stage.inspectedAt || Date.now()).toLocaleDateString()}</p>
                        </div>
                        {stage.reworkCount > 0 && (
                            <div className="bg-muted/10 px-3 py-1 rounded-full border border-border/20 text-[10px] uppercase tracking-widest font-black">
                                Rework #{stage.reworkCount}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Checklist */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Inspection Checklist</p>
                        <p className="text-[10px] font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">{mergedCount}/{QC_PARAMETERS.length} verified</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                        {QC_PARAMETERS.map(param => {
                            const val = merged[param];
                            return (
                                <div key={param} className="group flex items-center gap-4 p-4 rounded-2xl bg-card/40 border border-border/20 hover:border-border/40 transition-all">
                                    <button onClick={effectiveCanEdit ? () => setChecklist(prev => ({ ...prev, [param]: { ...prev[param], passed: !val?.passed } })) : undefined}
                                        disabled={!effectiveCanEdit}
                                        className={cn('w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm',
                                            val?.passed ? 'bg-emerald-500 border-emerald-500 scale-105' : 'bg-muted/10 border-border/30 hover:border-primary/40',
                                            !effectiveCanEdit && 'cursor-default opacity-50')}>
                                        {val?.passed && <CheckCheck size={16} className="text-white" strokeWidth={3} />}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('text-sm font-black uppercase tracking-wide transition-all', val?.passed ? 'text-emerald-600/50 line-through' : 'text-foreground/90')}>{param}</p>
                                        <input 
                                            className="mt-2 w-full text-sm font-medium bg-muted/20 hover:bg-muted/40 text-foreground outline-none placeholder:text-muted-foreground/40 border border-border/10 focus:border-purple-500/50 focus:bg-purple-500/5 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                                            placeholder="Type your inspection notes here..."
                                            value={checklist[param]?.notes ?? val?.notes ?? ''}
                                            onChange={e => setChecklist(prev => ({ ...prev, [param]: { ...prev[param], notes: e.target.value } }))}
                                            disabled={!effectiveCanEdit} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {effectiveCanEdit && (
                        <div className="pt-2">
                            <Button size="sm" variant="outline" onClick={() => checkMut.mutate()} disabled={checkMut.isPending} 
                                className="w-full h-10 rounded-xl font-black text-[11px] uppercase tracking-widest border-purple-500/20 text-purple-600 hover:bg-purple-500/5">
                                {checkMut.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : <History size={12} className="mr-1" />} 
                                Record Verification / Update List
                            </Button>
                        </div>
                    )}
                </div>

                {/* Defect photos */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Defect Photos</p>
                        {effectiveCanEdit && (
                            <div className="relative">
                                <input type="file" id="defect-photo-upload" multiple accept="image/*" className="hidden" disabled={uploadPhotosMut.isPending} onChange={(e) => {
                                    if (!e.target.files?.length) return;
                                    const fd = new FormData();
                                    Array.from(e.target.files).forEach(f => fd.append('files', f));
                                    uploadPhotosMut.mutate(fd, {
                                        onSettled: () => { e.target.value = ''; }
                                    });
                                }} />
                                <label htmlFor="defect-photo-upload" className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
                                    uploadPhotosMut.isPending 
                                        ? "bg-rose-500/5 text-rose-500/50 border border-rose-500/10 cursor-wait shadow-inner" 
                                        : "bg-rose-500 text-white shadow-[0_4px_15px_-5px_rgba(244,63,94,0.5)] hover:shadow-[0_4px_20px_-5px_rgba(244,63,94,0.7)] hover:-translate-y-0.5 cursor-pointer"
                                )}>
                                    {uploadPhotosMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                                    {uploadPhotosMut.isPending ? 'Uploading to Cloudinary...' : 'Upload Photos'}
                                </label>

                            </div>
                        )}
                    </div>
                    {stage.defectPhotos?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {stage.defectPhotos.map((photo: any, i: number) => (
                                <div key={photo._id || i} className="group/photo relative">
                                    <div className="aspect-square rounded-2xl overflow-hidden border border-border/20 bg-muted/20 hover:border-rose-500/40 transition-all cursor-zoom-in shadow-sm">
                                        <ImagePreview src={photo.url} alt={`Defect ${i+1}`} />
                                    </div>
                                    <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1.5">Defect #{i+1}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] font-bold text-muted-foreground/30 italic">No defect photos uploaded yet.</p>
                    )}
                </div>
                {/* Failure inputs (only show if any param is failed or manually triggered) */}
                {canEdit && jc.status === 'qc_pending' && (
                    <div className="space-y-4 pt-4 border-t border-border/10">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-rose-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Failure & Rework Details</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Core Reason for Failure</Label>
                                <Input placeholder="e.g., Dimension mismatch in base unit" value={failReason} onChange={e => setFailReason(e.target.value)}
                                    disabled={!effectiveCanEdit}
                                    className="h-11 rounded-1.5xl border-border/30 bg-background/50 text-xs font-bold focus:border-rose-500/40" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-40 ml-1">Detailed Defect Summary</Label>
                                <Textarea placeholder="Describe specific defects here..." value={defectSummary} onChange={e => setDefectSummary(e.target.value)}
                                    disabled={!effectiveCanEdit}
                                    className="min-h-[80px] rounded-1.5xl border-border/30 bg-background/50 text-xs font-bold focus:border-rose-500/40" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Pass / Fail */}
                {effectiveCanEdit && jc.status === 'qc_pending' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/20">
                        <Button onClick={() => failMut.mutate()} disabled={failMut.isPending}
                            className="rounded-xl font-black gap-2 bg-rose-500 hover:bg-rose-600 text-white">
                            {failMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} QC Fail
                        </Button>
                        <Button onClick={() => passMut.mutate()} disabled={passMut.isPending || !allPassed}
                            className="rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                            {passMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} QC Pass
                        </Button>
                    </div>
                )}
                {effectiveCanEdit && jc.status === 'qc_pending' && !allPassed && (
                    <p className="text-center text-xs text-muted-foreground/30 font-bold">Check all parameters to enable QC Pass</p>
                )}


            </div>
        </SectionCard>
        </motion.div>
    );
}

// ── Dispatch Tab ──────────────────────────────────────────────────────────────

function DispatchTab({ id, jc, qcClient, canEdit }: any) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data: dRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'dispatch'], queryFn: () => apiGet(`/jobcards/${id}/dispatch`) });
    const stage: any = (dRaw as any)?.data ?? null;

    // Fetch dispatch team names for searchable dropdown
    const dispatchRes: any = useDispatchTeam();
    const dispatchMembers = dispatchRes.data?.data || [];
    const dispatchOptions = dispatchMembers.map((m: any) => ({
        value: m._id,
        label: m.name,
        color: '#8ffb03' // Dispatch role color
    }));

    const [form, setForm] = useState({ scheduledDate: '', timeSlot: 'morning', driverName: '', driverPhone: '' });
    const [proofPhoto, setProofPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [podUrl, setPodUrl] = useState<string>('');
    const [uploadingPod, setUploadingPod] = useState(false);
    const [clientSignature, setClientSignature] = useState('');
    const [gpsLocation, setGpsLocation] = useState('');

    // Sync form state when stage data loads
    useEffect(() => {
        if (stage) {
            setForm({
                scheduledDate: stage.scheduledDate ? format(parseISO(stage.scheduledDate), 'yyyy-MM-dd') : '',
                timeSlot: stage.timeSlot || 'morning',
                driverName: stage.deliveryTeam?.[0]?.name || '',
                driverPhone: stage.deliveryTeam?.[0]?.phone || ''
            });
            if (stage.clientSignature) setClientSignature(stage.clientSignature);
            if (stage.gpsLocation) setGpsLocation(stage.gpsLocation);
        }
    }, [stage]);

    useEffect(() => {
        if (!proofPhoto) {
            setPreviewUrl('');
            return;
        }
        const url = URL.createObjectURL(proofPhoto);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [proofPhoto]);

    const handlePodUpload = async (file: File) => {
        setUploadingPod(true);
        try {
            setProofPhoto(file); 
            
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/jobcards/upload-pod-photo', fd);
            if (res?.success) {
                setPodUrl(res.url);
                toast.success('Photo uploaded to cloud');
            }
        } catch (err) {
            console.error('Failed to upload POD', err);
            toast.error('Photo upload failed');
            setProofPhoto(null);
        } finally {
            setUploadingPod(false);
        }
    };

    const scheduleMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/dispatch`, {
            ...form,
            deliveryTeam: [{ name: form.driverName, phone: form.driverPhone }]
        }),
        onSuccess: () => { 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'dispatch'] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcards'] }); 
        },
    });

    const deliverMut = useMutation({
        mutationFn: async () => {
            return apiPatch(`/jobcards/${id}/dispatch/deliver`, {
                clientSignature,
                gpsLocation,
                podPhotoUrl: podUrl
            });
        },
        onSuccess: () => { 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'dispatch'] }); 
            qcClient.invalidateQueries({ queryKey: ['jobcards'] }); 
            toast.success('Job delivered successfully!');
        },
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage && jc.status !== 'qc_passed') return <EmptyStage name="Dispatch Stage" />;

    const isLocked = ['delivered', 'completed'].includes(jc.status);
    const effectiveCanEdit = canEdit && !isLocked;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}
            {canEdit && isLocked && (
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 text-xs font-bold">
                    <History size={13} />
                    Stage Locked — Job Card is currently {jc.status?.replace(/_/g, ' ')}
                </div>
            )}

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[24px] border border-cyan-500/20 bg-linear-to-br from-cyan-500/10 via-background to-background p-4 shadow-xl shadow-cyan-500/5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner">
                        <Truck size={16} className="text-cyan-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-[9px] uppercase tracking-[0.3em] text-cyan-600/60 leading-none mb-1">Dispatch Lifecycle</h3>
                        <p className="font-bold text-base text-foreground tracking-tight">Logistics Management</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1.5">
                            {stage?.scheduledDate ? 'Scheduled Delivery' : 'Target Delivery'}
                        </p>
                        <p className={cn('text-xs font-black', 
                            !(stage?.scheduledDate || jc.expectedDelivery) ? 'text-muted-foreground/30 italic' : 
                            new Date(stage?.scheduledDate || jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground'
                        )}>
                            {(stage?.scheduledDate || jc.expectedDelivery) ? new Date(stage?.scheduledDate || jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending assignment'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.dispatch} roleLabel="Dispatch Team" color="bg-cyan-500" />
                    <div className="col-span-1 sm:col-span-2 sm:flex sm:justify-end">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1.5 sm:text-right">Stage Status</p>
                            <span className={cn(
                                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest',
                                jc.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full bg-current", jc.status !== 'delivered' && "animate-pulse")} />
                                {jc.status?.replace(/_/g, ' ') || 'pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <SectionCard title="Logistics & Delivery" icon={Truck} color="text-cyan-600 bg-cyan-600/5" overflowVisible>
            <div className="space-y-6">
                {stage?.scheduledDate && (
                    <motion.div initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="p-5 rounded-[22px] bg-cyan-500/5 border border-cyan-500/20 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-cyan-500/10" />
                        
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600/70 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                Scheduled Delivery
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 relative z-10">
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-0.5">Delivery Date</p>
                                <p className="text-xs font-black">{new Date(stage.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-0.5">Arrival Slot</p>
                                <p className="text-xs font-black capitalize">{stage.timeSlot}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-0.5">Driver / Lead</p>
                                <p className="text-xs font-black">{stage.deliveryTeam?.[0]?.name || 'Assigned'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-0.5">Team Contact</p>
                                <p className="text-xs font-black">{stage.deliveryTeam?.[0]?.phone || stage.driverPhone || '—'}</p>
                            </div>
                        </div>

                        {jc.clientId?.address && (
                            <div className="mt-5 pt-5 border-t border-cyan-500/10 relative z-10">
                                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2">Delivery Destination</p>
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                                    <MapPin size={14} className="text-cyan-600 mt-0.5" />
                                    <p className="text-[11px] font-medium text-foreground/70 leading-relaxed italic">
                                        {(typeof jc.clientId.address === 'object') 
                                            ? [jc.clientId.address.houseNumber, jc.clientId.address.line1, jc.clientId.address.line2, jc.clientId.address.city, jc.clientId.address.pincode].filter(Boolean).join(', ')
                                            : jc.clientId.address}
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Schedule form */}
                {effectiveCanEdit && ['qc_passed', 'dispatched'].includes(jc.status) && !stage?.deliveredAt && (
                    <div className="space-y-4 p-5 rounded-[28px] bg-card/40 border border-border/20 shadow-xl shadow-black/5 backdrop-blur-sm">
                        <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex items-center gap-2.5 mb-1">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                    <CalendarCheck size={14} className="text-cyan-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80 leading-none mb-0.5">
                                        {stage?.scheduledDate ? 'Modify Delivery Schedule' : 'Initialize Dispatch'}
                                    </p>
                                    <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">Logistic Operations</p>
                                </div>
                            </div>
                            {jc.deliveryTripId && (
                                <Badge variant="outline" className="bg-cyan-500/10 text-cyan-600 border-cyan-500/20 text-[9px] font-black uppercase tracking-widest px-3">
                                    Batch Managed
                                </Badge>
                            )}
                        </div>

                        {jc.deliveryTripId ? (
                            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center gap-3">
                                <AlertCircle size={14} className="text-cyan-600 shrink-0" />
                                <p className="text-[11px] font-medium text-cyan-700/70 leading-relaxed italic">
                                    This job card is part of a consolidated batch delivery trip. Scheduling and routing are managed globally for all items in this shipment.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Desired Delivery Date</Label>
                                        <div className={cn(!effectiveCanEdit && "opacity-50 pointer-events-none")}>
                                            <DatePicker 
                                                date={form.scheduledDate ? parseISO(form.scheduledDate) : undefined} 
                                                setDate={(date) => setForm(f => ({ ...f, scheduledDate: date ? format(date, 'yyyy-MM-dd') : '' }))} 
                                                className="h-10 rounded-xl border-border/30 bg-background/50 focus:ring-cyan-500/10 font-bold px-4 text-xs" 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Arrival Slot</Label>
                                        <Select value={form.timeSlot} onValueChange={val => setForm(f => ({ ...f, timeSlot: val }))} disabled={!effectiveCanEdit}>
                                            <SelectTrigger className="w-full h-10 rounded-xl border-border/30 bg-background/50 px-4 text-xs font-bold focus:ring-cyan-500/10">
                                                <SelectValue placeholder="Select Slot" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/30 bg-background/95 backdrop-blur-md">
                                                <SelectItem value="morning" className="rounded-lg font-bold py-2 text-xs">Morning (9am–12pm)</SelectItem>
                                                <SelectItem value="afternoon" className="rounded-lg font-bold py-2 text-xs">Afternoon (12pm–4pm)</SelectItem>
                                                <SelectItem value="evening" className="rounded-lg font-bold py-2 text-xs">Evening (4pm–8pm)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Delivery Person</Label>
                                        <SearchableSelect 
                                            options={dispatchOptions}
                                            value={dispatchMembers.find((m: any) => m.name === form.driverName)?._id || ''}
                                            onChange={(val) => {
                                                const member = dispatchMembers.find((m: any) => m._id === val);
                                                if (member) {
                                                    setForm(f => ({ 
                                                        ...f, 
                                                        driverName: member.name, 
                                                        driverPhone: member.phone || '' 
                                                    }));
                                                }
                                            }}
                                            placeholder="Search Delivery Person"
                                            searchPlaceholder="Type name..."
                                            disabled={!effectiveCanEdit}
                                            className="h-10 rounded-xl border-border/30 bg-background/50 text-xs font-bold focus:ring-cyan-500/10"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Contact Phone</Label>
                                        <Input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="Phone number" disabled={!effectiveCanEdit} className="rounded-xl h-10 bg-background/50 border-border/30 font-bold text-xs px-4 focus:ring-cyan-500/10" />
                                    </div>
                                </div>
                                
                                <Button onClick={() => scheduleMut.mutate()} disabled={!form.scheduledDate || scheduleMut.isPending}
                                    className="w-full h-12 rounded-xl font-black gap-3 bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300">
                                    {scheduleMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                                    {stage?.scheduledDate ? 'Save Schedule Changes' : 'Confirm & Schedule Dispatch'}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Mark Delivered */}
                {effectiveCanEdit && jc.status === 'dispatched' && !stage?.deliveredAt && (
                    <div className="space-y-4 p-5 rounded-[28px] bg-emerald-500/5 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 backdrop-blur-sm relative z-10 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                        
                        <div className="flex items-center justify-between gap-4 mb-1 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                                    <PackageCheck size={14} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none mb-0.5">Mark as Delivered</p>
                                    <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-widest">Final Step in Lifecycle</p>
                                </div>
                            </div>
                            {jc.deliveryTripId && (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-3">
                                    Trip Managed
                                </Badge>
                            )}
                        </div>

                        {jc.deliveryTripId ? (
                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3 relative z-10">
                                <AlertCircle size={14} className="text-emerald-600 shrink-0" />
                                <p className="text-[11px] font-medium text-emerald-700/70 leading-relaxed italic">
                                    This item is currently out for delivery as part of a batch shipment. Please use the <strong>Global Dispatch Hub</strong> to capture proof and complete the delivery for all items in this trip.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 relative z-10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Client Name / Signature</Label>
                                    <Input value={clientSignature} onChange={e => setClientSignature(e.target.value)} placeholder="Type name or scan signature..." className="rounded-xl h-10 bg-background/50 border-border/30 font-bold text-xs px-4 focus:ring-emerald-500/10 transition-all" disabled={!effectiveCanEdit} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">GPS Location / Address</Label>
                                    <Input value={gpsLocation} onChange={e => setGpsLocation(e.target.value)} placeholder="Auto-detecting location..." className="rounded-xl h-10 bg-background/50 border-border/30 font-bold text-xs px-4 focus:ring-emerald-500/10 transition-all" disabled={!effectiveCanEdit} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-1">Proof of Delivery Photo</Label>
                                <div className="flex flex-col gap-3">
                                    {(previewUrl || podUrl || stage?.proofOfDelivery?.photo || uploadingPod) && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }} 
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative w-full max-w-[280px] aspect-video rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl group/preview"
                                        >
                                            {uploadingPod ? (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-md z-20">
                                                    <Loader2 className="animate-spin text-emerald-600" size={24} />
                                                </div>
                                            ) : (
                                                <ImagePreview 
                                                    src={podUrl || previewUrl || stage?.proofOfDelivery?.photo} 
                                                    alt="POD Preview" 
                                                />
                                            )}
                                            
                                            <div className="absolute top-0 inset-x-0 bg-linear-to-b from-black/40 via-transparent to-transparent p-2 flex justify-between items-start pointer-events-none z-10">
                                                <div />
                                                {effectiveCanEdit && !uploadingPod && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setProofPhoto(null); setPodUrl(''); }}
                                                        className="p-1 rounded-lg bg-black/40 backdrop-blur-md text-white border border-white/20 hover:bg-rose-500 transition-colors shadow-lg pointer-events-auto"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {effectiveCanEdit && (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-[24px] transition-all cursor-pointer group hover:bg-emerald-500/5",
                                                (proofPhoto || podUrl) ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/30 hover:border-emerald-500/30"
                                            )}
                                        >
                                            <input 
                                                ref={fileInputRef}
                                                id="detail-camera-input"
                                                type="file" 
                                                accept="image/*" 
                                                className="sr-only" 
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handlePodUpload(file);
                                                }} 
                                                disabled={uploadingPod}
                                            />
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                <Camera size={16} className="text-emerald-600" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">
                                                    {proofPhoto ? 'Change Selected Photo' : 'Upload Delivery Proof'}
                                                </p>
                                                <p className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter italic">Camera or browse (Max 20MB)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); deliverMut.mutate(); }} 
                                disabled={deliverMut.isPending || uploadingPod || !clientSignature || (!podUrl && !stage?.proofOfDelivery?.photo)}
                                className="w-full h-12 rounded-xl font-black gap-3 bg-linear-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 relative z-10">
                                {deliverMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                                Confirm & Complete Delivery
                            </Button>
                        </div>
                    )}
                </div>
            )}

                {/* Delivered state */}
                {stage?.deliveredAt && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center gap-5 relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-inner shrink-0">
                                <CheckCircle2 size={24} className="text-emerald-600" />
                            </div>
                            
                            <div className="flex-1 text-center sm:text-left relative z-10">
                                <p className="font-black text-emerald-800 text-lg tracking-tight leading-none mb-0.5">Mission Completed!</p>
                                <p className="text-[10px] text-emerald-700/60 font-bold uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2">
                                    <Clock size={10} />
                                    {new Date(stage.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            </div>

                            <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/30 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full relative z-10">
                                Successfully Delivered
                            </Badge>
                        </div>

                        {stage.proofOfDelivery?.photo && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Official Proof of Delivery (POD)</Label>
                                <div className="relative rounded-[24px] overflow-hidden border border-emerald-500/20 shadow-2xl group/final">
                                    <img 
                                        src={stage.proofOfDelivery.photo} 
                                        alt="Proof of Delivery" 
                                        className="w-full aspect-video object-cover transition-transform duration-1000 group-hover/final:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                                        <div className="flex flex-wrap items-end justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Capture Insights</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 text-white/90 text-[10px] font-black">
                                                        <MapPin size={12} className="text-emerald-400" />
                                                        {stage.proofOfDelivery.gpsLocation || 'Co-ordinates standard'}
                                                    </div>
                                                    <div className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                                    <div className="text-white/60 text-[10px] font-bold italic">
                                                        Authenticated by {stage.deliveredBy?.name || 'Field Agent'}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" asChild className="h-7 rounded-lg bg-white/10 backdrop-blur-md border-white/20 text-white text-[9px] font-black uppercase hover:bg-white/20 px-3">
                                                <a href={stage.proofOfDelivery.photo} target="_blank" rel="noreferrer">
                                                    <Maximize2 size={10} className="mr-1" /> View
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Activity log */}
                {jc.activityLog?.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border/20">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Activity Log</p>
                        {jc.activityLog.slice(-3).reverse().map((a: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground/40">
                                <Clock size={9} className="mt-0.5 shrink-0" />
                                <span><span className="font-bold text-foreground/60">{a.action?.replace(/_/g, ' ')}</span> · {new Date(a.timestamp).toLocaleDateString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SectionCard>
        </motion.div>
    );
}

// ── Closure Tab ───────────────────────────────────────────────────────────────

function ClosureTab({ id, jc, qcClient }: { id: string; jc: any; qcClient: any }) {
    const [warrantyNotes, setWarrantyNotes] = useState(jc.warrantyNotes || '');
    const [punchList, setPunchList] = useState(jc.punchListItems?.join('\n') || '');

    const { data: invRaw } = useQuery({
        queryKey: ['invoices-jc', id],
        queryFn: () => apiGet(`/invoices?jobCardId=${id}`),
        staleTime: 30000,
    });
    const invoices: any[] = (invRaw as any)?.data ?? [];
    const pendingInvoices = invoices.filter(i => i.balanceDue > 0);
    const hasInvoices = invoices.length > 0;
    const allPaid = hasInvoices && pendingInvoices.length === 0;

    const closeMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/close`, { warrantyNotes, punchListItems: punchList.split('\n').filter(Boolean) }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id] }),
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to close job card'),
    });

    const isClosed = jc.status === 'closed';
    const canClose = jc.status === 'delivered' && allPaid;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            <SectionCard title="Job Finalization & Closure" icon={Archive} color="text-emerald-500">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Warranty Notes</Label>
                            <textarea
                                value={warrantyNotes}
                                onChange={e => setWarrantyNotes(e.target.value)}
                                disabled={isClosed}
                                className="w-full h-24 rounded-2xl border border-border bg-background p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                placeholder="Enter specific warranty terms or duration for this job..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Punch List / Pending Items</Label>
                            <textarea
                                value={punchList}
                                onChange={e => setPunchList(e.target.value)}
                                disabled={isClosed}
                                className="w-full h-24 rounded-2xl border border-border bg-background p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                placeholder="One item per line (e.g. Minor scratch on left door)"
                            />
                        </div>
                    </div>

                    <div className="bg-muted/10 rounded-3xl p-6 border border-border/40 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1.5">
                                <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                                    Final Stage Actions
                                    {isClosed && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] h-5">Archived</Badge>}
                                </h4>
                                <p className="text-xs text-muted-foreground/60 font-medium">Verify financial status and documentation before archiving.</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 bg-background/50 rounded-2xl border border-border/50">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Invoice Status</p>
                                    {!hasInvoices ? (
                                        <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-black uppercase">Missing Invoice</Badge>
                                    ) : !allPaid ? (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black uppercase">{pendingInvoices.length} Pending Payment</Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase">Fully Paid</Badge>
                                    )}
                                </div>

                                {!allPaid && hasInvoices && !isClosed && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="rounded-xl font-black gap-2 h-11 border-amber-500/30 text-amber-600 hover:bg-amber-500/5 shadow-sm"
                                    >
                                        <Link to={`/invoices/${pendingInvoices[0]._id}`}>
                                            <FileText size={14} /> Complete Invoice
                                        </Link>
                                    </Button>
                                )}

                                <Button
                                    onClick={() => closeMut.mutate()}
                                    disabled={closeMut.isPending || isClosed || !canClose}
                                    className={cn(
                                        "rounded-xl font-black gap-2 h-11 px-8 shadow-lg transition-all",
                                        isClosed ? "bg-muted text-muted-foreground/30 shadow-none" : 
                                        !canClose ? "bg-muted text-muted-foreground/40 cursor-not-allowed" : 
                                        "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                                    )}
                                >
                                    {isClosed ? <ArchiveRestore size={14} /> : <CheckCircle2 size={14} />}
                                    {isClosed ? 'Job Card Archived' : 'Close & Archive Job Card'}
                                </Button>
                            </div>
                        </div>

                        {!isClosed && (
                            <div className="space-y-2">
                                {jc.status !== 'delivered' && (
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                        <AlertCircle size={10} /> Job must be marked as 'Delivered' before closure.
                                    </p>
                                )}
                                {!allPaid && hasInvoices && (
                                    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 transition-all hover:bg-amber-500/10">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                            <AlertCircle size={12} /> Account check failed: One or more invoices have outstanding balances.
                                        </p>
                                        <Link to={`/invoices/${pendingInvoices[0]._id}`} className="text-[10px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm hover:scale-105 transition-transform">
                                            PAY NOW <ArrowLeft className="rotate-180" size={10} />
                                        </Link>
                                    </div>
                                )}
                                {!hasInvoices && (
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                        <AlertCircle size={10} /> Financial violation: No invoices detected. Job cannot be closed without billing.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SectionCard>
        </motion.div>
    );
}

// ── EmptyStage ────────────────────────────────────────────────────────────────

function EmptyStage({ name }: { name: string }) {
    return (
        <div className="mt-4 bg-card dark:bg-card/20 border border-border/30 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-muted-foreground/20" />
            </div>
            <p className="text-muted-foreground/30 font-black text-xs uppercase tracking-widest">{name} — Pending</p>
            <p className="text-muted-foreground/20 text-xs font-medium mt-1">This stage will unlock automatically when the previous stage is completed.</p>
        </div>
    );
}

// ── EditJobCardModal ─────────────────────────────────────────────────────────

function EditJobCardModal({ jc, onClose, onSuccess }: any) {
    const [title, setTitle] = useState(jc.title || '');
    const [priority, setPriority] = useState(jc.priority || 'medium');
    const [expectedDelivery, setExpectedDelivery] = useState(
        jc.expectedDelivery ? new Date(jc.expectedDelivery).toISOString().split('T')[0] : ''
    );
    const [contactPerson, setContactPerson] = useState(jc.contactPerson || '');
    const [items, setItems] = useState<any[]>(jc.items ? JSON.parse(JSON.stringify(jc.items)) : []);

    const updateMut = useMutation({
        mutationFn: () => apiPut(`/jobcards/${jc._id}`, { title, priority, expectedDelivery, contactPerson, items }),
        onSuccess,
    });

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            if (!newItems[index]) return prev;
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handlePhotoUpload = async (index: number, file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        const uploadingKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const publicIdKey = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';

        updateItem(index, uploadingKey, true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/jobcards/upload-item-photo', fd);
            if (res?.success) {
                updateItem(index, type, res.url);
                updateItem(index, publicIdKey, res.publicId);
            }
        } catch (err) {
            console.error('Failed to upload', err);
        } finally {
            updateItem(index, uploadingKey, false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[32px] border border-border shadow-2xl overflow-hidden"
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-muted/20 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-foreground">Edit Job Card</h2>
                        <p className="text-muted-foreground/60 text-xs font-bold mt-1">Modify details and items for {jc.jobCardNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto space-y-8 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 md:col-span-3">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Project Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} className="h-12 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Priority</Label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value)}
                                className="w-full h-12 rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Expected Delivery</Label>
                            <DatePicker 
                                date={expectedDelivery ? parseISO(expectedDelivery) : undefined} 
                                setDate={(date) => setExpectedDelivery(date ? format(date, 'yyyy-MM-dd') : '')} 
                                className="h-12 border-border/40 focus:ring-primary/20 hover:border-primary/40 transition-colors font-bold" 
                            />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Contact Person</Label>
                            <Input value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="e.g. John Doe / +91 ..." className="h-12 rounded-xl" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Furniture Item</Label>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={item._id || item.id || idx} className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-border/40 bg-muted/10 relative group">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background border font-black text-xs text-muted-foreground shrink-0 select-none">
                                        {item.srNo}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-3">
                                            <Input
                                                placeholder="Item Description (e.g., Wardrobe 8x7 ft)"
                                                value={item.description}
                                                onChange={e => updateItem(idx, 'description', e.target.value)}
                                                className="flex-1 h-10 rounded-lg text-sm font-bold"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="Qty"
                                                value={item.qty}
                                                onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                                                className="w-20 h-10 rounded-lg text-sm text-center font-bold"
                                            />
                                            <Input
                                                placeholder="Unit"
                                                value={item.unit}
                                                onChange={e => updateItem(idx, 'unit', e.target.value)}
                                                className="w-20 h-10 rounded-lg text-sm text-center font-bold uppercase"
                                            />
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-3 pt-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block">Main Photo</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.photo}
                                                    uploading={item.uploading}
                                                    onFileSelect={(file) => handlePhotoUpload(idx, file, 'photo')}
                                                    onRemove={() => { updateItem(idx, 'photo', ''); updateItem(idx, 'photoPublicId', ''); }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block">Fabric / Material</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.fabricPhoto}
                                                    uploading={item.uploadingFabric}
                                                    onFileSelect={(file) => handlePhotoUpload(idx, file, 'fabricPhoto')}
                                                    onRemove={() => { updateItem(idx, 'fabricPhoto', ''); updateItem(idx, 'fabricPhotoPublicId', ''); }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border/40 bg-muted/10 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-11 px-6">Cancel</Button>
                    <Button
                        onClick={() => updateMut.mutate()}
                        disabled={updateMut.isPending || !title}
                        className="rounded-xl font-black h-11 px-8 min-w-[140px]"
                    >
                        {updateMut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}
