import { useState, Fragment } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Download, Send, CheckCircle2, XCircle, RefreshCw,
    FileText, User2, MapPin, ReceiptText, AlertCircle, Loader2,
    Building2, CalendarDays, Package, Phone, Trash2
} from 'lucide-react';
import {
    useQuotation, useSendQuotation, useApproveQuotation,
    useRejectQuotation, useReviseQuotation, useJobCards, useDeleteQuotation
} from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ImagePreview } from '@/components/ui/image-preview';
import ApproveQuotationModal from '../components/quotation/ApproveQuotationModal';
import ManageTeamsModal from '../components/quotation/ManageTeamsModal';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Users } from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft:     { label: 'Pending',   color: 'text-slate-500',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20'  },
    sent:      { label: 'Sent',      color: 'text-blue-500',   bg: 'bg-blue-500/10',  border: 'border-blue-500/20'   },
    approved:  { label: 'Approved',  color: 'text-emerald-500',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20'},
    rejected:  { label: 'Rejected',  color: 'text-rose-500',   bg: 'bg-rose-500/10',  border: 'border-rose-500/20'   },
    revised:   { label: 'Revised',   color: 'text-amber-500',  bg: 'bg-amber-500/10', border: 'border-amber-500/20'  },
    converted: { label: 'Converted', color: 'text-violet-500', bg: 'bg-violet-500/10',border: 'border-violet-500/20' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuotationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useQuotation(id!);
    const q: any = (raw as any)?.data;

    const sendMutation    = useSendQuotation(id!);
    const approveMutation = useApproveQuotation(id!);
    const rejectMutation  = useRejectQuotation(id!);
    const reviseMutation  = useReviseQuotation(id!);
    const deleteMutation  = useDeleteQuotation(id!);
    const [confirmAction, setConfirmAction] = useState<null | 'send' | 'approve' | 'reject' | 'revise' | 'delete'>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [isManageTeamsOpen, setIsManageTeamsOpen] = useState(false);

    const { data: jobCardsRaw } = useJobCards({ quotationId: id });
    const jobCards = (jobCardsRaw as any)?.data || [];
    const isBusy = sendMutation.isPending || approveMutation.isPending || rejectMutation.isPending || reviseMutation.isPending || deleteMutation.isPending;

    // Permission flags
    const { hasPermission } = useAuthStore();
    const canEdit    = hasPermission('quotation.edit');
    const canSend    = hasPermission('quotation.send');
    const canApprove = hasPermission('quotation.edit');
    const canDelete  = hasPermission('quotation.delete');

    const handleAction = async (action: 'send' | 'approve' | 'reject' | 'revise' | 'delete') => {
        setConfirmAction(null);
        if (action === 'send')    await sendMutation.mutateAsync(undefined as any);
        if (action === 'approve') setShowApproveModal(true);
        if (action === 'reject')  await rejectMutation.mutateAsync(undefined as any);
        if (action === 'revise')  await reviseMutation.mutateAsync({});
        if (action === 'delete') {
            await deleteMutation.mutateAsync();
            navigate('/quotations');
        }
    };

    const handleApproveFinal = async (jobCardConfigs: any[], advancePayment?: any) => {
        await approveMutation.mutateAsync({ jobCardConfigs, advancePayment });
        setShowApproveModal(false);
    };

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const { downloadPdf } = await import('../lib/axios');
            await downloadPdf(`/quotations/${id}/pdf`, `quotation_${q.quotationNumber || id}.pdf`);
        } catch (e) { console.error('PDF download failed', e); }
        finally { setPdfLoading(false); }
    };

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted/40 rounded-3xl animate-pulse border border-border/30 max-w-[1600px] mx-auto" />
                ))}
            </div>
        );
    }

    if (!q) {
        return (
            <div className="p-8 text-center">
                <AlertCircle size={48} className="text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground/40 font-bold">Quotation not found</p>
                <Link to="/quotations" className="text-primary text-sm font-bold mt-4 inline-block">← Back to Quotations</Link>
            </div>
        );
    }

    const status = q.status || 'draft';
    const cfg    = STATUS_CFG[status] || STATUS_CFG.draft;
    const client = q.clientId;
    const fmt    = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';

    // Editable statuses: draft, sent, approved (admin can add items post-approval)
    const canEditNow = canEdit && !['converted', 'rejected', 'revised'].includes(status);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8"
        >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/quotations')} className="group w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">{q.quotationNumber || 'Quotation'}</h1>
                            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border', cfg.bg, cfg.color, cfg.border)}>
                                <span className={cn('size-1.5 rounded-full bg-current')} />
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/50 text-xs font-semibold mt-1">Created {fmtDate(q.createdAt)}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    {/* 1. Edit */}
                    {canEditNow && (
                        <Link to={`/quotations/${id}/edit`}>
                            <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-border/60">
                                <FileText size={14} /> Edit
                            </Button>
                        </Link>
                    )}

                    {/* 2. Download PDF */}
                    <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        disabled={pdfLoading}
                        className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30"
                    >
                        {pdfLoading ? (
                            <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Generating...</>
                        ) : (
                            <><Download size={14} /> Download PDF</>
                        )}
                    </Button>

                    {/* 3. Send to Client */}
                    {status === 'draft' && canSend && (
                        <Button
                            onClick={() => setConfirmAction('send')}
                            disabled={isBusy}
                            className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-blue-500 text-white hover:bg-blue-600"
                        >
                            {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Send to Client
                        </Button>
                    )}

                    {/* 4. Mark as Approved & 5. Reject */}
                    {(status === 'sent' || status === 'draft') && canApprove && (
                        <>
                            <Button
                                onClick={() => setConfirmAction('approve')}
                                disabled={isBusy}
                                className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                                {approveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Mark as Approved
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmAction('reject')}
                                disabled={isBusy}
                                className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                            >
                                <XCircle size={13} /> Reject
                            </Button>
                        </>
                    )}

                    {/* Manage Teams (only for approved) */}
                    {status === 'approved' && (
                        <Button 
                            variant="outline"
                            onClick={() => setIsManageTeamsOpen(true)}
                            className="h-10 px-6 rounded-xl text-xs font-black gap-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary transition-all shadow-lg shadow-primary/5"
                        >
                            <Users size={14} className="animate-pulse" /> Manage Teams
                        </Button>
                    )}

                    {/* Create Revision (only for sent or rejected) */}
                    {(status === 'sent' || status === 'rejected') && canEdit && (
                        <Button
                            variant="outline"
                            onClick={() => setConfirmAction('revise')}
                            disabled={isBusy}
                            className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                        >
                            {reviseMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                            Create Revision
                        </Button>
                    )}

                    {/* 6. Delete */}
                    {canDelete && (
                        <Button
                            variant="outline"
                            onClick={() => setConfirmAction('delete')}
                            disabled={isBusy || deleteMutation.isPending}
                            className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                        >
                            {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            Delete
                        </Button>
                    )}
                </div>
            </div>

            {/* Action Confirmation Dialog */}
            <ConfirmationDialog
                open={!!confirmAction}
                onOpenChange={(open) => !open && setConfirmAction(null)}
                title={
                    confirmAction === 'delete' ? 'Delete Quotation?' :
                    confirmAction === 'send'   ? 'Send to Client?' :
                    confirmAction === 'reject' ? 'Reject Quotation?' :
                    confirmAction === 'revise' ? 'Create Revision?' :
                    'Approve Quotation?'
                }
                description={
                    confirmAction === 'delete' ? 'PERMANENTLY delete this quotation and ALL associated projects, job cards, and invoices? This cannot be undone.' :
                    confirmAction === 'send'   ? 'This will notify the client and change the status to "Sent".' :
                    confirmAction === 'reject' ? 'This will mark the quotation as rejected.' :
                    confirmAction === 'revise' ? 'This will create a new draft revision of this quotation.' :
                    `Approve this quotation? A Project and Job Cards will be automatically created for ${q.items?.length || 0} item(s). You'll set the team assignment in the next step.`
                }
                confirmText={
                    confirmAction === 'delete' ? 'Delete Permanently' :
                    confirmAction === 'send'   ? 'Send Now' :
                    confirmAction === 'reject' ? 'Reject' :
                    confirmAction === 'revise' ? 'Create' :
                    'Approve'
                }
                variant={confirmAction === 'delete' || confirmAction === 'reject' ? 'destructive' : 'default'}
                isPending={isBusy}
                onConfirm={async () => { if (confirmAction) await handleAction(confirmAction); }}
            />

            {/* Approval success note */}
            {status === 'approved' && q.projectId && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Quotation Approved — Project, Job Cards &amp; Invoice Created</p>
                        <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
                            A project, individual job cards, and an invoice were automatically created.{' '}
                            <Link to={`/projects/${q.projectId}`} className="text-primary font-bold hover:underline">View Project →</Link>
                        </p>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* === Left — Client & Project Info === */}
                <div className="space-y-5">
                    {/* Client */}
                    <InfoCard title="Client Details" icon={User2}>
                        <div className="space-y-2">
                            <p className="font-black text-foreground text-sm">{client?.name || '—'}</p>
                            {client?.firmName && <p className="text-muted-foreground/60 text-xs font-medium">{client.firmName}</p>}
                            <div className="pt-1 space-y-1">
                                {client?.phone && <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">Phone:</span> {client.phone}</p>}
                                {client?.email && <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">Email</span> {client.email}</p>}
                                {client?.gstin && <p className="text-xs text-muted-foreground/60 font-mono tracking-widest flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">GSTIN</span> {client.gstin}</p>}
                            </div>
                        </div>
                    </InfoCard>

                    {/* Project */}
                    <InfoCard title="Project Details" icon={Building2}>
                        <div className="space-y-2">
                            <p className="font-black text-foreground text-sm">{q.projectName}</p>
                            
                            {(q.architect || q.architectContact) && (
                                <div className="space-y-0.5">
                                    {q.architect && <p className="text-xs text-muted-foreground/60 font-medium">Architect Firm : {q.architect}</p>}
                                    {q.architectContact && <p className="text-[10px] text-muted-foreground/40 font-medium flex items-center gap-1.5"><Phone size={10} className="opacity-50" /> {q.architectContact}</p>}
                                </div>
                            )}

                            {(q.projectDesigner || q.projectDesignerContact) && (
                                <div className="space-y-0.5">
                                    {q.projectDesigner && <p className="text-xs text-muted-foreground/60 font-medium">Designer: {q.projectDesigner}</p>}
                                    {q.projectDesignerContact && <p className="text-[10px] text-muted-foreground/40 font-medium flex items-center gap-1.5"><Phone size={10} className="opacity-50" /> {q.projectDesignerContact}</p>}
                                </div>
                            )}

                            {(q.siteAddress?.city || q.siteAddress?.state) && (
                                <p className="text-xs text-muted-foreground/50 font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {[q.siteAddress?.city, q.siteAddress?.state].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                    </InfoCard>

                    {/* Delivery */}
                    <InfoCard title="Quotation Timeline" icon={CalendarDays}>
                        <div className="space-y-2">
                            {q.deliveryDays && <InfoRow label="Estimated Delivery" value={q.deliveryDays} />}
                            {q.validUntil && <InfoRow label="Valid Until" value={fmtDate(q.validUntil)} />}
                            <InfoRow label="Version" value={`Version ${q.revisionNumber || 1}`} />
                        </div>
                    </InfoCard>

                    {/* Extra Terms */}
                    {q.additionalTerms?.length > 0 && (
                        <InfoCard title="Extra Terms" icon={FileText}>
                            <ul className="space-y-2">
                                {q.additionalTerms.map((term: string, idx: number) => (
                                    <li key={idx} className="flex gap-2 text-xs text-muted-foreground/60 font-medium border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                                        <span className="text-primary font-black opacity-50">•</span>
                                        {term}
                                    </li>
                                ))}
                            </ul>
                        </InfoCard>
                    )}
                </div>

                {/* === Right — Items + Totals === */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Items Table */}
                    <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Package size={14} /></div>
                            <p className="font-black text-sm tracking-wider text-foreground">Items ({q.items?.length || 0})</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border/20">
                                        {['#', 'Item Description', 'Qty', 'Rate', 'Total Amount'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-[9px] font-black tracking-widest text-muted-foreground/40">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {(() => {
                                        let lastCategory: string | null = null;
                                        return (q.items || []).map((item: any) => {
                                            const showCategoryHeader = item.category && item.category !== lastCategory;
                                            if (showCategoryHeader) lastCategory = item.category;

                                            return (
                                                <Fragment key={`${item._id}-frag` || item.srNo}>
                                                    <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-5 py-4 text-muted-foreground/30 font-black text-xs">{item.srNo}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex gap-4">
                                                                {/* Images: main, fabric, and extra photos */}
                                                                {(item.photo || item.fabricPhoto || item.photos?.length > 0) && (
                                                                    <div className="flex gap-2 shrink-0 flex-wrap">
                                                                        {item.photo && (
                                                                            <div className="w-16 h-16">
                                                                                <ImagePreview src={item.photo} alt="Main" />
                                                                            </div>
                                                                        )}
                                                                        {item.fabricPhoto && (
                                                                            <div className="w-16 h-16">
                                                                                <ImagePreview src={item.fabricPhoto} alt="Fabric" />
                                                                            </div>
                                                                        )}
                                                                        {item.photos?.map((url: string, i: number) => (
                                                                            <div key={i} className="w-16 h-16">
                                                                                <ImagePreview src={url} alt={`Photo ${i + 1}`} />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 space-y-1.5">
                                                                    <p className="text-[16px] font-black text-foreground tracking-tight">{item.category}</p>
                                                                    <p className="text-[15px] font-medium text-foreground/70 leading-relaxed mb-2">{item.description}</p>
                                                                    <div className="flex flex-col gap-1">
                                                                        {item.specifications?.size && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Size: {item.specifications.size}</p>}
                                                                        {item.specifications?.material && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Material: {item.specifications.material}</p>}
                                                                        {item.specifications?.polish && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Polish: {item.specifications.polish}</p>}
                                                                        {item.specifications?.fabrics?.length > 0 ? (
                                                                            item.specifications.fabrics.map((fab: string, fi: number) => (
                                                                                <p key={fi} className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">
                                                                                    Fabric{item.specifications.fabrics.length > 1 ? ` ${fi + 1}` : ''}: {fab}
                                                                                </p>
                                                                            ))
                                                                        ) : item.specifications?.fabric ? (
                                                                            <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Fabric: {item.specifications.fabric}</p>
                                                                        ) : null}
                                                                        {item.specifications?.notes && <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Note: {item.specifications.notes}</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-[15px] font-bold text-foreground/70 tracking-tight">{item.qty} {item.unit || 'pcs'}</td>
                                                        <td className="px-5 py-4 text-[15px] font-bold text-foreground/70 tracking-tight">{fmt(item.sellingPrice)}</td>
                                                        <td className="px-5 py-4 text-[16px] font-black text-foreground tracking-tight">{fmt(item.totalPrice)}</td>
                                                    </tr>
                                                </Fragment>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><ReceiptText size={14} /></div>
                            <p className="font-black text-sm uppercase tracking-wider text-foreground">Price Summary</p>
                        </div>
                        <div className="space-y-3 max-w-sm ml-auto">
                            {q.discount > 0 && (
                                <>
                                    <TotalRow label="Subtotal" value={fmt(q.subtotal)} />
                                    <TotalRow label="Discount" value={`-${fmt(q.discount)}`} valueClass="text-rose-500" />
                                </>
                            )}
                            <div className={cn("flex justify-between items-center", q.discount > 0 ? "pt-3 border-t border-border/40" : "")}>
                                <p className="font-black text-foreground text-base">Total Amount</p>
                                <p className="font-black text-primary text-xl">{fmt(q.subtotal - (q.discount || 0))}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ApproveQuotationModal 
                open={showApproveModal}
                onOpenChange={setShowApproveModal}
                onConfirm={handleApproveFinal}
                quotation={q}
                isSubmitting={approveMutation.isPending}
            />

            <ManageTeamsModal 
                open={isManageTeamsOpen}
                onOpenChange={setIsManageTeamsOpen}
                quotation={q}
                jobCards={jobCards}
            />
        </motion.div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b border-border/20">
                <Icon size={12} className="text-muted-foreground/40" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{title}</p>
            </div>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center text-xs">
            <p className="text-muted-foreground/40 font-bold">{label}</p>
            <p className="font-bold text-foreground/80">{value}</p>
        </div>
    );
}

function TotalRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <p className="text-muted-foreground/60 font-bold">{label}</p>
            <p className={cn('font-bold text-foreground', valueClass)}>{value}</p>
        </div>
    );
}
