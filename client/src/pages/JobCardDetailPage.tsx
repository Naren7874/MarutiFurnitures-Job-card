import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, downloadPdf, apiUpload } from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowLeft, AlertTriangle, Pencil, CheckCircle2, XCircle, Upload,
    Link2, Package, Loader2, ChevronRight, Clock, CheckCheck,
    Truck, Shield, Wrench, FlaskConical, TriangleAlert,
    CalendarCheck, MapPin, Camera, FileText, Users, MessageSquare, Download, PlusCircle
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { cn } from '../lib/utils';
import { ImagePreview } from '@/components/ui/image-preview';

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
    'cutting', 'edge_banding', 'cnc_drilling', 'assembly',
    'polishing', 'finishing', 'hardware_fitting', 'packing',
];

const SUB_STAGE_ICONS: Record<string, any> = {
    cutting: Wrench, edge_banding: Wrench, cnc_drilling: Wrench,
    assembly: Package, polishing: FlaskConical, finishing: FlaskConical,
    hardware_fitting: Wrench, packing: Package,
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
        <div className="mt-4 bg-white dark:bg-card/20 border border-border/30 rounded-2xl overflow-hidden shadow-sm">
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
    const { hasPermission } = useAuthStore();
    const canEditJC = hasPermission('jobcard.edit');
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
    ];
    const visibleTabs = ALL_TABS.filter(t => t.show);

    if (isLoading) {
        return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />)}</div>;
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            <Link to="/jobcards" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-bold">
                <ArrowLeft size={16} /> Back to Job Cards
            </Link>

            {/* Header Card */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-primary text-xs font-black tracking-widest uppercase">{jc.jobCardNumber}</p>
                        <h1 className="text-foreground text-2xl font-black mt-1 tracking-tight">{jc.title}</h1>
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
                        { label: 'Expect Del.', value: jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN') : '—' },
                        { label: 'Quotation', value: jc.quotationId?.quotationNumber ?? '—' },
                        { label: 'Created', value: jc.createdAt ? new Date(jc.createdAt).toLocaleDateString('en-IN') : '—' },
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

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ jc }: any) {
    return (
        <div className="space-y-6">
            <SectionCard title="Job Details & Items" icon={FileText} color="text-primary">
                {jc.items?.length > 0 ? (
                    <div className="rounded-xl border border-border/40 overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 font-black text-muted-foreground/60 uppercase tracking-widest w-12 text-center">#</th>
                                    <th className="px-4 py-3 font-black text-muted-foreground/60 uppercase tracking-widest">Description</th>
                                    <th className="px-4 py-3 font-black text-muted-foreground/60 uppercase tracking-widest text-center">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {jc.items.map((item: any) => (
                                    <tr key={item._id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-3 text-center font-bold text-muted-foreground/60">{item.srNo}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-4">
                                                {(item.photo || item.fabricPhoto) && (
                                                    <div className="flex gap-2 shrink-0">
                                                        {item.photo && (
                                                            <div className="w-14 h-14">
                                                                <ImagePreview src={item.photo} alt="Main" />
                                                            </div>
                                                        )}
                                                        {item.fabricPhoto && (
                                                            <div className="w-14 h-14">
                                                                <ImagePreview src={item.fabricPhoto} alt="Fabric" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-bold text-foreground text-sm">{item.description}</p>
                                                    {item.specifications && (
                                                        <div className="mt-1 flex flex-wrap gap-2">
                                                            {Object.entries(item.specifications).filter(([_, v]) => v).map(([k, v]) => (
                                                                <span key={k} className="text-[10px] font-bold text-muted-foreground/70 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40 capitalize">
                                                                    {k}: {String(v)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-black text-sm">{item.qty} {item.unit || 'pcs'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-muted-foreground/40 font-bold text-sm bg-muted/10 rounded-xl border border-dashed border-border/40">
                        No items found in this Job Card.
                    </div>
                )}
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionCard title="Team Assignment" icon={Users} color="text-indigo-500">
                    <div className="space-y-2">
                        <InfoRow label="Salesperson" value={jc.salesperson?.name || '—'} />
                        <InfoRow label="Created By" value={jc.createdBy?.name || '—'} />
                        {jc.assignedTo?.design?.length > 0 && <InfoRow label="Designers" value={jc.assignedTo.design.map((u: any) => u.name).join(', ')} />}
                        {jc.assignedTo?.production?.length > 0 && <InfoRow label="Production Team" value={jc.assignedTo.production.map((u: any) => u.name).join(', ')} />}
                        {jc.assignedTo?.qc?.length > 0 && <InfoRow label="QC Team" value={jc.assignedTo.qc.map((u: any) => u.name).join(', ')} />}
                    </div>
                </SectionCard>

                <SectionCard title="Communications" icon={MessageSquare} color="text-emerald-500">
                    <div className="space-y-4">
                        {jc.whatsapp?.groupLink ? (
                            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">WhatsApp Group</p>
                                <p className="font-bold text-sm text-foreground/80 mb-2">{jc.whatsapp.groupName}</p>
                                <a href={jc.whatsapp.groupLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors">
                                    <Link2 size={12} /> Join / Open Group
                                </a>
                            </div>
                        ) : (
                            <div className="p-4 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-center">
                                <p className="text-xs font-bold text-muted-foreground/50">No WhatsApp group linked.</p>
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            <SectionCard title="Activity Timeline" icon={Clock} color="text-slate-500">
                {jc.activityLog?.length > 0 ? (
                    <div className="space-y-4 pt-2">
                        {jc.activityLog.slice().reverse().map((log: any, i: number) => (
                            <div key={i} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 mt-1" />
                                    {i !== jc.activityLog.length - 1 && <div className="w-px h-full bg-border/40 my-1" />}
                                </div>
                                <div className="pb-4">
                                    <p className="text-sm font-bold text-foreground">
                                        <span className="capitalize">{log.action?.replace(/_/g, ' ')}</span>
                                        {log.doneByName && <span className="text-muted-foreground/60 font-medium text-xs ml-1"> by {log.doneByName}</span>}
                                    </p>
                                    <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest mt-0.5">
                                        {new Date(log.timestamp).toLocaleString('en-IN', {
                                            day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true
                                        })}
                                    </p>
                                    {log.note && <p className="text-xs font-bold text-slate-500 bg-slate-500/10 p-2.5 rounded-xl mt-2 border border-slate-500/20 relative w-fit"><span className="absolute -top-1.5 left-4 text-slate-500/20">"</span>{log.note}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs font-bold text-muted-foreground/50 py-4 text-center">No activity recorded yet.</p>
                )}
            </SectionCard>
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

function DesignTab({ id, jc, qcClient, canEdit }: any) {
    const { data: dRaw, isLoading } = useQuery({ queryKey: ['jobcard', id, 'design'], queryFn: () => apiGet(`/jobcards/${id}/design`) });
    const design: any = (dRaw as any)?.data ?? null;
    const [note, setNote] = useState('');

    const createMut = useMutation({ mutationFn: () => apiPost(`/jobcards/${id}/design`, {}), onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }) });
    const signoffMut = useMutation({ mutationFn: () => apiPost(`/jobcards/${id}/design/signoff`, {}), onSuccess: () => qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }) });
    const readyMut = useMutation({ mutationFn: () => apiPatch(`/jobcards/${id}/design/ready`), onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['jobcard', id] }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }); } });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;

    if (!design) return (
        <SectionCard title="Design Stage" icon={Pencil} color="text-blue-500">
            {!canEdit && <ReadOnlyBanner />}
            <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground/40 text-sm font-bold">Design stage not started yet</p>
                {canEdit && (
                    <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="rounded-xl font-black gap-2">
                        {createMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Initiate Design Stage
                    </Button>
                )}
            </div>
        </SectionCard>
    );

    return (
        <SectionCard title="Design Stage" icon={Pencil} color="text-blue-500">
            {!canEdit && <ReadOnlyBanner />}
            <div className="space-y-6">
                {/* Files */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Design Files ({design.files?.length || 0})</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {design.files?.map((f: any, i: number) => (
                            <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition text-xs font-bold text-foreground/70">
                                <Upload size={12} className="text-primary" /> {f.title || `File ${i + 1}`}
                            </a>
                        ))}
                    </div>
                    {canEdit && (
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-muted-foreground/50 hover:text-primary transition">
                            <input type="file" multiple className="hidden" onChange={async (e) => {
                                if (!e.target.files?.length) return;
                                const fd = new FormData();
                                Array.from(e.target.files).forEach(f => fd.append('files', f));
                                await apiPost(`/jobcards/${id}/design/files`, fd);
                                qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] });
                            }} />
                            <Upload size={13} /> Upload CAD / Renders / PDFs
                        </label>
                    )}
                </div>

                {/* Signoff */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Client Sign-off</p>
                            <p className="text-sm font-bold text-foreground/70 mt-0.5">{design.signoff?.status || 'Not sent'}</p>
                        </div>
                        {design.signoff?.status === 'approved' ? (
                            <span className="flex items-center gap-1 text-emerald-500 text-xs font-black"><CheckCircle2 size={14} /> Approved</span>
                        ) : design.signoff?.status === 'rejected' ? (
                            <span className="flex items-center gap-1 text-rose-500 text-xs font-black"><XCircle size={14} /> Rejected</span>
                        ) : canEdit ? (
                            <Button size="sm" variant="outline" onClick={() => signoffMut.mutate()} disabled={signoffMut.isPending}
                                className="rounded-xl text-xs font-black gap-1.5 border-border/60">
                                {signoffMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Send Link
                            </Button>
                        ) : null}
                    </div>
                    {signoffMut.isSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600">
                            Sign-off link sent! The client will receive it via WhatsApp/email.
                        </div>
                    )}
                    {design.signoff?.remarks && <p className="text-xs text-muted-foreground/60 italic">"{design.signoff.remarks}"</p>}
                </div>

                {/* Measurements / notes */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Designer Notes</p>
                    <Textarea value={note || design.designerNotes || ''} onChange={canEdit ? (e => setNote(e.target.value)) : undefined}
                        readOnly={!canEdit} rows={3} className="rounded-xl text-sm" placeholder="Add design notes, material specs, instructions…" />
                    {canEdit && (
                        <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs font-black"
                            onClick={() => { apiPut(`/jobcards/${id}/design`, { designerNotes: note }); qcClient.invalidateQueries({ queryKey: ['jobcard', id, 'design'] }); }}>
                            Save Notes
                        </Button>
                    )}
                </div>

                {/* Mark Ready */}
                {canEdit && jc.status === 'active' && (
                    <Button onClick={() => readyMut.mutate()} disabled={readyMut.isPending}
                        className="w-full h-11 rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                        {readyMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                        Mark Design Ready → Move to Store
                    </Button>
                )}
            </div>
        </SectionCard>
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

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;
    if (!stage) return <EmptyStage name="Store Stage" />;

    const bom = stage.bom || [];
    const issuedCount = bom.filter((b: any) => b.issued).length;

    return (
        <SectionCard title="Store Stage — Bill of Materials" icon={Package} color="text-amber-500">
            <div className="space-y-4">
                {/* BOM Progress */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-black text-foreground/60">{issuedCount} / {bom.length} materials issued</p>
                    <div className="w-48 h-2 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${bom.length > 0 ? (issuedCount / bom.length) * 100 : 0}%` }} />
                    </div>
                </div>

                {/* BOM Table */}
                {bom.length > 0 ? (
                    <div className="rounded-xl border border-border/30 overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-black text-muted-foreground/50 uppercase tracking-wider">Material</th>
                                    <th className="text-center px-4 py-2.5 font-black text-muted-foreground/50 uppercase tracking-wider">Required</th>
                                    <th className="text-center px-4 py-2.5 font-black text-muted-foreground/50 uppercase tracking-wider">In Stock</th>
                                    <th className="text-center px-4 py-2.5 font-black text-muted-foreground/50 uppercase tracking-wider">Status</th>
                                    <th className="text-center px-4 py-2.5 font-black text-muted-foreground/50 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bom.map((b: any) => {
                                    const stockOk = (b.inventoryId?.currentStock ?? 0) >= b.requiredQty;
                                    return (
                                        <tr key={b._id} className="border-t border-border/20 hover:bg-muted/10">
                                            <td className="px-4 py-3 font-bold text-foreground/80">{b.inventoryId?.itemName || b.itemName}</td>
                                            <td className="px-4 py-3 text-center font-bold">{b.requiredQty} {b.unit}</td>
                                            <td className={cn('px-4 py-3 text-center font-black', stockOk ? 'text-emerald-500' : 'text-rose-500')}>
                                                {b.inventoryId?.currentStock ?? '?'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {b.issued ? (
                                                    <span className="text-emerald-500 font-black flex items-center justify-center gap-1"><CheckCircle2 size={12} /> Issued</span>
                                                ) : (
                                                    <span className="text-muted-foreground/40 font-bold">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {canEdit && !b.issued && (
                                                    <button onClick={() => issueOneMut.mutate(b._id)}
                                                        className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black hover:bg-primary/20 transition">
                                                        Issue
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground/30 text-sm font-bold py-6">No BOM items added yet</p>
                )}

                {canEdit && (
                    <div className="flex gap-3 pt-2">
                        <Link to="/purchase-orders/new">
                            <Button variant="outline" className="rounded-xl font-black gap-2 border-border/60 text-xs">
                                <Package size={13} /> Raise Purchase Order
                            </Button>
                        </Link>
                        {jc.status === 'in_store' && (
                            <Button onClick={() => issueAllMut.mutate()} disabled={issueAllMut.isPending || bom.length === 0}
                                className="flex-1 rounded-xl font-black gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
                                {issueAllMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                                Issue All → Move to Production
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </SectionCard>
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
                            <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/20">
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
                                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} className="rounded-xl h-10" />
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
    );
}

// ── EmptyStage ────────────────────────────────────────────────────────────────

function EmptyStage({ name }: { name: string }) {
    return (
        <div className="mt-4 bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-12 text-center">
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
    const [items, setItems] = useState<any[]>(jc.items ? JSON.parse(JSON.stringify(jc.items)) : []);

    const updateMut = useMutation({
        mutationFn: () => apiPut(`/jobcards/${jc._id}`, { title, priority, expectedDelivery, items }),
        onSuccess,
    });

    const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit: 'pcs', srNo: prev.length + 1 }]);
    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            if (!newItems[index]) return prev;
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };
    const removeItem = (index: number) => {
        setItems(prev => {
            const newItems = prev.filter((_, i) => i !== index);
            return newItems.map((it, i) => ({ ...it, srNo: i + 1 }));
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
                            <Input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} className="h-12 rounded-xl" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Furniture Items</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 rounded-lg text-xs font-bold gap-2">
                                <PlusCircle size={14} /> Add Item
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 rounded-xl border border-border/40 bg-muted/10 relative group">
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
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                                    >
                                        <XCircle size={14} />
                                    </button>
                                </div>
                            ))}
                            {items.length === 0 && (
                                <div className="p-8 border-2 border-dashed border-border/40 text-center rounded-2xl flex flex-col items-center">
                                    <Package size={24} className="text-muted-foreground/30 mb-2" />
                                    <p className="text-xs font-bold text-muted-foreground/50">No items specified.</p>
                                </div>
                            )}
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
