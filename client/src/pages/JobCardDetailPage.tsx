import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, downloadPdf, apiUpload } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowLeft, AlertTriangle, Pencil, CheckCircle2, XCircle, Upload,
    Link2, Package, Loader2, ChevronRight, Clock, CheckCheck,
    Truck, Shield, Wrench, FlaskConical, TriangleAlert, User,
    CalendarCheck, MapPin, Camera, FileText, Users, MessageSquare, Download,
    Layers, ShieldCheck, Zap, Maximize2, Fingerprint, Wind, EyeOff, History,
    Archive, Copy, ArchiveRestore, AlertCircle, Plus, ShoppingCart, 
    ArrowRightCircle, CheckSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { cn } from '../lib/utils';
import { ImagePreview } from '@/components/ui/image-preview';
import { DatePicker } from '@/components/ui/date-picker';

// ── Status config ─────────────────────────────────────────────────────────────

const JOB_STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_store: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    in_production: 'bg-primary/10 text-primary border-primary/20',
    qc_pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    qc_passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    qc_failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dispatched: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-muted text-muted-foreground border-border',
};

const SUB_STAGE_ORDER = [
    'cutting', 'edge_banding', 'sanding', 'cleaning',
    'assembly', 'hardware_fitting', 'polishing', 'packing',
];

const SUB_STAGE_ICONS: Record<string, any> = {
    cutting: Wrench, edge_banding: Wrench, sanding: Wrench,
    cleaning: FlaskConical, assembly: Package, hardware_fitting: Wrench,
    polishing: FlaskConical, packing: Package,
};

// ── Helper components ─────────────────────────────────────────────────────────

const InfoRow = ({ label, value }: { label: string; value?: any }) =>
    value ? (
        <div className="flex items-start justify-between py-2 border-b border-border/40 last:border-0 hover:bg-accent/5 px-1 -mx-1">
            <span className="text-muted-foreground/70 text-xs font-medium">{label}</span>
            <span className="text-foreground text-xs text-right font-bold max-w-[60%]">{value}</span>
        </div>
    ) : null;

