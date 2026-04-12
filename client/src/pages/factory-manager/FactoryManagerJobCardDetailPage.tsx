import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import {
    ArrowLeft, AlertTriangle, Wrench, Shield, Package, Loader2, Clock,
    Truck, Users, MessageSquare, ShieldCheck, Zap, Maximize2, Fingerprint,
    Wind, History, Archive, Sparkles, EyeOff, Camera,
    CheckCircle2, XCircle, User, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { ImagePreview } from '@/components/ui/image-preview';
import { HoldBanner } from '@/components/ui/HoldBanner';

// ── Status config ─────────────────────────────────────────────────────────────

const JOB_STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_production: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    qc_pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    qc_passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    qc_failed: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dispatched: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

const SUB_STAGE_ORDER = [
    'cutting', 'edge_banding', 'cnc_drilling', 'assembly',
    'polishing', 'finishing', 'hardware_fitting', 'packing',
];

const SUB_STAGE_LABELS: Record<string, string> = {
    cutting: 'Cutting', edge_banding: 'Edge Banding', cnc_drilling: 'CNC Drilling',
    assembly: 'Assembly', polishing: 'Polishing', finishing: 'Finishing',
    hardware_fitting: 'Hardware Fitting', packing: 'Packing',
};

const SUB_STAGE_ICONS: Record<string, any> = {
    cutting: Wrench, edge_banding: Wind, cnc_drilling: Zap,
    assembly: Package, polishing: ShieldCheck, finishing: Sparkles,
    hardware_fitting: Wrench, packing: Archive,
};

function SectionCard({ title, icon: Icon, color = 'text-foreground', children }: any) {
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

function MiniStaffBlock({ users, label, icon: Icon }: { users: any[]; label: string; icon: any }) {
    const list = Array.isArray(users) ? users : users ? [users] : [];
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-foreground/30" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">{label}</p>
            </div>
            {list.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {list.map((u: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-orange-500/5 text-orange-500/80 text-[9px] font-black tracking-tight uppercase border border-orange-500/10">
                            {u.name || 'Unknown'}
                        </span>
                    ))}
                </div>
            ) : (
                <p className="text-[9px] text-muted-foreground/20 italic uppercase font-bold">Unassigned</p>
            )}
        </div>
    );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ jc }: { jc: any }) {
    const item = jc.items?.[0];
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-8">
            {(jc.status === 'on_hold' || jc.quotationId?.status === 'on_hold') && (
                <div className="md:col-span-12">
                    <HoldBanner 
                        entityType={jc.status === 'on_hold' ? "Job Card" : "Quotation"} 
                        reason={jc.status === 'on_hold' ? jc.onHoldReason : jc.quotationId?.onHoldReason} 
                        onAt={jc.status === 'on_hold' ? jc.onHoldAt : jc.quotationId?.onHoldAt} 
                    />
                </div>
            )}
            {/* Hero */}
            <div className="md:col-span-12">
                <div className="bg-card dark:bg-card/20 border border-border/20 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row shadow-xl min-h-[400px]">
                    <div className="lg:w-[35%] relative min-h-[320px] lg:h-auto overflow-hidden bg-muted/20 border-r border-border/10 flex flex-col">
                        {item?.photo ? (
                            <div className="w-full h-full">
                                <ImagePreview src={item.photo} alt="Item" />
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/10">
                                <Package size={80} strokeWidth={0.5} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3">Visual Pending</p>
                            </div>
                        )}
                    </div>
                    <div className="lg:w-[65%] p-10 flex flex-col">
                        <div className="mb-8">
                            <h1 className="text-3xl font-black text-foreground tracking-tight leading-tight mb-2 uppercase">
                                {item?.category || 'No Category'}
                            </h1>
                            <h2 className="text-lg font-bold text-foreground/60 tracking-tight mb-5">
                                {item?.description || jc.title}
                            </h2>
                        </div>
                        <div className="mt-auto pt-6 border-t border-border/10 grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Dimensions</p>
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                    <Maximize2 size={13} className="text-blue-500/60" />
                                    <p className="text-sm font-black text-foreground/90 italic">{item?.specifications?.size || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Quantity</p>
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                                    <Package size={13} className="text-orange-500/60" />
                                    <p className="text-sm font-black text-foreground/90 uppercase">{item?.qty} {item?.unit || 'PCS'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Material</p>
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                                    <Fingerprint size={13} className="text-amber-500/60" />
                                    <p className="text-[11px] font-black text-foreground/70 uppercase">{item?.specifications?.material || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Finish</p>
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                    <Wind size={13} className="text-emerald-500/60" />
                                    <p className="text-[11px] font-black text-foreground/70 uppercase">{item?.specifications?.polish || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Personnel */}
            <div className="md:col-span-6">
                <div className="h-full bg-card/20 border border-border/10 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20"><Users size={18} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-wide text-foreground">Team</h4>
                            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Assignments</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <MiniStaffBlock users={jc.assignedTo?.production} label="Factory" icon={Wrench} />
                        <MiniStaffBlock users={jc.assignedTo?.qc} label="Quality" icon={ShieldCheck} />
                        <MiniStaffBlock users={jc.assignedTo?.dispatch} label="Dispatch" icon={Truck} />
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <User size={11} className="text-foreground/30" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">Sales Lead</p>
                            </div>
                            <p className="text-[11px] font-black text-foreground/70 uppercase">{jc.salesperson?.name || 'Unassigned'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* WhatsApp */}
            <div className="md:col-span-6">
                <div className="h-full bg-card/20 border border-emerald-500/10 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><MessageSquare size={18} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-wide text-foreground">WhatsApp Group</h4>
                            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Project Channel</p>
                        </div>
                    </div>
                    {jc.whatsapp?.groupLink ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center space-y-4">
                            <p className="text-lg font-black text-foreground/80 tracking-tight uppercase">{jc.whatsapp.groupName}</p>
                            <a href={jc.whatsapp.groupLink} target="_blank" rel="noreferrer"
                                className="inline-flex items-center justify-center w-full gap-2 text-[11px] font-black text-white bg-emerald-500 hover:bg-emerald-600 h-12 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 uppercase tracking-widest">
                                <Zap size={14} className="fill-current" /> Join Channel
                            </a>
                        </div>
                    ) : (
                        <div className="py-12 border border-dashed border-emerald-500/10 rounded-2xl flex flex-col items-center justify-center text-center px-8">
                            <EyeOff size={28} className="text-emerald-500/10 mb-2" />
                            <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em]">Channel Not Assigned</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reference photos */}
            {(item?.fabricPhoto || item?.photos?.length > 0) && (
                <div className="md:col-span-12">
                    <div className="bg-card/20 border border-border/10 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20"><Camera size={18} /></div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wide">Visual Archive</h4>
                                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">Reference Photos</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            {item?.fabricPhoto && (
                                <div className="space-y-2">
                                    <div className="aspect-square rounded-2xl overflow-hidden border border-border/20 bg-muted/20">
                                        <ImagePreview src={item.fabricPhoto} alt="Fabric" />
                                    </div>
                                    <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Fabric Ref</p>
                                </div>
                            )}
                            {item?.photos?.map((url: string, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="aspect-square rounded-2xl overflow-hidden border border-border/20 bg-muted/20">
                                        <ImagePreview src={url} alt={`Ref ${i + 1}`} />
                                    </div>
                                    <p className="text-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Ref #{i + 1}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Log */}
            <div className="md:col-span-12">
                <div className="bg-card/20 border border-border/10 rounded-[2.5rem] p-8 shadow-sm max-h-[350px] overflow-hidden flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-2xl bg-slate-500/5 text-slate-500/50 border border-slate-500/10"><Clock size={16} /></div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-wide">Activity Log</h4>
                            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest">History</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {jc.activityLog?.length > 0 ? jc.activityLog.slice().reverse().map((log: any, i: number) => (
                            <div key={log.timestamp || i} className="flex gap-3 p-3 bg-background/30 border border-border/5 rounded-xl">
                                <div className="w-2 h-2 rounded-full bg-orange-500/30 mt-1.5 shrink-0" />
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <p className="text-xs font-black text-foreground/80 uppercase tracking-tight">{log.action?.replace(/_/g, ' ')}</p>
                                    <div className="flex items-center gap-3 opacity-30">
                                        <p className="text-[8px] font-black uppercase tracking-widest">{log.doneByName || 'System'}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest">
                                            {new Date(log.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/10 rounded-2xl">
                                <History size={28} className="text-muted-foreground/10" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Production Tab (Full access) ──────────────────────────────────────────────

function ProductionTab({ id, jc, qcClient }: any) {
    const { data: pRaw, isLoading } = useQuery({
        queryKey: ['fm-production', id],
        queryFn: () => apiGet(`/jobcards/${id}/production`),
        enabled: !!id,
    });
    const { data: qRaw } = useQuery({
        queryKey: ['fm-qc', id],
        queryFn: () => apiGet(`/jobcards/${id}/qc`),
        enabled: !!id,
    });
    const stage: any = (pRaw as any)?.data ?? null;
    const qcStage: any = (qRaw as any)?.data ?? null;

    const [note, setNote] = useState('');
    const [noteWorker, setNoteWorker] = useState('');

    const isLocked = !['in_production', 'qc_failed'].includes(jc.status);

    const lastRework = qcStage?.reworkHistory?.[qcStage.reworkHistory.length - 1];
    const showReworkAlert = (jc.status === 'in_production' || jc.status === 'qc_failed') && qcStage?.verdict === 'fail';

    const startMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/production/start`, {}),
        onSuccess: () => { qcClient.invalidateQueries({ queryKey: ['fm-jc', id] }); toast.success('Production started!'); },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to start production'),
    });

    const subStageMut = useMutation({
        mutationFn: ({ name, status, workerName }: any) =>
            apiPatch(`/jobcards/${id}/production/substage`, { name, status, workerName }),
        onSuccess: () => qcClient.invalidateQueries({ queryKey: ['fm-production', id] }),
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update substage'),
    });

    const noteMut = useMutation({
        mutationFn: () => apiPost(`/jobcards/${id}/production/note`, { note, workerName: noteWorker }),
        onSuccess: () => {
            qcClient.invalidateQueries({ queryKey: ['fm-production', id] });
            setNote(''); setNoteWorker('');
            toast.success('Note added!');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add note'),
    });

    const doneMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/production/done`),
        onSuccess: () => {
            qcClient.invalidateQueries({ queryKey: ['fm-jc', id] });
            qcClient.invalidateQueries({ queryKey: ['fm-production', id] });
            toast.success('Production complete — sent to QC!');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to complete production'),
    });


    const resetMut = useMutation({
        mutationFn: () => apiPatch(`/jobcards/${id}/production/reset`, {}),
        onSuccess: () => {
            qcClient.invalidateQueries({ queryKey: ['fm-production', id] });
            toast.success('Production reset — You can now start rework!');
        },
        onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to reset production'),
    });

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;

    if (jc.status === 'active') {
        return (
            <div className="mt-4 flex flex-col items-center justify-center py-16 gap-6">
                <div className="w-20 h-20 rounded-3xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                    <Wrench size={40} className="text-orange-500/40" />
                </div>
                <div className="text-center">
                    <p className="text-foreground font-black text-lg mb-2">Ready to Start</p>
                    <p className="text-muted-foreground/50 text-sm mb-6">Click below to begin production on this job card</p>
                    <Button
                        onClick={() => startMut.mutate()}
                        disabled={startMut.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-orange-500/20"
                    >
                        {startMut.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Wrench size={16} className="mr-2" />}
                        Start Production
                    </Button>
                </div>
            </div>
        );
    }

    if (!stage) return (
        <div className="mt-4 p-8 text-center text-muted-foreground/40 text-sm font-bold">
            Production stage not yet initialized.
        </div>
    );

    const substages: any[] = stage.substages || [];
    const doneCount = substages.filter((s: any) => s.status === 'done').length;
    const allDone = doneCount === SUB_STAGE_ORDER.length;

    const getSubstage = (name: string) => substages.find((s: any) => s.name === name) ?? { name, status: 'pending' };

    const cycleStatus = (name: string, current: string) => {
        if (isLocked) return;
        const order = ['pending', 'in_progress', 'done'];
        const next = order[(order.indexOf(current) + 1) % order.length];
        subStageMut.mutate({ name, status: next, workerName: '' });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">

            {/* Rework Alert */}
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
                                <h3 className="text-xl font-black text-rose-600 tracking-tight">Rework Blueprint · Attempt #{qcStage.reworkCount}</h3>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-rose-500/20 text-rose-600 border-rose-500/30 text-[10px] font-black py-1 px-4 rounded-full animate-pulse uppercase tracking-widest">
                            QC Failed
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
                        {/* Primary Reason */}
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
                        {qcStage.defectPhotos?.length > 0 && (
                            <div className="space-y-2">
                                <div className="p-5 rounded-2xl bg-white/40 dark:bg-black/20 border border-rose-500/20 shadow-sm h-full">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/40 mb-3 flex items-center gap-2">
                                        <Camera size={12} /> Visual Evidence
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {qcStage.defectPhotos.map((photo: any, i: number) => (
                                            <div key={i} className="group/photo relative aspect-square rounded-xl overflow-hidden border border-rose-500/20 bg-muted/20">
                                                <ImagePreview src={photo.url} alt={`Defect ${i + 1}`} />
                                                {photo.annotation && (
                                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 backdrop-blur-md opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                                        <p className="text-[8px] font-black text-white uppercase tracking-tighter truncate">{photo.annotation}</p>
                                                    </div>
                                                )}
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
                        {doneCount > 0 && (
                            <Button
                                onClick={() => resetMut.mutate()}
                                disabled={resetMut.isPending}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black px-6 h-11 rounded-xl shadow-lg shadow-rose-600/20 border-none uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                            >
                                {resetMut.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Zap size={14} className="mr-2 fill-current" />}
                                Acknowledge & Start Rework
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Locked banner */}
            {isLocked && jc.status !== 'active' && (
                <div className="mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 text-xs font-bold">
                    <History size={13} />
                    Stage Locked — Job Card is currently {jc.status?.replace(/_/g, ' ')}
                </div>
            )}


            {/* Stage context banner */}
            <div className="rounded-[24px] border border-orange-500/20 bg-linear-to-br from-orange-500/10 via-background to-background p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Wrench size={18} className="text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-orange-500/60 leading-none mb-1">Production Stage</h3>
                        <p className="font-bold text-lg text-foreground tracking-tight">Manufacturing Phase</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Expected Delivery</p>
                        <p className={cn('text-sm font-black', !jc.expectedDelivery ? 'text-muted-foreground/30 italic' : new Date(jc.expectedDelivery) < new Date() ? 'text-rose-500' : 'text-foreground')}>
                            {jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Progress</p>
                        <p className="text-sm font-black text-orange-500">{doneCount} / {SUB_STAGE_ORDER.length} substages</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Status</p>
                        <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest',
                            jc.status === 'in_production' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-muted/30 text-muted-foreground border-border/30'
                        )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full bg-current', jc.status === 'in_production' && 'animate-pulse')} />
                            {jc.status?.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="px-2">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/50">Overall Progress</p>
                    <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                        {Math.round((doneCount / SUB_STAGE_ORDER.length) * 100)}%
                    </span>
                </div>
                <div className="h-3 bg-muted/30 rounded-full overflow-hidden border border-border/5 p-px">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(doneCount / SUB_STAGE_ORDER.length) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-linear-to-r from-orange-500 to-amber-400 rounded-full"
                    />
                </div>
            </div>

            {/* Substage cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUB_STAGE_ORDER.map((name) => {
                    const sub = getSubstage(name);
                    const Icon = SUB_STAGE_ICONS[name] || Wrench;
                    const isDone = sub.status === 'done';
                    const inProgress = sub.status === 'in_progress';
                    const canClick = !isLocked;

                    return (
                        <motion.div key={name} whileHover={canClick ? { y: -2 } : {}}>
                            <div
                                onClick={() => canClick && cycleStatus(name, sub.status)}
                                className={cn(
                                    'p-4 rounded-2xl border transition-all relative overflow-hidden',
                                    canClick ? 'cursor-pointer' : 'cursor-default',
                                    isDone ? 'bg-emerald-500/10 border-emerald-500/30' :
                                        inProgress ? 'bg-orange-500/10 border-orange-500/30' :
                                            'bg-muted/20 border-border/20 hover:border-border/40'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                        isDone ? 'bg-emerald-500/20 text-emerald-500' :
                                            inProgress ? 'bg-orange-500/20 text-orange-500' :
                                                'bg-muted/30 text-muted-foreground/30'
                                    )}>
                                        {isDone ? <CheckCircle2 size={20} /> : inProgress ? <Icon size={18} className="animate-pulse" /> : <Icon size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn('text-sm font-black uppercase tracking-tight',
                                            isDone ? 'text-emerald-600 dark:text-emerald-400' :
                                                inProgress ? 'text-orange-500' : 'text-foreground/50'
                                        )}>
                                            {SUB_STAGE_LABELS[name]}
                                        </p>
                                        {sub.workerName && <p className="text-[10px] text-muted-foreground/40 font-medium">{sub.workerName}</p>}
                                    </div>
                                    <Badge variant="outline" className={cn('text-[9px] font-black uppercase shrink-0',
                                        isDone ? 'border-emerald-500/30 text-emerald-500' :
                                            inProgress ? 'border-orange-500/30 text-orange-500' :
                                                'border-border/30 text-muted-foreground/40'
                                    )}>
                                        {sub.status?.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                                {canClick && !isDone && (
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/20 mt-2 pl-1">Tap to advance</p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Worker name for substage */}
            {!isLocked && (
                <SectionCard title="Substage Worker Name" icon={User} color="text-foreground/60">
                    <div className="flex gap-3">
                        <input
                            placeholder="Enter worker name (optional)"
                            className="flex-1 h-9 px-3 rounded-xl bg-muted/20 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-orange-500/50"
                            onChange={e => setNoteWorker(e.target.value)}
                            value={noteWorker}
                        />
                    </div>
                </SectionCard>
            )}

            {/* Progress notes */}
            <SectionCard title="Progress Notes" icon={MessageSquare} color="text-foreground/60">
                <div className="space-y-4">
                    {stage.progressNotes?.length > 0 && (
                        <div className="space-y-2">
                            {stage.progressNotes.slice().reverse().map((n: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-muted/10 border border-border/10">
                                    <p className="text-xs font-medium text-foreground/80 leading-relaxed">{n.note}</p>
                                    <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mt-1">
                                        {new Date(n.addedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                    {!isLocked && (
                        <div className="space-y-2">
                            <Textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Add a progress note…"
                                className="rounded-xl bg-muted/10 border-border/30 text-sm resize-none"
                                rows={3}
                            />
                            <Button
                                onClick={() => note.trim() && noteMut.mutate()}
                                disabled={!note.trim() || noteMut.isPending}
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl"
                            >
                                {noteMut.isPending ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : null}
                                Add Note
                            </Button>
                        </div>
                    )}
                </div>
            </SectionCard>


            {/* Mark Done */}
            {!isLocked && allDone && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={28} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="font-black text-emerald-600 text-lg">All Substages Complete!</p>
                            <p className="text-muted-foreground/50 text-sm mt-1">Mark production done to send this job card to Quality Control.</p>
                        </div>
                        <Button
                            onClick={() => doneMut.mutate()}
                            disabled={doneMut.isPending}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-8 h-12 rounded-2xl shadow-lg shadow-emerald-500/20"
                        >
                            {doneMut.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
                            Mark Production Complete → Send to QC
                        </Button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

// ── QC Tab (Read-only for factory manager) ───────────────────────────────────

function QCReadOnlyTab({ id }: { id: string }) {
    const { data: qRaw, isLoading } = useQuery({
        queryKey: ['fm-qc', id],
        queryFn: () => apiGet(`/jobcards/${id}/qc`),
        enabled: !!id,
    });
    const qcStage: any = (qRaw as any)?.data ?? null;

    if (isLoading) return <div className="h-32 bg-muted/20 rounded-2xl animate-pulse mt-4" />;

    if (!qcStage) {
        return (
            <div className="mt-4 flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-3xl bg-muted/20 flex items-center justify-center">
                    <Shield size={32} className="text-muted-foreground/20" />
                </div>
                <p className="text-muted-foreground/30 text-sm font-bold uppercase tracking-widest">
                    QC not yet started
                </p>
                <p className="text-muted-foreground/20 text-xs text-center max-w-xs">
                    QC inspection will begin once production is marked complete.
                </p>
            </div>
        );
    }

    const isPassed = qcStage.verdict === 'pass';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-2">
            {/* Read-only notice */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold">
                <Shield size={13} />
                View only — QC is managed by the Quality Control team
            </div>

            {/* Verdict */}
            {qcStage.verdict && (
                <div className={cn(
                    'p-6 rounded-[22px] border text-center',
                    isPassed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                )}>
                    <div className={cn('w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-4',
                        isPassed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                    )}>
                        {isPassed ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
                    </div>
                    <p className={cn('text-2xl font-black uppercase tracking-wide',
                        isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                        QC {qcStage.verdict === 'pass' ? 'Passed' : 'Failed'}
                    </p>
                    <p className="text-muted-foreground/40 text-xs font-medium mt-1">
                        Inspected {qcStage.inspectedAt ? new Date(qcStage.inspectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </p>
                </div>
            )}

            {/* Checklist (read-only) */}
            {qcStage.checklist?.length > 0 && (
                <SectionCard title="Inspection Checklist" icon={Shield} color="text-foreground/60">
                    <div className="space-y-3">
                        {qcStage.checklist.map((item: any, i: number) => (
                            <div key={i} className={cn('p-4 rounded-xl border flex items-start gap-3',
                                item.passed === true ? 'bg-emerald-500/5 border-emerald-500/20' :
                                    item.passed === false ? 'bg-rose-500/5 border-rose-500/20' :
                                        'bg-muted/10 border-border/20'
                            )}>
                                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                    item.passed === true ? 'bg-emerald-500/20 text-emerald-500' :
                                        item.passed === false ? 'bg-rose-500/20 text-rose-500' : 'bg-muted/30 text-muted-foreground/30'
                                )}>
                                    {item.passed === true ? <CheckCircle2 size={14} /> : item.passed === false ? <XCircle size={14} /> : <Shield size={14} />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-foreground/80">{item.parameter}</p>
                                    {item.notes && <p className="text-xs text-muted-foreground/60 mt-1 italic">{item.notes}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}

            {/* Rework History */}
            {qcStage.reworkHistory?.length > 0 && (
                <SectionCard title="Rework History" icon={History} color="text-rose-500">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-rose-500/10 text-rose-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-500/20">
                                {qcStage.reworkCount} rework{qcStage.reworkCount !== 1 ? 's' : ''} total
                            </span>
                            {qcStage.escalated && (
                                <span className="bg-red-500/10 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                                    Escalated
                                </span>
                            )}
                        </div>
                        {qcStage.reworkHistory.map((r: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-rose-500/50">Attempt #{i + 1}</p>
                                <p className="text-xs font-bold text-foreground/80 italic">"{r.failReason}"</p>
                                {r.defectSummary && <p className="text-xs text-muted-foreground/60">{r.defectSummary}</p>}
                                <p className="text-[9px] font-bold text-muted-foreground/30">
                                    {r.sentBackAt ? new Date(r.sentBackAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            )}
        </motion.div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FactoryManagerJobCardDetailPage() {
    const { id } = useParams<{ id: string }>();
    const qcClient = useQueryClient();
    const { user } = useAuthStore();
    const userId = user?.id;

    const { data: raw, isLoading } = useQuery({
        queryKey: ['fm-jc', id],
        queryFn: () => apiGet(`/jobcards/${id}`),
        enabled: !!id,
    });
    const jc: any = (raw as any)?.data ?? {};

    const isOverdue = jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status);

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />)}
            </div>
        );
    }

    if (!jc._id) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                    <Package size={40} className="text-muted-foreground/20" />
                </div>
                <h3 className="text-xl font-black mb-2">Job Card Not Found</h3>
                <Link to="/factory/jobcards">
                    <Button variant="outline" className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 h-11 mt-4">
                        ← Back to My Job Cards
                    </Button>
                </Link>
            </div>
        );
    }

    // Access check — must be assigned as production member
    const isAssigned = jc.assignedTo?.production?.some(
        (u: any) => (u._id || u.id || u) === userId
    );
    if (!isAssigned) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
                    <Shield size={40} className="text-rose-500/40" />
                </div>
                <h2 className="text-xl font-black mb-2">Not Assigned</h2>
                <p className="text-muted-foreground/50 text-sm mb-6 max-w-xs">You are not assigned to this job card's production team.</p>
                <Link to="/factory/jobcards">
                    <Button className="rounded-2xl font-black text-[10px] uppercase tracking-widest px-8 h-12">
                        ← Return to My Job Cards
                    </Button>
                </Link>
            </div>
        );
    }

    const TABS = [
        { value: 'overview', label: 'Overview', icon: Package },
        { value: 'production', label: 'Production', icon: Wrench },
        { value: 'qc', label: 'QC Result', icon: Shield },
    ];

    return (
        <div className="p-3 md:p-5 max-w-full mx-auto space-y-4">
            <Link to="/factory/jobcards" className="inline-flex items-center gap-2 text-muted-foreground hover:text-orange-500 transition-colors text-sm font-bold">
                <ArrowLeft size={16} /> My Job Cards
            </Link>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card dark:bg-card/20 border border-border/30 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-orange-500 text-xs font-black tracking-widest uppercase">{jc.jobCardNumber}</p>
                        {jc.items?.[0]?.category && (
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-wider mb-1">
                                {jc.items[0].category}
                            </div>
                        )}
                        <h1 className="text-foreground text-2xl font-black tracking-tight">
                            {jc.items?.[0]?.category && !jc.title?.startsWith(jc.items[0].category)
                                ? `${jc.items[0].category} - ${jc.title}`
                                : jc.title}
                        </h1>
                        <p className="text-muted-foreground/60 text-sm font-medium">
                            {jc.clientId?.name} <span className="mx-1.5 opacity-30">/</span> {jc.projectId?.projectName}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-widest', JOB_STATUS_BADGE[jc.status] ?? 'bg-muted text-muted-foreground border-border')}>
                                {jc.status?.replace(/_/g, ' ')}
                            </span>
                            {isOverdue && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20 animate-pulse">
                                    <AlertTriangle size={11} /> OVERDUE
                                </span>
                            )}
                            {jc.status === 'qc_failed' && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20 animate-pulse">
                                    <XCircle size={11} /> REWORK
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/40">
                    {[
                        { label: 'Priority', value: jc.priority },
                        { label: 'Expected Delivery', value: jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
                        { label: 'Created', value: jc.createdAt ? new Date(jc.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="space-y-0.5">
                            <p className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-widest">{label}</p>
                            <p className="text-foreground text-sm font-bold capitalize">{value}</p>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue={jc.status === 'qc_failed' ? 'production' : 'overview'}>
                <TabsList className="flex bg-muted/20 border border-border/40 p-1.5 rounded-3xl w-full gap-1.5 h-14 mb-2 shadow-sm">
                    {TABS.map(t => (
                        <TabsTrigger key={t.value} value={t.value}
                            className="flex-1 h-full flex items-center justify-center gap-2 rounded-2xl font-black text-xs data-[state=active]:bg-card data-[state=active]:text-orange-500 data-[state=active]:shadow-md transition-all active:scale-95 px-3">
                            <t.icon size={15} className="shrink-0" />
                            <span className="hidden sm:inline">{t.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <OverviewTab jc={jc} />
                </TabsContent>
                <TabsContent value="production" className="mt-4">
                    <ProductionTab id={id!} jc={jc} qcClient={qcClient} />
                </TabsContent>
                <TabsContent value="qc" className="mt-4">
                    <QCReadOnlyTab id={id!} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
