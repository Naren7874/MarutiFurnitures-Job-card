import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useQuotation, useUpdateQuotation, useClients } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { apiUpload } from '../lib/axios';

const TERMS_DEFAULTS = [
    '50% advance payment required before commencement of work.',
    'Balance payment due on delivery.',
    'Prices valid for 30 days from date of quotation.',
    'Taxes as applicable.',
];

export default function QuotationEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: raw, isLoading } = useQuotation(id!);
    const q: any = (raw as any)?.data;
    const updateMut = useUpdateQuotation(id!);
    const { data: clientsRaw } = useClients({ limit: 100 });
    const clients: any[] = (clientsRaw as any)?.data ?? [];

    const [form, setForm] = useState({
        clientId: '',
        projectName: '',
        architect: '',
        siteAddress: { line1: '', line2: '', city: '', state: '', pincode: '' },
        gstType: 'cgst_sgst' as 'cgst_sgst' | 'igst',
        discountPct: 0,
        advancePercent: 50,
        deliveryDays: '45',
        termsAndConditions: TERMS_DEFAULTS,
    });
    const [items, setItems] = useState<any[]>([{ srNo: 1, category: '', description: '', specifications: { size: '', material: '' }, qty: 1, unit: 'Nos', sellingPrice: 0, totalPrice: 0 }]);
    const [error, setError] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (q && !loaded) {
            setForm({
                clientId: q.clientId?._id || q.clientId || '',
                projectName: q.projectName || '',
                architect: q.architect || '',
                siteAddress: q.siteAddress || { line1: '', line2: '', city: '', state: '', pincode: '' },
                gstType: q.gstType || 'cgst_sgst',
                discountPct: q.discountPct || 0,
                advancePercent: q.advancePercent || 50,
                deliveryDays: q.deliveryDays || '45',
                termsAndConditions: q.termsAndConditions || TERMS_DEFAULTS,
            });
            setItems(q.items?.length ? q.items.map((it: any) => ({ ...it })) : [{ srNo: 1, category: '', description: '', specifications: { size: '', material: '' }, qty: 1, unit: 'Nos', sellingPrice: 0, totalPrice: 0 }]);
            setLoaded(true);
        }
    }, [q, loaded]);

    const updateItem = (i: number, field: string, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            if (field === 'size' || field === 'material') {
                updated[i] = { ...updated[i], specifications: { ...updated[i].specifications, [field]: value } };
            } else {
                updated[i] = { ...updated[i], [field]: value };
            }
            updated[i].totalPrice = updated[i].qty * updated[i].sellingPrice;
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, { srNo: prev.length + 1, category: '', description: '', specifications: { size: '', material: '' }, qty: 1, unit: 'Nos', sellingPrice: 0, totalPrice: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, srNo: idx + 1 })));

    const handlePhotoUpload = async (index: number, file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        const uploadingKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const publicIdKey = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';

        updateItem(index, uploadingKey, true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res: any = await apiUpload('/quotations/upload-item-photo', formData);
            if (res.success) {
                updateItem(index, type, res.url);
                updateItem(index, publicIdKey, res.publicId);
            }
        } catch (error) {
            console.error('Photo upload failed', error);
        } finally {
            updateItem(index, uploadingKey, false);
        }
    };

    const subtotal = items.reduce((s, it) => s + (it.totalPrice || 0), 0);
    const discount = (subtotal * form.discountPct) / 100;
    const afterDiscount = subtotal - discount;
    const gstAmt = (afterDiscount * 18) / 100;
    const grandTotal = afterDiscount + gstAmt;
    const advanceAmount = (grandTotal * form.advancePercent) / 100;

    const handleSave = async () => {
        if (!form.clientId || !form.projectName) { setError('Client and Project Name are required'); return; }
        if (items.some(it => !it.description)) { setError('All items need a description'); return; }
        try {
            const payload: any = {
                ...form,
                items,
                subtotal,
                discount,
                amountAfterDiscount: afterDiscount,
                grandTotal,
                advanceAmount,
                ...(form.gstType === 'cgst_sgst' ? { cgst: gstAmt / 2, sgst: gstAmt / 2 } : { igst: gstAmt }),
            };
            await updateMut.mutateAsync(payload);
            navigate(`/quotations/${id}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to save quotation');
        }
    };

    if (isLoading) return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted/20 rounded-3xl animate-pulse border border-border/20" />)}
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/quotations/${id}`)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><FileText size={18} /></span>
                            Edit Quotation
                        </h1>
                        <p className="text-muted-foreground/50 text-xs font-bold mt-1">{q?.quotationNumber} · Rev {q?.revisionNumber || 1}</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={updateMut.isPending} className="h-11 px-7 rounded-xl font-black text-xs gap-2">
                    {updateMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                </Button>
            </div>

            <AnimatePresence>
                {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold">{error}</motion.div>}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left panel */}
                <div className="space-y-5">
                    <Section title="Client & Project">
                        <Field label="Client *">
                            <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                                <SelectTrigger className="rounded-xl h-10 font-bold text-xs"><SelectValue placeholder="Select client…" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {clients.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.firmName || c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label="Project Name *">
                            <Input value={form.projectName} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} className="rounded-xl h-10" placeholder="e.g. Master Bedroom — Sharma Residence" />
                        </Field>
                        <Field label="Architect / Designer">
                            <Input value={form.architect} onChange={e => setForm(f => ({ ...f, architect: e.target.value }))} className="rounded-xl h-10" placeholder="Name (optional)" />
                        </Field>
                    </Section>

                    <Section title="Site Address">
                        <Field label="Line 1">
                            <Input value={form.siteAddress.line1} onChange={e => setForm(f => ({ ...f, siteAddress: { ...f.siteAddress, line1: e.target.value } }))} className="rounded-xl h-10" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="City">
                                <Input value={form.siteAddress.city} onChange={e => setForm(f => ({ ...f, siteAddress: { ...f.siteAddress, city: e.target.value } }))} className="rounded-xl h-10" />
                            </Field>
                            <Field label="State">
                                <Input value={form.siteAddress.state} onChange={e => setForm(f => ({ ...f, siteAddress: { ...f.siteAddress, state: e.target.value } }))} className="rounded-xl h-10" />
                            </Field>
                        </div>
                    </Section>

                    <Section title="Financial Settings">
                        <Field label="GST Type">
                            <div className="grid grid-cols-2 gap-2">
                                {(['cgst_sgst', 'igst'] as const).map(t => (
                                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, gstType: t }))} className={`py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${form.gstType === t ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                                        {t === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Discount (%)">
                                <Input type="number" min="0" max="100" value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: Number(e.target.value) }))} className="rounded-xl h-10" />
                            </Field>
                            <Field label="Advance (%)">
                                <Input type="number" min="0" max="100" value={form.advancePercent} onChange={e => setForm(f => ({ ...f, advancePercent: Number(e.target.value) }))} className="rounded-xl h-10" />
                            </Field>
                        </div>
                        <Field label="Delivery Days">
                            <Input value={form.deliveryDays} onChange={e => setForm(f => ({ ...f, deliveryDays: e.target.value }))} className="rounded-xl h-10" placeholder="e.g. 45 working days" />
                        </Field>
                    </Section>

                    {/* Summary */}
                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-2 text-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 pb-2 border-b border-primary/10">Summary</p>
                        <SumRow label="Subtotal" value={`₹${subtotal.toLocaleString('en-IN')}`} />
                        {form.discountPct > 0 && <SumRow label={`Discount (${form.discountPct}%)`} value={`-₹${discount.toLocaleString('en-IN')}`} cls="text-rose-500" />}
                        <SumRow label="GST (18%)" value={`₹${gstAmt.toLocaleString('en-IN')}`} />
                        <div className="flex justify-between pt-2 border-t border-primary/10 font-black">
                            <span className="text-foreground">Grand Total</span>
                            <span className="text-primary text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <SumRow label={`Advance (${form.advancePercent}%)`} value={`₹${advanceAmount.toLocaleString('en-IN')}`} cls="text-emerald-500" />
                    </div>
                </div>

                {/* Right — Items */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Line Items ({items.length})</p>
                            <Button onClick={addItem} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8 gap-1.5 border-border/60">
                                <Plus size={12} /> Add Row
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/20 text-muted-foreground/50">
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Description</th>
                                        <th className="px-3 py-3 font-black uppercase tracking-widest w-16 text-center">Qty</th>
                                        <th className="px-3 py-3 font-black uppercase tracking-widest w-20 text-center">Unit</th>
                                        <th className="px-3 py-3 font-black uppercase tracking-widest w-24 text-right">Rate (₹)</th>
                                        <th className="px-3 py-3 font-black uppercase tracking-widest w-24 text-right">Total (₹)</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {items.map((item, i) => (
                                        <tr key={i} className="group">
                                            <td className="px-4 py-2 space-y-1.5 align-top">
                                                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Item description" className="rounded-lg h-9 border-border/40 font-medium text-xs" />
                                                <Input value={item.specifications?.size || ''} onChange={e => updateItem(i, 'size', e.target.value)} placeholder="Dimensions / Size (optional)" className="rounded-lg h-8 border-border/30 text-xs text-muted-foreground/70" />
                                                <div className="flex gap-2 pt-2">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">Main Photo</label>
                                                        <PhotoUploadZone
                                                            photoUrl={item.photo}
                                                            uploading={item.uploading}
                                                            onFileSelect={(file) => handlePhotoUpload(i, file, 'photo')}
                                                            onRemove={() => { updateItem(i, 'photo', ''); updateItem(i, 'photoPublicId', ''); }}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 block">Fabric</label>
                                                        <PhotoUploadZone
                                                            photoUrl={item.fabricPhoto}
                                                            uploading={item.uploadingFabric}
                                                            onFileSelect={(file) => handlePhotoUpload(i, file, 'fabricPhoto')}
                                                            onRemove={() => { updateItem(i, 'fabricPhoto', ''); updateItem(i, 'fabricPhotoPublicId', ''); }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input type="number" value={item.qty} min={1} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-16" />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-20" />
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <Input type="number" value={item.sellingPrice} min={0} onChange={e => updateItem(i, 'sellingPrice', Number(e.target.value))} className="rounded-lg h-9 border-border/40 text-right font-bold text-xs w-24" />
                                            </td>
                                            <td className="px-3 py-2 text-right align-top">
                                                <span className="font-black text-foreground pt-2 block">₹{(item.totalPrice || 0).toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-2 py-2 align-top">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(i)} className="w-7 h-7 mt-1 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/40">
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Terms */}
                    <Section title="Terms & Conditions">
                        {form.termsAndConditions.map((t, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                <span className="text-muted-foreground/30 font-black text-xs mt-2.5 shrink-0">{i + 1}.</span>
                                <Textarea value={t} rows={1} onChange={e => setForm(f => ({ ...f, termsAndConditions: f.termsAndConditions.map((tt, idx) => idx === i ? e.target.value : tt) }))} className="rounded-xl text-xs font-medium resize-none" />
                                <button onClick={() => setForm(f => ({ ...f, termsAndConditions: f.termsAndConditions.filter((_, idx) => idx !== i) }))} className="mt-2 text-muted-foreground/30 hover:text-rose-500 transition"><Trash2 size={13} /></button>
                            </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, termsAndConditions: [...f.termsAndConditions, ''] }))} className="rounded-xl text-xs font-bold gap-1.5 h-8 text-primary/70">
                            <Plus size={11} /> Add Term
                        </Button>
                    </Section>
                </div>
            </div>
        </motion.div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pb-2 border-b border-border/20">{title}</p>
            {children}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground/60">{label}</Label>
            {children}
        </div>
    );
}

function SumRow({ label, value, cls }: { label: string; value: string; cls?: string }) {
    return (
        <div className="flex justify-between items-center">
            <p className="text-muted-foreground/60 font-bold">{label}</p>
            <p className={`font-bold text-foreground ${cls || ''}`}>{value}</p>
        </div>
    );
}
