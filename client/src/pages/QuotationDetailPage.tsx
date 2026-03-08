import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Download, Send, CheckCircle2, XCircle, RefreshCw,
    FileText, User2, MapPin, ReceiptText, AlertCircle, Loader2,
    Building2, CalendarDays, Package, Rocket,
} from 'lucide-react';
import {
    useQuotation, useSendQuotation, useApproveQuotation,
    useRejectQuotation, useReviseQuotation, useCreateProject,
} from '../hooks/useApi';
import { useAuthStore } from '../stores/authStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft: { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    sent: { label: 'Sent', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    approved: { label: 'Approved', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    rejected: { label: 'Rejected', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    revised: { label: 'Revised', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    converted: { label: 'Converted', color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuotationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useQuotation(id!);
    const q: any = (raw as any)?.data;

    const sendMutation = useSendQuotation(id!);
    const approveMutation = useApproveQuotation(id!);
    const rejectMutation = useRejectQuotation(id!);
    const reviseMutation = useReviseQuotation(id!);
    const createProjectMut = useCreateProject();

    const [confirmAction, setConfirmAction] = useState<null | 'send' | 'approve' | 'reject' | 'revise' | 'convert'>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const isBusy = sendMutation.isPending || approveMutation.isPending || rejectMutation.isPending || reviseMutation.isPending || createProjectMut.isPending;

    // Permission flags
    const { hasPermission } = useAuthStore();
    const canEdit = hasPermission('quotation.edit');    // sales
    const canSend = hasPermission('quotation.send');    // sales
    const canApprove = hasPermission('quotation.approve'); // super_admin (*.*)
    const canConvert = hasPermission('project.create');    // super_admin

    const handleAction = async (action: 'send' | 'approve' | 'reject' | 'revise' | 'convert') => {
        setConfirmAction(null);
        if (action === 'send') await sendMutation.mutateAsync(undefined as any);
        if (action === 'approve') await approveMutation.mutateAsync(undefined as any);
        if (action === 'reject') await rejectMutation.mutateAsync(undefined as any);
        if (action === 'revise') {
            const res: any = await reviseMutation.mutateAsync({});
            if (res?.data?._id) navigate(`/quotations/${res.data._id}`);
        }
        if (action === 'convert') {
            const res: any = await createProjectMut.mutateAsync({
                quotationId: id,
                projectName: q.projectName,
                clientId: q.clientId?._id || q.clientId,
                siteAddress: q.siteAddress,
            });
            const projId = res?.data?._id || res?._id;
            if (projId) navigate(`/projects/${projId}`);
        }
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
                    <div key={i} className="h-24 bg-muted/40 rounded-3xl animate-pulse border border-border/30" />
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
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    const client = q.clientId;
    const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-6xl mx-auto space-y-8"
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
                            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', cfg.bg, cfg.color, cfg.border)}>
                                <span className={cn('size-1.5 rounded-full bg-current')} />
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/50 text-xs font-semibold mt-1">Created {fmtDate(q.createdAt)}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
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

                    {status === 'draft' && canEdit && (
                        <>
                            <Link to={`/quotations/${id}/edit`}>
                                <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-border/60">
                                    <FileText size={14} /> Edit
                                </Button>
                            </Link>
                            {canSend && (
                                <Button
                                    onClick={() => setConfirmAction('send')}
                                    disabled={isBusy}
                                    className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-blue-500 text-white hover:bg-blue-600"
                                >
                                    {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                    Send to Client
                                </Button>
                            )}
                        </>
                    )}

                    {(status === 'sent' || status === 'draft') && canApprove && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmAction('reject')}
                                disabled={isBusy}
                                className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                            >
                                <XCircle size={13} /> Reject
                            </Button>
                            <Button
                                onClick={() => setConfirmAction('approve')}
                                disabled={isBusy}
                                className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
                            >
                                {approveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Mark Approved
                            </Button>
                        </>
                    )}

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

                    {status === 'approved' && canConvert && (
                        <Button
                            onClick={() => setConfirmAction('convert')}
                            disabled={isBusy}
                            className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-violet-500 text-white hover:bg-violet-600"
                        >
                            {createProjectMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Rocket size={13} />}
                            Convert to Project
                        </Button>
                    )}
                </div>
            </div>

            {/* Confirm Dialog */}
            <AnimatePresence>
                {confirmAction && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4"
                    >
                        <p className="text-sm font-bold text-foreground">
                            {confirmAction === 'send' && 'Send this quotation to the client via email & WhatsApp?'}
                            {confirmAction === 'approve' && 'Mark this quotation as Approved?'}
                            {confirmAction === 'reject' && 'Mark this quotation as Rejected?'}
                            {confirmAction === 'revise' && 'Create a new revision copy from this quotation?'}
                            {confirmAction === 'convert' && `Convert this approved quotation into a live project for ${q.clientId?.firmName || q.clientId?.name}?`}
                        </p>
                        <div className="flex gap-3 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)} className="rounded-xl font-bold text-xs">Cancel</Button>
                            <Button size="sm" onClick={() => handleAction(confirmAction)} className="rounded-xl font-bold text-xs bg-primary">Confirm</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* === Left — Client & Project Info === */}
                <div className="space-y-5">
                    {/* Client */}
                    <InfoCard title="Client" icon={User2}>
                        <div className="space-y-2">
                            <p className="font-black text-foreground text-sm">{client?.firmName || client?.name || '—'}</p>
                            {client?.firmName && <p className="text-muted-foreground/60 text-xs font-medium">{client.name}</p>}
                            <div className="pt-1 space-y-1">
                                {client?.phone && <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">Phone</span> {client.phone}</p>}
                                {client?.email && <p className="text-xs text-muted-foreground/60 font-medium flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">Email</span> {client.email}</p>}
                                {client?.gstin && <p className="text-xs text-muted-foreground/60 font-mono tracking-widest flex items-center gap-1.5"><span className="text-[9px] uppercase tracking-wider text-muted-foreground/30">GSTIN</span> {client.gstin}</p>}
                            </div>
                        </div>
                    </InfoCard>

                    {/* Project */}
                    <InfoCard title="Project" icon={Building2}>
                        <div className="space-y-2">
                            <p className="font-black text-foreground text-sm">{q.projectName}</p>
                            {q.architect && <p className="text-xs text-muted-foreground/60 font-medium">Ar. {q.architect}</p>}
                            {(q.siteAddress?.city || q.siteAddress?.state) && (
                                <p className="text-xs text-muted-foreground/50 font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {[q.siteAddress?.city, q.siteAddress?.state].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                    </InfoCard>

                    {/* Delivery */}
                    <InfoCard title="Timeline" icon={CalendarDays}>
                        <div className="space-y-2">
                            {q.deliveryDays && <InfoRow label="Delivery" value={q.deliveryDays} />}
                            {q.validUntil && <InfoRow label="Valid Until" value={fmtDate(q.validUntil)} />}
                            <InfoRow label="Revision" value={`Rev. ${q.revisionNumber || 1}`} />
                        </div>
                    </InfoCard>
                </div>

                {/* === Right — Items + Totals === */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Items Table */}
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Package size={14} /></div>
                            <p className="font-black text-sm uppercase tracking-wider text-foreground">Items ({q.items?.length || 0})</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border/20">
                                        {['#', 'Description', 'Qty', 'Rate', 'Total'].map(h => (
                                            <th key={h} className="text-left px-5 py-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {(q.items || []).map((item: any) => (
                                        <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-5 py-4 text-muted-foreground/30 font-black text-xs">{item.srNo}</td>
                                            <td className="px-5 py-4">
                                                {item.category && <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/40 mb-0.5">{item.category}</p>}
                                                <p className="text-sm font-bold text-foreground">{item.description}</p>
                                                {item.specifications?.size && <p className="text-[10px] text-muted-foreground/40 font-medium mt-0.5">{item.specifications.size}</p>}
                                            </td>
                                            <td className="px-5 py-4 text-sm font-bold text-foreground/70">{item.qty} {item.unit || 'pcs'}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-foreground/70">{fmt(item.sellingPrice)}</td>
                                            <td className="px-5 py-4 text-sm font-black text-foreground">{fmt(item.totalPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><ReceiptText size={14} /></div>
                            <p className="font-black text-sm uppercase tracking-wider text-foreground">Financial Breakdown</p>
                        </div>
                        <div className="space-y-3 max-w-sm ml-auto">
                            <TotalRow label="Subtotal" value={fmt(q.subtotal)} />
                            {q.discount > 0 && <TotalRow label="Discount" value={`-${fmt(q.discount)}`} valueClass="text-rose-500" />}
                            <TotalRow label="Amount After Discount" value={fmt(q.amountAfterDiscount)} />
                            {q.gstType === 'cgst_sgst' ? (
                                <>
                                    <TotalRow label="CGST (9%)" value={fmt(q.cgst)} />
                                    <TotalRow label="SGST (9%)" value={fmt(q.sgst)} />
                                </>
                            ) : (
                                <TotalRow label="IGST (18%)" value={fmt(q.igst)} />
                            )}
                            <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                                <p className="font-black text-foreground text-base">Grand Total</p>
                                <p className="font-black text-primary text-xl">{fmt(q.grandTotal)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-muted-foreground/60">Advance ({q.advancePercent || 50}%)</p>
                                <p className="font-black text-emerald-500 text-sm">{fmt(q.advanceAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Terms */}
                    {q.termsAndConditions?.length > 0 && (
                        <div className="bg-white dark:bg-card/20 border border-border/30 rounded-3xl p-6 space-y-3">
                            <p className="font-black text-xs uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                                <FileText size={12} /> Terms & Conditions
                            </p>
                            <ol className="space-y-2">
                                {q.termsAndConditions.map((t: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground/70 font-medium">
                                        <span className="text-muted-foreground/30 font-black shrink-0">{i + 1}.</span>
                                        {t}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-3">
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
