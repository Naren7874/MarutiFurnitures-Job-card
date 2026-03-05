import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/axios';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const STATUS_BADGE: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground border-border',
    in_progress: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    approved: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const JOB_STATUS_BADGE: Record<string, string> = {
    active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    in_store: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    in_production: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    qc_pending: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    qc_passed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dispatched: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const InfoRow = ({ label, value }: { label: string; value?: any }) => (
    value ? (
        <div className="flex items-start justify-between py-2 border-b border-border/40 last:border-0 hover:bg-accent/5 px-1 -mx-1 transition-colors">
            <span className="text-muted-foreground/70 text-xs font-medium">{label}</span>
            <span className="text-foreground text-xs text-right font-bold max-w-[60%]">{value}</span>
        </div>
    ) : null
);

export default function JobCardDetailPage() {
    const { id } = useParams<{ id: string }>();

    const { data: raw, isLoading } = useQuery({
        queryKey: ['jobcard', id],
        queryFn: () => apiGet(`/jobcards/${id}`),
        enabled: !!id,
    });

    const jc: any = (raw as any) ?? {};

    const isOverdue = jc.expectedDelivery &&
        new Date(jc.expectedDelivery) < new Date() &&
        !['delivered', 'closed', 'cancelled'].includes(jc.status);

    if (isLoading) {
        return <div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/20 rounded-xl animate-pulse" />)}</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Back */}
            <Link to="/jobcards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-semibold">
                <ArrowLeft size={16} /> Back to Job Cards
            </Link>

            {/* Header */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <span className="text-[10px] font-black italic">JC</span>
                            </div>
                            <p className="text-primary text-sm font-black tracking-widest">{jc.jobCardNumber}</p>
                        </div>
                        <h1 className="text-foreground text-2xl font-black mt-2 tracking-tight">{jc.title}</h1>
                        <p className="text-muted-foreground text-sm font-medium">{jc.clientId?.name} <span className="mx-1.5 opacity-30">/</span> {jc.projectId?.projectName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest shadow-sm ${JOB_STATUS_BADGE[jc.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                            {jc.status?.replace(/_/g, ' ')}
                        </span>
                        {isOverdue && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20 animate-pulse">
                                <AlertTriangle size={12} /> OVERDUE
                            </span>
                        )}
                    </div>
                </div>

                {/* Meta row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 pt-6 border-t border-border/40">
                    {[
                        { label: 'Priority', value: jc.priority },
                        { label: 'Assigned To', value: jc.assignedTo?.name ?? 'Unassigned' },
                        { label: 'Expect Del.', value: jc.expectedDelivery ? new Date(jc.expectedDelivery).toLocaleDateString('en-IN') : '—' },
                        { label: 'Quotation', value: jc.quotationId?.quotationNumber ?? '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                            <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">{label}</p>
                            <p className="text-foreground text-sm font-bold capitalize">{value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stage Tabs */}
            <Tabs defaultValue="design">
                <TabsList className="bg-muted border border-border p-1">
                    <TabsTrigger value="design" className="data-[state=active]:bg-card data-[state=active]:text-primary font-bold">Design</TabsTrigger>
                    <TabsTrigger value="store" className="data-[state=active]:bg-card data-[state=active]:text-primary font-bold">Store</TabsTrigger>
                    <TabsTrigger value="production" className="data-[state=active]:bg-card data-[state=active]:text-primary font-bold">Production</TabsTrigger>
                    <TabsTrigger value="qc" className="data-[state=active]:bg-card data-[state=active]:text-primary font-bold">QC</TabsTrigger>
                    <TabsTrigger value="dispatch" className="data-[state=active]:bg-card data-[state=active]:text-primary font-bold">Dispatch</TabsTrigger>
                </TabsList>

                {/* ── Design ── */}
                <TabsContent value="design">
                    <StageCard title="Design Stage" stage={jc.designStage}>
                        {jc.designStage && (
                            <div className="space-y-2">
                                <InfoRow label="Material" value={jc.designStage.material} />
                                <InfoRow label="Finish" value={jc.designStage.finish} />
                                <InfoRow label="Dimensions" value={jc.designStage.dimensions &&
                                    `${jc.designStage.dimensions.length ?? '?'} × ${jc.designStage.dimensions.width ?? '?'} × ${jc.designStage.dimensions.height ?? '?'} cm`} />
                                <InfoRow label="Notes" value={jc.designStage.notes} />
                                {jc.designStage.designFiles?.length > 0 && (
                                    <div className="pt-3 mt-2 border-t border-border/40">
                                        <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">Design Documents</p>
                                        <div className="flex flex-wrap gap-2">
                                            {jc.designStage.designFiles.map((f: any, i: number) => (
                                                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                                                    className="px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground text-[11px] font-bold hover:text-primary hover:border-primary/50 transition shadow-sm">
                                                    {f.fileName ?? `Drawing ${i + 1}`}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </StageCard>
                </TabsContent>

                {/* ── Store ── */}
                <TabsContent value="store">
                    <StageCard title="Store Stage" stage={jc.storeStage}>
                        {jc.storeStage && (
                            <div className="space-y-2">
                                <InfoRow label="Raw Material Issued" value={jc.storeStage.rawMaterialIssued ? 'Yes' : 'No'} />
                                <InfoRow label="Notes" value={jc.storeStage.notes} />
                                {jc.storeStage.materials?.length > 0 && (
                                    <div className="pt-3 mt-2 border-t border-border/40">
                                        <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest mb-3">Bill of Materials</p>
                                        <div className="space-y-1.5">
                                            {jc.storeStage.materials.map((m: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center text-[11px] font-semibold text-foreground/80 bg-accent/5 px-2 py-1 rounded">
                                                    <span>{m.itemName}</span>
                                                    <span className="text-primary">{m.qty} {m.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </StageCard>
                </TabsContent>

                {/* ── Production ── */}
                <TabsContent value="production">
                    <StageCard title="Production Stage" stage={jc.productionStage}>
                        {jc.productionStage && (
                            <div className="space-y-2">
                                <InfoRow label="Carpentry" value={jc.productionStage.carpentryDone ? 'Done' : 'Pending'} />
                                <InfoRow label="Assembly" value={jc.productionStage.assemblyDone ? 'Done' : 'Pending'} />
                                <InfoRow label="Polish" value={jc.productionStage.polishDone ? 'Done' : 'Pending'} />
                                <InfoRow label="Notes" value={jc.productionStage.notes} />
                                <InfoRow label="Started At" value={jc.productionStage.startedAt ? new Date(jc.productionStage.startedAt).toLocaleDateString('en-IN') : null} />
                                <InfoRow label="Completed At" value={jc.productionStage.completedAt ? new Date(jc.productionStage.completedAt).toLocaleDateString('en-IN') : null} />
                            </div>
                        )}
                    </StageCard>
                </TabsContent>

                {/* ── QC ── */}
                <TabsContent value="qc">
                    <StageCard title="Quality Control" stage={jc.qcStage}>
                        {jc.qcStage && (
                            <div className="space-y-2">
                                <InfoRow label="Verdict" value={jc.qcStage.verdict} />
                                <InfoRow label="Inspector" value={jc.qcStage.inspectedBy?.name} />
                                <InfoRow label="Inspected" value={jc.qcStage.inspectedAt ? new Date(jc.qcStage.inspectedAt).toLocaleDateString('en-IN') : null} />
                                <InfoRow label="Remarks" value={jc.qcStage.remarks} />
                            </div>
                        )}
                    </StageCard>
                </TabsContent>

                {/* ── Dispatch ── */}
                <TabsContent value="dispatch">
                    <StageCard title="Dispatch Stage" stage={jc.dispatchStage}>
                        {jc.dispatchStage && (
                            <div className="space-y-2">
                                <InfoRow label="Vehicle No." value={jc.dispatchStage.vehicleNumber} />
                                <InfoRow label="Driver" value={jc.dispatchStage.driverName} />
                                <InfoRow label="Driver Ph." value={jc.dispatchStage.driverPhone} />
                                <InfoRow label="Dispatch Date" value={jc.dispatchStage.dispatchDate ? new Date(jc.dispatchStage.dispatchDate).toLocaleDateString('en-IN') : null} />
                                <InfoRow label="Delivered" value={jc.dispatchStage.deliveredAt ? new Date(jc.dispatchStage.deliveredAt).toLocaleDateString('en-IN') : null} />
                                <InfoRow label="Notes" value={jc.dispatchStage.notes} />
                            </div>
                        )}
                    </StageCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ── Helper: Stage Card ────────────────────────────────────────────────────────

function StageCard({ title, stage, children }: { title: string; stage: any; children?: React.ReactNode }) {
    return (
        <div className="mt-4 bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                <h3 className="text-foreground font-black uppercase text-xs tracking-widest">{title}</h3>
                {stage?.status && (
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-widest ${STATUS_BADGE[stage.status] ?? ''}`}>
                        {stage.status}
                    </span>
                )}
            </div>
            {stage ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {children}
                </div>
            ) : (
                <div className="text-center py-10">
                    <p className="text-muted-foreground/60 text-xs font-black uppercase tracking-[0.2em]">Pending Initiation</p>
                </div>
            )}
        </div>
    );
}
