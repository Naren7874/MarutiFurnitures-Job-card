import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Receipt, Download, Send,
    AlertCircle, Loader2, Plus, Wallet, Building2, CreditCard, CheckCircle2,
    Pencil, Trash2
} from 'lucide-react';
import { useInvoice, useRecordPayment, useUpdatePayment, useDeletePayment, useSendInvoice } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft: { label: 'Draft', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    sent: { label: 'Sent', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    partially_paid: { label: 'Partial', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    paid: { label: 'Paid', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    overdue: { label: 'Overdue', color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

const PAY_MODES: Record<string, { label: string; placeholder: string; required: boolean }> = {
    upi: { label: 'UPI', placeholder: 'Transaction ID', required: true },
    cash: { label: 'Cash', placeholder: 'Receipt No. (Optional)', required: false },
    bank_transfer: { label: 'Bank Transfer', placeholder: 'UTR Number', required: true },
    cheque: { label: 'Cheque', placeholder: 'Cheque Number', required: true },
    card: { label: 'Card', placeholder: 'Auth Code / Ref', required: true },
};

const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading, refetch } = useInvoice(id!);
    const inv: any = (raw as any)?.data;

    const paymentMut = useRecordPayment(id!);
    const sendMut = useSendInvoice(id!);

    const updatePaymentMut = useUpdatePayment(id!);
    const deletePaymentMut = useDeletePayment(id!);

    const [showPayment, setShowPayment] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [payForm, setPayForm] = useState({ amount: '', mode: 'upi', reference: '' });
    const [payError, setPayError] = useState('');
    const [confirm, setConfirm] = useState<'send' | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const { hasPermission } = useAuthStore();

    const canEdit = hasPermission('invoice.edit');
    const canPay  = hasPermission('invoice.payment');

    const handleDownloadPDF = async () => {
        setPdfLoading(true);
        try {
            const { downloadPdf } = await import('../lib/axios');
            await downloadPdf(`/invoices/${id}/pdf`, `invoice_${inv?.invoiceNumber || id}.pdf`);
        } catch (e) { console.error('PDF download failed', e); }
        finally { setPdfLoading(false); }
    };

    const handlePayment = async () => {
        if (!payForm.amount) return;
        
        const modeCfg = PAY_MODES[payForm.mode];
        if (modeCfg?.required && !payForm.reference) {
            setPayError(`Proof of payment (${modeCfg.placeholder}) is required`);
            return;
        }

        setPayError('');
        try {
            if (editingPayment) {
                await updatePaymentMut.mutateAsync({ 
                    paymentId: editingPayment._id, 
                    amount: Number(payForm.amount), 
                    mode: payForm.mode, 
                    reference: payForm.reference 
                });
                toast.success('Payment updated');
            } else {
                await paymentMut.mutateAsync({ amount: Number(payForm.amount), mode: payForm.mode, reference: payForm.reference });
                toast.success('Payment recorded');
            }
            setShowPayment(false);
            setEditingPayment(null);
            setPayForm({ amount: '', mode: 'upi', reference: '' });
            refetch();
        } catch (e: any) {
            setPayError(e?.response?.data?.message || 'Failed to save payment');
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!window.confirm('Are you sure you want to delete this payment?')) return;
        try {
            await deletePaymentMut.mutateAsync(paymentId);
            toast.success('Payment deleted');
            refetch();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Failed to delete payment');
        }
    };

    const startEditPayment = (p: any) => {
        setEditingPayment(p);
        setPayForm({ amount: String(p.amount), mode: p.mode, reference: p.reference || '' });
        setShowPayment(true);
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
                {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted/20 rounded-3xl animate-pulse border border-border/20" />)}
            </div>
        );
    }

    if (!inv) {
        return (
            <div className="p-8 text-center">
                <AlertCircle size={48} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground font-bold">Invoice not found</p>
                <Link to="/invoices" className="text-primary text-sm font-bold mt-4 inline-block">← Back</Link>
            </div>
        );
    }

    const cfg = STATUS_CFG[inv.status] || STATUS_CFG.draft;
    const isPaid = inv.status === 'paid';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/invoices')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black tracking-tight text-foreground">{inv.invoiceNumber}</h1>
                            <span className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border', cfg.bg, cfg.color, cfg.border)}>
                                {cfg.label}
                            </span>
                        </div>
                        <p className="text-muted-foreground/50 text-xs font-bold mt-1">Created {fmtDate(inv.createdAt)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading} className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-border/60">
                        {pdfLoading ? (
                            <><div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Generating...</>
                        ) : (
                            <><Download size={13} /> PDF</>
                        )}
                    </Button>

                    {canEdit && (
                        <Button variant="outline" onClick={() => navigate(`/invoices/${id}/edit`)} className="h-10 px-4 rounded-xl text-xs font-bold gap-2 border-border/60">
                            <Plus size={13} className="rotate-45" /> Edit
                        </Button>
                    )}
                    {inv.status === 'draft' && canEdit && (
                        <Button onClick={() => setConfirm('send')} disabled={sendMut.isPending} className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-blue-500 text-white hover:bg-blue-600">
                            {sendMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            Send to Client
                        </Button>
                    )}
                    {!isPaid && canPay && (
                        <Button onClick={() => { setEditingPayment(null); setPayForm({ amount: '', mode: 'upi', reference: '' }); setShowPayment(true); }} className="h-10 px-5 rounded-xl text-xs font-black gap-2 bg-emerald-500 text-white hover:bg-emerald-600">
                            <Plus size={13} /> Record Payment
                        </Button>
                    )}
                </div>
            </div>

            {/* Confirm */}
            <AnimatePresence>
                {confirm === 'send' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
                        <p className="text-sm font-bold text-foreground">Send invoice to {inv.clientId?.name} via email?</p>
                        <div className="flex gap-3 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setConfirm(null)} className="rounded-xl font-bold text-xs">Cancel</Button>
                            <Button size="sm" onClick={async () => { await sendMut.mutateAsync(); setConfirm(null); refetch(); }} className="rounded-xl font-bold text-xs">Send</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left — Client + Details */}
                <div className="space-y-5">
                    <InfoCard title="Client" icon={Building2}>
                        <div className="space-y-1">
                            {inv.clientId?.name && (
                                <p className={cn("text-md font-bold text-muted-foreground", inv.clientId?.firmName ? "opacity-60" : "text-foreground text-sm font-black")}>
                                    {inv.clientId.firmName ? `${inv.clientId.name}` : inv.clientId.name}
                                </p>
                            )}
                        </div>
                        
                        {(inv.clientId?.address?.line1 || inv.clientId?.address?.city) && (
                            <div className="text-[11px] text-muted-foreground/60 leading-relaxed pt-2 border-t border-border/10">
                                {[
                                    inv.clientId.address.houseNumber,
                                    inv.clientId.address.line1,
                                    inv.clientId.address.line2
                                ].filter(Boolean).join(', ')}
                                <br />
                                {[
                                    inv.clientId.address.city,
                                    inv.clientId.address.state,
                                    inv.clientId.address.pincode
                                ].filter(Boolean).join(', ')}
                            </div>
                        )}

                        <div className="flex flex-col gap-1 pt-2">
                            {inv.clientId?.phone && (
                                <p className="text-[11px] font-bold text-muted-foreground/50 flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-border" /> {inv.clientId.phone}
                                </p>
                            )}
                            {inv.clientGstinSnapshot && (
                                <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-primary/30" /> GST: {inv.clientGstinSnapshot}
                                </p>
                            )}
                        </div>
                    </InfoCard>

                    <InfoCard title="Invoice Details" icon={Receipt}>
                        <div className="space-y-2">
                            <InfoRow label="Place of Supply" value={inv.placeOfSupply} />
                            {inv.dueDate && <InfoRow label="Due Date" value={fmtDate(inv.dueDate)} />}
                            {inv.sentAt && <InfoRow label="Sent At" value={fmtDate(inv.sentAt)} />}
                        </div>
                    </InfoCard>
                </div>

                {/* Right — Financials + Payments */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Financial Summary */}
                    <div className="bg-card border border-border/60 rounded-3xl p-6 space-y-4 shadow-sm">
                        <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary"><Wallet size={14} /></div>
                            <p className="font-black text-sm uppercase tracking-wider text-foreground">Financial Summary</p>
                        </div>
                        <div className="space-y-3 max-w-sm ml-auto">
                            <TotalRow label="Sub Total" value={fmt(inv.subtotal)} />
                            {inv.discount > 0 && <TotalRow label="Discount" value={`-${fmt(inv.discount)}`} valueClass="text-rose-500" />}
                            {(() => {
                                let displayRate = inv.gstRate;
                                if ((displayRate === undefined || displayRate === null) && inv.gstAmount > 0) {
                                    const taxable = inv.taxableAmount || (inv.subtotal - (inv.discount || 0));
                                    if (taxable > 0) {
                                        displayRate = Math.round((inv.gstAmount / taxable) * 100);
                                    }
                                }
                                return <TotalRow label={(displayRate !== undefined && displayRate !== null) ? `GST (${displayRate}%)` : "GST"} value={fmt(inv.gstAmount)} />;
                            })()}
                            <div className="pt-3 border-t border-border/40 flex justify-between items-center">
                                <p className="font-black text-foreground text-base">Grand Total</p>
                                <p className="font-black text-primary text-xl">{fmt(inv.grandTotal)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-muted-foreground/60">Amount Paid</p>
                                <p className="font-black text-emerald-500 text-sm">{fmt(inv.advancePaid)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-muted-foreground/60">Balance Due</p>
                                <p className={cn('font-black text-sm', inv.balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500')}>{fmt(inv.balanceDue)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payments */}
                    <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><CreditCard size={14} /></div>
                                <p className="font-black text-sm uppercase tracking-wider text-foreground">Payments ({inv.payments?.length || 0})</p>
                            </div>
                        </div>

                        {/* Record Payment Form */}
                        <AnimatePresence>
                            {showPayment && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    className="px-6 py-4 border-b border-border/20 bg-emerald-500/5 space-y-3">
                                    <p className="text-xs font-black text-foreground">{editingPayment ? 'Edit Payment' : 'Record Payment'}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Input
                                            type="number"
                                            placeholder="Amount (₹)"
                                            value={payForm.amount}
                                            onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                                            className="rounded-xl h-10"
                                        />
                                        <Select value={payForm.mode} onValueChange={v => { setPayForm(f => ({ ...f, mode: v, reference: '' })); setPayError(''); }}>
                                            <SelectTrigger className="rounded-xl h-10 font-bold text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {Object.entries(PAY_MODES).map(([key, cfg]) => (
                                                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative">
                                            <Input
                                                placeholder={PAY_MODES[payForm.mode]?.placeholder || "Reference / UTR"}
                                                value={payForm.reference}
                                                onChange={e => { setPayForm(f => ({ ...f, reference: e.target.value })); setPayError(''); }}
                                                className={cn("rounded-xl h-10", payError && PAY_MODES[payForm.mode]?.required && !payForm.reference && "border-rose-500/50 bg-rose-500/5 placeholder:text-rose-500/30")}
                                            />
                                            {payError && (
                                                <p className="absolute -bottom-5 left-1 text-[9px] font-black text-rose-500 uppercase tracking-tight">{payError}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" size="sm" onClick={() => { setShowPayment(false); setEditingPayment(null); }} className="rounded-xl font-bold text-xs">Cancel</Button>
                                        <Button size="sm" onClick={handlePayment} disabled={!payForm.amount || paymentMut.isPending || updatePaymentMut.isPending} className="rounded-xl font-black text-xs gap-2">
                                            {(paymentMut.isPending || updatePaymentMut.isPending) && <Loader2 size={12} className="animate-spin" />}
                                            {editingPayment ? 'Update Payment' : 'Save Payment'}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {inv.payments?.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-muted-foreground/40 font-bold text-sm italic">No payments recorded yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/20">
                                {inv.payments?.map((p: any, i: number) => (
                                    <div key={i} className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{fmt(p.amount)}</p>
                                                <p className="text-[10px] text-muted-foreground/50 font-bold uppercase">
                                                    {p.mode?.replace(/_/g, ' ')} {p.reference ? `· ${p.reference}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canPay && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => startEditPayment(p)} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                                                        <Pencil size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(p._id)} className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </>
                                            )}
                                            <p className="text-xs text-muted-foreground/50 font-bold">{fmtDate(p.paidAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
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