function SectionCard({ title, icon: Icon, color, children }: any) {
    return (
        <div className="mt-4 bg-card dark:bg-card/20 border border-border/30 rounded-2xl overflow-hidden shadow-sm">
            <div className={cn('flex items-center gap-3 px-6 py-4 border-b border-border/20', color)}>
                <Icon size={16} />
                <h3 className="font-black text-sm uppercase tracking-wider">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobCardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qc = useQueryClient();
    const { hasPermission, user } = useAuthStore();
    const isSuperAdmin = user?.role === 'super_admin';
    const userId = user?.id;

    const canEditJC = hasPermission('jobcard.edit') || hasPermission('designrequest.edit');
    const canSeeDesign = hasPermission('designrequest.view');
    const canSeeStore = hasPermission('storeStage.view');
    const canSeeProd = hasPermission('productionStage.view');
    const canSeeQC = hasPermission('qcStage.view');
    const canSeeDispatch = hasPermission('dispatchStage.view');
    // Edit permissions (full access vs read-only for the tab)
    const canEditDesign = hasPermission('designrequest.edit');
    const canEditStore = hasPermission('storeStage.edit');
    const canEditProd = hasPermission('productionStage.edit');
    const canEditQC = hasPermission('qcStage.edit');
    const canEditDispatch = hasPermission('dispatchStage.edit');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const { data: raw, isLoading } = useQuery({
        queryKey: ['jobcard', id],
        queryFn: () => apiGet(`/jobcards/${id}`),
        enabled: !!id,
    });
    const jc: any = (raw as any)?.data ?? {};

    const isOverdue = jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status);

    // Build visible tabs list based on permissions
    const ALL_TABS = [
        { value: 'overview', label: 'Overview', icon: FileText, show: true },
        { value: 'design', label: 'Design', icon: Pencil, show: canSeeDesign },
        { value: 'store', label: 'Store', icon: Package, show: canSeeStore },
        { value: 'production', label: 'Production', icon: Wrench, show: canSeeProd },
        { value: 'qc', label: 'QC', icon: Shield, show: canSeeQC },
        { value: 'dispatch', label: 'Dispatch', icon: Truck, show: canSeeDispatch },
        { value: 'closure', label: 'Closure', icon: Archive, show: user?.role === 'admin' || user?.role === 'super_admin' },
    ];
    const visibleTabs = ALL_TABS.filter(t => t.show);

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
                          (jc.projectId?.salesPerson?.id || jc.projectId?.salesPerson?._id || jc.projectId?.salesPerson) === userId;

    if (!isSuperAdmin && !isAssigned && !isSalesperson) {
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
                        <p className="text-muted-foreground/60 text-sm font-medium">{jc.clientId?.name} <span className="mx-1.5 opacity-30">/</span> {jc.projectId?.projectName}</p>
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
            </motion.div>

            {/* Stage Tabs — filtered by role permissions */}
            <Tabs defaultValue="overview">
                <TabsList className="flex flex-wrap sm:flex-nowrap bg-muted/50 border border-border/30 p-1 rounded-2xl w-full gap-1 h-auto">
                    {visibleTabs.map(t => (
                        <TabsTrigger key={t.value} value={t.value}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl font-bold text-[11px] sm:text-xs data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm py-2 sm:px-3 px-1">
                            <t.icon size={14} className="shrink-0" />
                            <span className="hidden sm:inline">{t.label}</span>
                            <span className="sm:hidden">{t.label.slice(0, 3)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="mt-4"><OverviewTab jc={jc} /></TabsContent>
                {canSeeDesign && <TabsContent value="design" className="mt-4"><DesignTab id={id!} jc={jc} qcClient={qc} canEdit={canEditDesign} /></TabsContent>}
                {canSeeStore && <TabsContent value="store" className="mt-4"><StoreTab id={id!} jc={jc} qcClient={qc} canEdit={canEditStore} /></TabsContent>}
                {canSeeProd && <TabsContent value="production" className="mt-4"><ProductionTab id={id!} jc={jc} qcClient={qc} canEdit={canEditProd} /></TabsContent>}
                {canSeeQC && <TabsContent value="qc" className="mt-4"><QCTab id={id!} jc={jc} qcClient={qc} canEdit={canEditQC} /></TabsContent>}
                {canSeeDispatch && <TabsContent value="dispatch" className="mt-4"><DispatchTab id={id!} jc={jc} qcClient={qc} canEdit={canEditDispatch} /></TabsContent>}
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <TabsContent value="closure" className="mt-4">
                        <ClosureTab id={id!} jc={jc} qcClient={qc} />
                    </TabsContent>
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
            <div className="flex -space-x-2">
                {users.map((u: any) => (
                    <div key={u._id || u} className={cn("w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white uppercase ring-2", color, color === 'bg-primary' ? 'ring-primary/10' : 'ring-current/10')} title={u.name}>
                        {u.name?.charAt(0) || <User size={12} />}
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

            {/* ── Block 2: PERSONNEL (6 Cols) ── */}
            <div className="md:col-span-12 lg:col-span-6">
                <div className="h-full bg-card/20 backdrop-blur-xl border border-border/10 rounded-[2.5rem] p-10 shadow-sm transition-all duration-500 hover:border-indigo-500/30 group">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500"><Users size={20} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-[0.15em] text-foreground">Personnel</h4>
                            <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">Team Assignment</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mb-2">Sales Lead</p>
                                <p className="text-sm font-black text-foreground/80 uppercase tracking-tight">{jc.salesperson?.name || 'Unassigned'}</p>
                            </div>
                            <MiniStaffBlock users={jc.assignedTo?.design} label="Design" icon={Layers} />
                            <MiniStaffBlock users={jc.assignedTo?.qc} label="Quality" icon={ShieldCheck} />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mb-2">Originator</p>
                                <p className="text-sm font-black text-foreground/80 uppercase tracking-tight">{jc.createdBy?.name || 'System'}</p>
                            </div>
                            <MiniStaffBlock users={jc.assignedTo?.production} label="Factory" icon={Wrench} />
                            <MiniStaffBlock users={jc.assignedTo?.dispatch} label="Logistics" icon={Truck} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Block 3: COMMUNICATION (6 Cols) ── */}
            <div className="md:col-span-12 lg:col-span-6">
                <div className="h-full bg-card/20 backdrop-blur-xl border border-emerald-500/10 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center group">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500"><MessageSquare size={20} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-[0.15em] text-foreground">Communication</h4>
                            <p className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-widest">Client Sync</p>
                        </div>
                    </div>
                    
                    {jc.whatsapp?.groupLink ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-8 text-center space-y-6">
                            <p className="text-xl font-black text-foreground/80 tracking-tight uppercase leading-none">{jc.whatsapp.groupName}</p>
                            <a href={jc.whatsapp.groupLink} target="_blank" rel="noreferrer" 
                                className="inline-flex items-center justify-center w-full gap-3 text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 h-14 rounded-xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase tracking-widest">
                                <Zap size={16} className="fill-current" /> Join Channel
                            </a>
                        </div>
                    ) : (
                        <div className="py-16 border border-dashed border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center text-center px-8">
                            <EyeOff size={32} className="text-emerald-500/10 mb-3" />
                            <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">Channel Not Assigned</p>
                        </div>
                    )}
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

function MiniStaffBlock({ users, label, icon: Icon }: { users: any[]; label: string; icon: any }) {
    const list = Array.isArray(users) ? users : users ? [users] : [];
    
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 opacity-30">
                <Icon size={10} className="text-foreground" />
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground text-left leading-none">{label}</p>
            </div>
            <div className="min-h-[20px]">
                {list.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {list.map((u, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-indigo-500/5 text-indigo-500/80 text-[9px] font-black tracking-tight uppercase border border-indigo-500/10">{u.name}</span>
                        ))}
                    </div>
                ) : (
                    <p className="text-[8px] font-bold text-muted-foreground/20 italic pl-0.5 uppercase text-left leading-none">Unassigned</p>
                )}
            </div>
        </div>
    );
}

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

// ── Design Tab ────────────────────────────────────────────────────────────────

// ── Read-only banner for tabs visible but not editable ───────────────────────
function ReadOnlyBanner() {
    return (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold">
            <Shield size={13} />
            View only — your role cannot edit this stage
        </div>
    );
}

// ── Measurements Editor ──────────────────────────────────────────────────────
function MeasureEditor({ id, items, onSave, canEdit }: { id: string; items: any[]; onSave: (updatedItems: any[]) => void; canEdit: boolean }) {
    const [localItems, setLocalItems] = useState(items || []);
    const [saving, setSaving] = useState(false);

    const handleSpecChange = (itemIdx: number, key: string, val: string) => {
        const next = [...localItems];
        next[itemIdx] = {
            ...next[itemIdx],
            specifications: {
                ...next[itemIdx].specifications,
                [key]: val
            }
        };
        setLocalItems(next);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await apiPut(`/jobcards/${id}`, { items: localItems });
            onSave(localItems);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-[20px] border border-border/40 bg-card/50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-blue-500" />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-foreground/70">Record Measurements</p>
                </div>
                {canEdit && (
                    <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 rounded-xl text-xs font-black gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-sm">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                        Save Dimensions
                    </Button>
                )}
            </div>
            <div className="p-5 space-y-4">
                {localItems.map((item, idx) => (
                    <div key={item._id || idx} className="p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-blue-500/20 transition-all">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                                <p className="text-xs font-bold text-foreground/80">{item.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-muted-foreground/50 border-none bg-muted/40 h-5">
                                {item.qty} {item.unit}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { k: 'height', l: 'Height (mm)', p: 'H' },
                                { k: 'width', l: 'Width (mm)', p: 'W' },
                                { k: 'depth', l: 'Depth (mm)', p: 'D' },
                            ].map(field => (
                                <div key={field.k} className="space-y-1.5">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{field.l}</Label>
                                    <div className="relative group">
                                        <Input
                                            type="text"
                                            value={item.specifications?.[field.k] || ''}
                                            onChange={e => canEdit && handleSpecChange(idx, field.k, e.target.value)}
                                            readOnly={!canEdit}
                                            className="h-9 px-3 text-xs font-bold rounded-xl bg-background border-border/40 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                            placeholder={field.p}
                                        />
                                        <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DesignTab({ id, jc, qcClient, canEdit }: any) {
    const { data: dRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'design'], queryFn: () => apiGet(`/jobcards/${id}/design`) });
    const design: any = (dRaw as any)?.data ?? null;
    const [note, setNote] = useState('');
    const [uploadLoading, setUploadLoading] = useState(false);

    const createMut = useMutation({ mutationFn: () => apiPost(`/jobcards/${id}/design`, {}), onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }) });
    const signoffMut = useMutation({ mutationFn: () => apiPost(`/jobcards/${id}/design/signoff`, {}), onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }) });
    const readyMut = useMutation({ mutationFn: () => apiPatch(`/jobcards/${id}/design/ready`), onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }); } });

    const signoffStatus = design?.signoff?.status;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploadLoading(true);
        try {
            const fd = new FormData();
            Array.from(e.target.files).forEach(f => fd.append('files', f));
            await apiUpload(`/jobcards/${id}/design/files`, fd);
            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] });
        } finally {
            setUploadLoading(false);
            e.target.value = '';
        }
    };

    if (isLoading) return (
        <div className="space-y-4 mt-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/20 rounded-2xl animate-pulse" />)}
        </div>
    );

    if (!design) return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-2 rounded-[24px] border border-violet-500/20 bg-violet-500/5 p-10 text-center space-y-5">
            {!canEdit && <ReadOnlyBanner />}
            <div className="w-16 h-16 rounded-[20px] bg-violet-500/10 flex items-center justify-center mx-auto">
                <Pencil size={26} className="text-violet-500" />
            </div>
            <div>
                <p className="font-black text-lg text-foreground mb-1">Design Stage Not Started</p>
                <p className="text-muted-foreground/50 text-sm font-medium">
                    Initiate the design stage to begin uploading files and getting client sign-off.
                </p>
            </div>
            {canEdit && (
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}
                    className="rounded-2xl font-black gap-2 h-11 px-8 bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20">
                    {createMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                    Initiate Design Stage
                </Button>
            )}
        </motion.div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[20px] border border-violet-500/20 bg-linear-to-br from-violet-500/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Pencil size={14} className="text-violet-500" />
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Design Stage</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Client</p>
                        <p className="text-sm font-bold text-foreground truncate">{jc.clientId?.name || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Expected Delivery</p>
                        <p className={cn('text-sm font-bold', !jc.expectedDelivery ? 'text-muted-foreground/40' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Not set'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.design} roleLabel="Assigned Designers" color="bg-violet-500" />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Sign-off Status</p>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wide',
                            signoffStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            signoffStatus === 'sent'     ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                            signoffStatus === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {signoffStatus || 'pending'}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* ── Measurements ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <MeasureEditor id={id!} items={jc.items} canEdit={canEdit} onSave={() => qcClient.invalidateQueries({ queryKey: ['jobcard', id] })} />
            </motion.div>

            {/* ── Design Files ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                <div className="rounded-[20px] border border-border/40 bg-card/50 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                        <div className="flex items-center gap-2">
                            <Upload size={14} className="text-violet-500" />
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-foreground/70">
                                Design Files
                            </p>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/60">
                                {design.files?.length || 0}
                            </span>
                        </div>
                        {canEdit && (
                            <label className={cn(
                                'flex items-center gap-1.5 cursor-pointer text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all',
                                uploadLoading
                                    ? 'bg-muted text-muted-foreground/40 cursor-wait'
                                    : 'bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border border-violet-500/20'
                            )}>
                                <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />
                                {uploadLoading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                                {uploadLoading ? 'Uploading…' : 'Upload'}
                            </label>
                        )}
                    </div>
                    <div className="p-5">
                        {design.files?.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {design.files.map((f: any, i: number) => (
                                    <motion.a key={f._id || f.id || f.path || i} href={f.url} target="_blank" rel="noreferrer"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group flex items-center gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border/40 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all">
                                        <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                                            <FileText size={16} className="text-violet-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground/80 truncate group-hover:text-violet-600 transition-colors">
                                                {f.title || `File ${i + 1}`}
                                            </p>
                                            <p className="text-[9px] font-medium text-muted-foreground/40">Click to open</p>
                                        </div>
                                    </motion.a>
                                ))}
                            </div>
                        ) : (
                            <label className={cn(
                                'flex flex-col items-center gap-3 py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer',
                                canEdit ? 'border-border/40 hover:border-violet-500/40 hover:bg-violet-500/5' : 'border-border/20 cursor-default'
                            )}>
                                {canEdit && <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />}
                                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                                    <Upload size={20} className="text-muted-foreground/30" />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-muted-foreground/50">
                                        {canEdit ? 'Click to upload CAD files, renders, or PDFs' : 'No files uploaded yet'}
                                    </p>
                                    {canEdit && <p className="text-[10px] text-muted-foreground/30 mt-0.5">PNG, JPG, PDF, DWG supported</p>}
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Client Sign-off ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className={cn(
                    'rounded-[20px] border p-5 space-y-4',
                    signoffStatus === 'approved' ? 'border-emerald-500/25 bg-emerald-500/5' :
                    signoffStatus === 'rejected' ? 'border-rose-500/25 bg-rose-500/5' :
                    signoffStatus === 'sent'     ? 'border-blue-500/25 bg-blue-500/5' :
                    'border-border/40 bg-card/50'
                )}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            signoffStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-500' :
                            signoffStatus === 'rejected' ? 'bg-rose-500/15 text-rose-500' :
                            signoffStatus === 'sent'     ? 'bg-blue-500/15 text-blue-500' :
                            'bg-amber-500/15 text-amber-500'
                        )}>
                            {signoffStatus === 'approved' ? <CheckCircle2 size={18} /> :
                             signoffStatus === 'rejected' ? <XCircle size={18} /> :
                             signoffStatus === 'sent'     ? <Link2 size={18} /> :
                             <Link2 size={18} />}
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-0.5">Client Sign-off</p>
                            <p className={cn('text-sm font-black capitalize',
                                signoffStatus === 'approved' ? 'text-emerald-600 dark:text-emerald-400' :
                                signoffStatus === 'rejected' ? 'text-rose-600 dark:text-rose-400' :
                                signoffStatus === 'sent'     ? 'text-blue-600 dark:text-blue-400' :
                                'text-amber-600 dark:text-amber-400'
                            )}>
                                {signoffStatus === 'approved' ? '✓ Approved by Client' :
                                 signoffStatus === 'rejected' ? '✗ Rejected — Revision Needed' :
                                 signoffStatus === 'sent'     ? 'Link Sent — Awaiting Response' :
                                 'Pending — Not Yet Sent'}
                            </p>
                            {design.signoff?.remarks && (
                                <p className="text-xs text-muted-foreground/60 italic mt-1">"{design.signoff.remarks}"</p>
                            )}
                        </div>
                    </div>
                    {canEdit && !['approved'].includes(signoffStatus) && (
                        <Button size="sm" variant="outline" onClick={() => signoffMut.mutate()} disabled={signoffMut.isPending}
                            className="rounded-xl text-xs font-black gap-1.5 border-border/60 shrink-0">
                            {signoffMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                            {signoffStatus === 'sent' ? 'Resend Link' : 'Send Sign-off Link'}
                        </Button>
                    )}
                </div>
                {signoffMut.isSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600">
                        ✓ Sign-off link sent! The client will receive it via WhatsApp/email.
                    </div>
                )}
            </motion.div>

            {/* ── Designer Notes ── */}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                className="rounded-[20px] border border-border/40 bg-card/50 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border/30">
                    <MessageSquare size={14} className="text-slate-400" />
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-foreground/70">Designer Notes</p>
                </div>
                <div className="p-5 space-y-3">
                    <Textarea
                        value={note || design.designerNotes || ''}
                        onChange={canEdit ? (e => setNote(e.target.value)) : undefined}
                        readOnly={!canEdit}
                        rows={4}
                        className="rounded-xl text-sm resize-none border-border/40 bg-transparent"
                        placeholder="Add design notes, material specifications, dimensions, instructions for production…"
                    />
                    {canEdit && (
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-medium text-muted-foreground/30">
                                {(note || design.designerNotes || '').length} characters
                            </p>
                            <Button size="sm" variant="outline"
                                className="h-8 rounded-xl text-xs font-black border-border/50 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-500"
                                onClick={() => { apiPut(`/jobcards/${id}/design`, { designerNotes: note || design.designerNotes }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }); }}>
                                Save Notes
                            </Button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── Primary Action ── */}
            {canEdit && jc.status === 'active' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <Button
                        onClick={() => readyMut.mutate()}
                        disabled={readyMut.isPending}
                        className="w-full h-14 rounded-[20px] font-black gap-3 text-base bg-linear-to-r from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 text-white shadow-2xl shadow-violet-500/25 transition-all hover:scale-[1.01]"
                    >
                        {readyMut.isPending
                            ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                            : <><CheckCheck size={18} /> Mark Design Ready → Move to Store</>
                        }
                    </Button>
                    <p className="text-center text-[10px] font-medium text-muted-foreground/30 mt-2">
                        This will change the job status to "In Store" and notify the store team.
                    </p>
                </motion.div>
            ) : jc.status !== 'active' && !['cancelled', 'on_hold'].includes(jc.status) && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-[24px] bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-1">
                        <CheckCheck size={20} />
                    </div>
                    <p className="text-sm font-black text-emerald-600">Design Stage Completed</p>
                    <p className="text-[11px] font-medium text-emerald-600/60">
                        This job has successfully moved to the <span className="capitalize font-black">{jc.status?.replace(/_/g, ' ')}</span> stage.
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
}

// ── Store Tab ─────────────────────────────────────────────────────────────────

function StoreTab({ id, jc, qcClient, canEdit }: any) {
    const { data: sRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'store'], queryFn: () => apiGet(`/jobcards/${id}/store`) });
    const stage: any = (sRaw as any)?.data ?? null;

    const issueAllMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/store/issue-all`),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'store'] }); },
    });

    const issueOneMut = useMutation({
        mutationFn: (bomId: string) => apiPatch(`/jobcards/${id}/store/issue/${bomId}`, { issuedQty: 999 }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'store'] }),
    });

    if (isLoading) return <div className="h-48 bg-muted/10 rounded-3xl animate-pulse mt-4 border border-border/10" />;
    
    // Stage Empty State (Not even initiated)
    if (!stage) return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            className="mt-4 rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 p-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/5">
                <Package size={32} className="text-amber-500" />
            </div>
            <div className="max-w-md mx-auto">
                <p className="font-black text-xl text-foreground mb-2 uppercase tracking-tight">Store Stage Pending</p>
                <p className="text-muted-foreground/50 text-sm font-medium leading-relaxed">
                    Once the design is finalized and signed off, the Bill of Materials will appear here for material procurement and issuance.
                </p>
            </div>
        </motion.div>
    );

    const bom = stage.bom || [];
    const issuedCount = bom.filter((b: any) => b.issued).length;
    const progress = bom.length > 0 ? (issuedCount / bom.length) * 100 : 0;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 mt-4">
            {!canEdit && <ReadOnlyBanner />}

            {/* ── Store Stage Context ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="h-full rounded-[2.5rem] border border-amber-500/20 bg-linear-to-br from-amber-500/5 to-transparent p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[1.2rem] bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <Package size={18} className="text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 leading-none">Material Management</h3>
                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest mt-1">Inventory & Issuance</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-1">Status</p>
                                <span className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-widest',
                                    jc.status === 'in_store' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-lg shadow-amber-500/5' : 'bg-muted text-muted-foreground border-border'
                                )}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                    {jc.status?.replace(/_/g, ' ') || 'pending'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Target Delivery</p>
                                <p className={cn('text-sm font-black italic tracking-tight', !jc.expectedDelivery ? 'text-muted-foreground/20' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500 animate-pulse' : 'text-foreground/80')}>
                                    {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'NOT ASSIGNED'}
                                </p>
                            </div>
                            <AssignedStaffList users={jc.assignedTo?.store} roleLabel="Store Custodians" color="bg-amber-500" />
                            <div className="col-span-2 lg:col-span-1 border-t lg:border-t-0 lg:border-l border-border/10 pt-4 lg:pt-0 lg:pl-8">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 mb-2 text-right lg:text-left">Milestone Progress</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-muted/20 rounded-full overflow-hidden border border-border/5">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-linear-to-r from-amber-500 to-emerald-500 rounded-full shadow-lg" 
                                        />
                                    </div>
                                    <p className="text-[11px] font-black text-foreground/60 tracking-tighter w-12 text-right">{Math.round(progress)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="h-full rounded-[2rem] bg-card border border-border/40 p-6 flex flex-col justify-center gap-4 group/cta hover:border-primary/30 transition-all duration-500 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/cta:opacity-10 transition-opacity">
                            <ShoppingCart size={80} />
                        </div>
                        <h4 className="font-black text-sm uppercase tracking-widest text-foreground/80 relative z-10">Procurement Action</h4>
                        <p className="text-xs text-muted-foreground/60 font-medium leading-relaxed relative z-10">Shortage detected in BOM? Instantiate a purchase request directly linked to this job card.</p>
                        <Link to="/purchase-orders/new" className="relative z-10">
                            <Button variant="outline" className="w-full rounded-[1.2rem] h-12 font-black text-[10px] uppercase tracking-widest gap-2 bg-background border-border/60 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all active:scale-95 group/btn">
                                <Plus size={14} className="group-hover/btn:rotate-90 transition-transform duration-300" /> Raise Purchase Order
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── BOM List ── */}
            <div className="rounded-[2rem] bg-card/10 backdrop-blur-xl border border-border/20 overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-border/10 flex items-center justify-between bg-card/20">
                    <div className="flex items-center gap-3">
                        <ArrowRightCircle size={16} className="text-amber-500" />
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground/80">Bill of Materials</h3>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-muted/30 border border-border/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {bom.length} {bom.length === 1 ? 'Item' : 'Items'} Loaded
                    </div>
                </div>

                {bom.length > 0 ? (
                    <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/10 text-muted-foreground/40">
                                    <th className="text-left px-6 py-3 font-black uppercase tracking-[0.15em] w-1/3">Technical Detail</th>
                                    <th className="text-center px-4 py-3 font-black uppercase tracking-[0.15em]">Requirement</th>
                                    <th className="text-center px-4 py-3 font-black uppercase tracking-[0.15em]">Inventory Status</th>
                                    <th className="text-center px-4 py-3 font-black uppercase tracking-[0.15em]">Dispatch State</th>
                                    <th className="text-center px-6 py-3 font-black uppercase tracking-[0.15em] w-32">Operations</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {bom.map((b: any) => {
                                    const stockOk = (b.inventoryId?.currentStock ?? 0) >= (b.requiredQty || 0);
                                    return (
                                        <tr key={b._id} className="group hover:bg-amber-500/2 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-foreground/80 tracking-tight group-hover:text-amber-500 transition-colors">{b.inventoryId?.itemName || b.itemName}</p>
                                                    <p className="text-[10px] font-medium text-muted-foreground/50 italic">{b.inventoryId?.category || 'Standard Component'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-muted/20 border border-border/10 font-black text-foreground/70 tracking-tighter shadow-sm">
                                                    {b.requiredQty} <span className="ml-1 opacity-40">{b.unit}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={cn(
                                                        'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm',
                                                        stockOk ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20 animate-pulse'
                                                    )}>
                                                        {b.inventoryId?.currentStock ?? 0} {b.unit}
                                                    </span>
                                                    {!stockOk && (
                                                        <Link to={`/purchase-orders/new?itemName=${encodeURIComponent(b.inventoryId?.itemName || b.itemName)}`} 
                                                            className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500/60 hover:text-rose-500 uppercase tracking-tighter transition-all">
                                                            <ShoppingCart size={10} /> Fast Raise PO
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                {b.issued ? (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.15em] shadow-lg shadow-emerald-500/20">
                                                        <CheckSquare size={12} /> Issued
                                                    </div>
                                                ) : (
                                                    <div className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest opacity-30 italic",
                                                        stockOk ? "text-amber-500" : "text-rose-500"
                                                    )}>
                                                        {stockOk ? "Ready to Issue" : "Shortage Alert"}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {canEdit && !b.issued && (
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => issueOneMut.mutate(b._id)}
                                                        disabled={!stockOk}
                                                        className={cn(
                                                            "h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-6 shadow-sm transition-all active:scale-95",
                                                            stockOk ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10" : "bg-muted text-muted-foreground/30 opacity-50 cursor-not-allowed"
                                                        )}>
                                                        Issue
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-10">
                        <div className="w-16 h-16 rounded-[2rem] bg-muted/20 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                            <Package size={24} className="text-muted-foreground/20" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 italic">No Materials Specified Yet</p>
                    </div>
                )}

                {canEdit && jc.status === 'in_store' && (
                    <div className="p-8 border-t border-border/5 bg-card/30 flex justify-end">
                        <Button onClick={() => issueAllMut.mutate()} disabled={issueAllMut.isPending || bom.length === 0}
                            className="w-full lg:w-fit rounded-[1.2rem] h-14 px-12 font-black text-xs uppercase tracking-[0.15em] gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 active:scale-95 transition-all group/issue">
                            {issueAllMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCheck size={16} className="group-hover:scale-110 transition-transform" />}
                            Mark All Issued → Initiate Production
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Production Tab ────────────────────────────────────────────────────────────

function ProductionTab({ id, jc, qcClient, canEdit }: any) {
    const { data: pRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'production'], queryFn: () => apiGet(`/jobcards/${id}/production`) });
    const stage: any = (pRaw as any)?.data ?? null;
    const [note, setNote] = useState('');
    const [noteWorker, setNoteWorker] = useState('');

    const subStageMut = useMutation({
        mutationFn: ({ substage, status, workerName }: any) => apiPatch(`/jobcards/${id}/production/substage`, { substage, status, workerName }),
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
        mutationFn: (reason: string) => apiPatch(`/jobcards/${id}/production/shortage`, { reason }),
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

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[20px] border border-primary/20 bg-linear-to-br from-primary/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wrench size={14} className="text-primary" />
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-primary">Production Stage</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Expected Delivery</p>
                        <p className={cn('text-sm font-bold', !jc.expectedDelivery ? 'text-muted-foreground/40' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.production} roleLabel="Assigned Production Team" color="bg-primary" />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Stage Status</p>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wide',
                            jc.status === 'in_production' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {jc.status?.replace(/_/g, ' ') || 'pending'}
                        </span>
                    </div>
                </div>
            </motion.div>

            <SectionCard title="Production Stage" icon={Wrench} color="text-primary">
            <div className="space-y-5">
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${(doneCount / SUB_STAGE_ORDER.length) * 100}%` }} transition={{ duration: 0.5 }}
                            className="h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs font-black text-muted-foreground/60">{doneCount}/{SUB_STAGE_ORDER.length}</span>
                </div>

                {/* Substage cards */}
                <div className="grid grid-cols-2 gap-2">
                    {SUB_STAGE_ORDER.map((name, i) => {
                        const s = getSubstageStatus(name);
                        const Icon = SUB_STAGE_ICONS[name] || Wrench;
                        return (
                            <button key={name} onClick={canEdit ? () => cycleStatus(name, s.status) : undefined}
                                disabled={!canEdit}
                                className={cn('p-3 rounded-xl border text-left transition-all', {
                                    'opacity-60 cursor-default': !canEdit,
                                    'bg-muted/20 border-border/30 text-muted-foreground/50': s.status === 'pending',
                                    'bg-primary/10 border-primary/30 text-primary': s.status === 'in_progress',
                                    'bg-emerald-500/10 border-emerald-500/30 text-emerald-600': s.status === 'done',
                                })}>
                                <div className="flex items-center justify-between mb-1">
                                    <Icon size={12} />
                                    <span className={cn('text-[10px] font-black uppercase', {
                                        'text-muted-foreground/30': s.status === 'pending',
                                        'text-primary': s.status === 'in_progress',
                                        'text-emerald-500': s.status === 'done',
                                    })}>{s.status === 'done' ? '✓' : i + 1}</span>
                                </div>
                                <p className="text-[11px] font-black capitalize">{name.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] font-bold opacity-60 capitalize">{s.status.replace('_', ' ')}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Notes */}
                {canEdit && (
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
                {canEdit && jc.status === 'in_production' && doneCount === SUB_STAGE_ORDER.length && (
                    <Button onClick={() => doneMut.mutate()} disabled={doneMut.isPending}
                        className="w-full h-11 rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                        {doneMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                        Mark Production Complete → Move to QC
                    </Button>
                )}
                {canEdit && jc.status === 'in_production' && doneCount < SUB_STAGE_ORDER.length && (
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
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }); },
    });

    const failMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/qc/fail`),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] }); },
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage) return <EmptyStage name="QC Stage" />;

    const existingChecklist: Record<string, any> = {};
    stage.checklist?.forEach((c: any) => { existingChecklist[c.parameter] = c; });
    const merged = { ...existingChecklist, ...checklist };

    const allPassed = QC_PARAMETERS.every(p => merged[p]?.passed);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}

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

            <SectionCard title="Quality Control Inspection" icon={Shield} color="text-purple-500">
            <div className="space-y-5">
                {/* Verdict badge */}
                {stage.verdict && (
                    <div className={cn('flex items-center gap-2 px-4 py-3 rounded-xl font-black text-sm',
                        stage.verdict === 'pass' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20')}>
                        {stage.verdict === 'pass' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        QC {stage.verdict === 'pass' ? 'PASSED' : 'FAILED'}
                        {stage.reworkCount > 0 && <span className="ml-auto text-xs font-bold">Rework #{stage.reworkCount}</span>}
                    </div>
                )}

                {/* Checklist */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Inspection Checklist</p>
                    {QC_PARAMETERS.map(param => {
                        const val = merged[param];
                        return (
                            <div key={param} className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-border/20">
                                <button onClick={canEdit ? () => setChecklist(prev => ({ ...prev, [param]: { ...prev[param], passed: !val?.passed } })) : undefined}
                                    disabled={!canEdit}
                                    className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                                        val?.passed ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-primary',
                                        !canEdit && 'cursor-default opacity-70')}>
                                    {val?.passed && <CheckCheck size={12} className="text-white" />}
                                </button>
                                <div className="flex-1">
                                    <p className={cn('text-xs font-bold', val?.passed ? 'text-emerald-600 line-through decoration-emerald-300' : 'text-foreground/80')}>{param}</p>
                                    <input className="mt-1 w-full text-[10px] font-medium bg-transparent text-muted-foreground/50 outline-none placeholder:text-muted-foreground/20 border-b border-transparent focus:border-border/40"
                                        placeholder="Inspector note (optional)"
                                        value={checklist[param]?.notes ?? val?.notes ?? ''}
                                        onChange={e => setChecklist(prev => ({ ...prev, [param]: { ...prev[param], notes: e.target.value } }))} />
                                </div>
                            </div>
                        );
                    })}
                    {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => checkMut.mutate()} disabled={checkMut.isPending} className="w-full rounded-xl font-black text-xs">
                            {checkMut.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null} Save Checklist
                        </Button>
                    )}
                </div>

                {/* Upload defect photos */}
                {canEdit && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-muted-foreground/50 hover:text-primary transition">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                            if (!e.target.files?.length) return;
                            const fd = new FormData();
                            Array.from(e.target.files).forEach(f => fd.append('files', f));
                            await apiPost(`/jobcards/${id}/qc/defect-photos`, fd);
                            qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'qc'] });
                        }} />
                        <Camera size={13} /> Upload Defect Photos
                    </label>
                )}

                {/* Pass / Fail */}
                {canEdit && jc.status === 'qc_pending' && (
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
                {canEdit && jc.status === 'qc_pending' && !allPassed && (
                    <p className="text-center text-xs text-muted-foreground/30 font-bold">Check all parameters to enable QC Pass</p>
                )}

                {/* QC Certificate */}
                {stage.certificateURL && (
                    <a href={stage.certificateURL} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold hover:bg-emerald-500/20 transition">
                        <CheckCircle2 size={14} /> View QC Certificate PDF
                    </a>
                )}
            </div>
        </SectionCard>
        </motion.div>
    );
}

// ── Dispatch Tab ──────────────────────────────────────────────────────────────

function DispatchTab({ id, jc, qcClient, canEdit }: any) {
    const { data: dRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'dispatch'], queryFn: () => apiGet(`/jobcards/${id}/dispatch`) });
    const stage: any = (dRaw as any)?.data ?? null;

    const [form, setForm] = useState({ scheduledDate: '', timeSlot: 'morning', vehicleNo: '', driverName: '', driverPhone: '' });
    const [proofPhoto, setProofPhoto] = useState<File | null>(null);
    const [clientSignature, setClientSignature] = useState('');
    const [gpsLocation, setGpsLocation] = useState('');

    const scheduleMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/dispatch`, form),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'dispatch'] }); },
    });

    const deliverMut = useMutation({
        mutationFn: async () => {
            const fd = new FormData();
            if (proofPhoto) fd.append('files', proofPhoto);
            fd.append('clientSignature', clientSignature);
            fd.append('gpsLocation', gpsLocation);
            return apiPost(`/jobcards/${id}/dispatch/deliver`, fd);
        },
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'dispatch'] }); },
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage && jc.status !== 'qc_passed') return <EmptyStage name="Dispatch Stage" />;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {!canEdit && <ReadOnlyBanner />}

            {/* ── Context Banner ── */}
            <motion.div initial={{ y: -10 }} animate={{ y: 0 }}
                className="rounded-[20px] border border-cyan-500/20 bg-linear-to-br from-cyan-500/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Truck size={14} className="text-cyan-500" />
                    </div>
                    <h3 className="font-black text-xs uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Dispatch Stage</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Expected Delivery</p>
                        <p className={cn('text-sm font-bold', !jc.expectedDelivery ? 'text-muted-foreground/40' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                        </p>
                    </div>
                    <AssignedStaffList users={jc.assignedTo?.dispatch} roleLabel="Assigned Dispatch Team" color="bg-cyan-500" />
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Stage Status</p>
                        <span className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wide',
                            jc.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
                        )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {jc.status?.replace(/_/g, ' ') || 'pending'}
                        </span>
                    </div>
                </div>
            </motion.div>

            <SectionCard title="Dispatch Stage" icon={Truck} color="text-cyan-500">
            <div className="space-y-5">
                {stage?.scheduledDate && (
                    <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Scheduled Delivery</p>
                        <InfoRow label="Date" value={new Date(stage.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })} />
                        <InfoRow label="Time Slot" value={stage.timeSlot} />
                        <InfoRow label="Vehicle No." value={stage.deliveryTeam?.[0]?.vehicle?.number} />
                        <InfoRow label="Driver" value={stage.deliveryTeam?.[0]?.name} />
                        {stage.challanPDF && (
                            <a href={stage.challanPDF} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700 mt-2">
                                <ChevronRight size={12} /> View Delivery Challan PDF
                            </a>
                        )}
                    </div>
                )}

                {/* Schedule form — show when QC passed or already dispatched but not delivered */}
                {canEdit && ['qc_passed', 'dispatched'].includes(jc.status) && !stage?.deliveredAt && (
                    <div className="space-y-4 p-4 rounded-2xl bg-muted/10 border border-border/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                            {stage?.scheduledDate ? 'Update Schedule' : 'Schedule Delivery'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Delivery Date</Label>
                                <DatePicker 
                                    date={form.scheduledDate ? parseISO(form.scheduledDate) : undefined} 
                                    setDate={(date) => setForm(f => ({ ...f, scheduledDate: date ? format(date, 'yyyy-MM-dd') : '' }))} 
                                    className="h-10 border-border/40 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all font-bold" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Time Slot</Label>
                                <select value={form.timeSlot} onChange={e => setForm(f => ({ ...f, timeSlot: e.target.value }))}
                                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold">
                                    <option value="morning">Morning (9am–12pm)</option>
                                    <option value="afternoon">Afternoon (12pm–4pm)</option>
                                    <option value="evening">Evening (4pm–8pm)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Vehicle No.</Label>
                                <Input value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value }))} placeholder="MH12AB1234" className="rounded-xl h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Driver Name</Label>
                                <Input value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} className="rounded-xl h-10" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Driver Phone</Label>
                                <Input value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} className="rounded-xl h-10" />
                            </div>
                        </div>
                        <Button onClick={() => scheduleMut.mutate()} disabled={!form.scheduledDate || scheduleMut.isPending}
                            className="w-full rounded-xl font-black gap-2 h-10">
                            {scheduleMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
                            {stage?.scheduledDate ? 'Update Schedule' : 'Schedule Delivery'}
                        </Button>
                    </div>
                )}

                {/* Mark Delivered */}
                {canEdit && jc.status === 'dispatched' && !stage?.deliveredAt && (
                    <div className="space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Mark as Delivered</p>
                        <div className="space-y-2">
                            <Input value={clientSignature} onChange={e => setClientSignature(e.target.value)} placeholder="Client name / signature (text)" className="rounded-xl h-9 text-xs" />
                            <Input value={gpsLocation} onChange={e => setGpsLocation(e.target.value)} placeholder="GPS Location / Address" className="rounded-xl h-9 text-xs" />
                            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground/50 cursor-pointer hover:text-primary">
                                <input type="file" accept="image/*" className="hidden" onChange={e => setProofPhoto(e.target.files?.[0] ?? null)} />
                                <Camera size={13} /> {proofPhoto ? proofPhoto.name : 'Upload Proof of Delivery Photo'}
                            </label>
                        </div>
                        <Button onClick={() => deliverMut.mutate()} disabled={deliverMut.isPending || !clientSignature}
                            className="w-full rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white h-11">
                            {deliverMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                            Confirm Delivery
                        </Button>
                    </div>
                )}

                {/* Delivered state */}
                {stage?.deliveredAt && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                        <div>
                            <p className="font-black text-emerald-600 text-sm">Delivered!</p>
                            <p className="text-xs text-muted-foreground/60 font-medium">{new Date(stage.deliveredAt).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                )}

                {/* Activity log */}
                {jc.activityLog?.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Activity Log</p>
                        {jc.activityLog.slice(-5).reverse().map((a: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground/50">
                                <Clock size={10} className="mt-0.5 shrink-0" />
                                <span><span className="font-bold text-foreground/70">{a.action?.replace(/_/g, ' ')}</span> · {new Date(a.timestamp).toLocaleDateString('en-IN')}</span>
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

    const closeMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/close`, { warrantyNotes, punchListItems: punchList.split('\n').filter(Boolean) }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id] }),
        onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to close job card'),
    });

    const templateMut = useMutation({
        mutationFn: (name: string) => apiPatch(`/jobcards/${id}`, { isTemplate: true, templateName: name }),
        onSuccess: () => toast.success('Saved as template!'),
    });

    const isClosed = jc.status === 'closed';

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

                    <div className="bg-muted/10 rounded-2xl p-6 border border-border/40 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-black text-sm text-foreground">Final Stage Actions</h4>
                                <p className="text-xs text-muted-foreground/60 font-medium">Verify payment status and document before archiving.</p>
                            </div>
                            <div className="flex gap-3">
                                {!isClosed && (
                                    <Button
                                        onClick={() => {
                                            const name = prompt('Enter template name:');
                                            if (name) templateMut.mutate(name);
                                        }}
                                        variant="outline"
                                        className="rounded-xl font-black gap-2 h-11 border-border/60"
                                    >
                                        <Copy size={14} /> Save as Template
                                    </Button>
                                )}
                                <Button
                                    onClick={() => closeMut.mutate()}
                                    disabled={closeMut.isPending || isClosed || jc.status !== 'delivered'}
                                    className={cn(
                                        "rounded-xl font-black gap-2 h-11 px-8 shadow-lg transition-all",
                                        isClosed ? "bg-muted text-muted-foreground/30 shadow-none" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                                    )}
                                >
                                    {isClosed ? <ArchiveRestore size={14} /> : <CheckCircle2 size={14} />}
                                    {isClosed ? 'Job Card Archived' : 'Close & Archive Job Card'}
                                </Button>
                            </div>
                        </div>
                        {jc.status !== 'delivered' && !isClosed && (
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                <AlertCircle size={10} /> Job must be marked as 'Delivered' before it can be closed.
                            </p>
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
