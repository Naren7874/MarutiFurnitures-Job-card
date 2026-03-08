import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCreateInvoice, useClients, useProjects } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface LineItem {
    description: string;
    qty: number;
    unit: string;
    rate: number;
    total: number;
}

const GST_RATES = [0, 5, 12, 18, 28];

export default function NewInvoicePage() {
    const navigate = useNavigate();
    const createInvoice = useCreateInvoice();
    const { data: clientsRaw } = useClients({ limit: 100 });
    const clients: any[] = (clientsRaw as any)?.data ?? [];
    const { data: projectsRaw } = useProjects({ limit: 100 });
    const projects: any[] = (projectsRaw as any)?.data ?? [];

    const [form, setForm] = useState({
        clientId: '',
        projectId: '',
        gstType: 'cgst_sgst' as 'cgst_sgst' | 'igst',
        gstRate: 18,
        discountPct: 0,
        advancePaid: 0,
        dueDate: '',
    });
    const [items, setItems] = useState<LineItem[]>([{ description: '', qty: 1, unit: 'unit', rate: 0, total: 0 }]);
    const [error, setError] = useState('');

    const updateItem = (i: number, field: keyof LineItem, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            updated[i].total = updated[i].qty * updated[i].rate;
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, { description: '', qty: 1, unit: 'unit', rate: 0, total: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const discount = (subtotal * form.discountPct) / 100;
    const taxable = subtotal - discount;
    const gstAmt = (taxable * form.gstRate) / 100;
    const grandTotal = taxable + gstAmt;

    const handleSubmit = async () => {
        if (!form.clientId) { setError('Please select a client'); return; }
        if (items.some(it => !it.description)) { setError('All items need a description'); return; }
        try {
            const res: any = await createInvoice.mutateAsync({
                ...form,
                items,
                subtotal,
                discount,
                [form.gstType === 'cgst_sgst' ? 'cgst' : 'igst']: gstAmt / (form.gstType === 'cgst_sgst' ? 1 : 1),
                ...(form.gstType === 'cgst_sgst' ? { cgst: gstAmt / 2, sgst: gstAmt / 2 } : { igst: gstAmt }),
                grandTotal,
            });
            navigate(`/invoices/${res?.data?._id || res?._id || ''}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to create invoice');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/invoices')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-primary/10 text-primary"><Receipt size={18} /></span>
                        New Invoice
                    </h1>
                    <p className="text-muted-foreground/50 text-xs font-bold mt-1">Create and issue a new invoice to your client</p>
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold">
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left — Client + Settings */}
                <div className="space-y-5">
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pb-2 border-b border-border/20">Client & Project</p>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Client *</Label>
                            <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                                <SelectTrigger className="rounded-xl h-10 font-bold text-xs"><SelectValue placeholder="Select client…" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {clients.map((c: any) => <SelectItem key={c._id} value={c._id}>{c.firmName || c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Project (optional)</Label>
                            <Select value={form.projectId || 'none'} onValueChange={v => setForm(f => ({ ...f, projectId: v === 'none' ? '' : v }))}>
                                <SelectTrigger className="rounded-xl h-10 font-bold text-xs"><SelectValue placeholder="Link to project…" /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none">None</SelectItem>
                                    {projects.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.projectName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl p-5 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 pb-2 border-b border-border/20">Tax & Dates</p>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">GST Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['cgst_sgst', 'igst'] as const).map(t => (
                                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, gstType: t }))}
                                        className={cn('py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all',
                                            form.gstType === t ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                                        {t === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">GST Rate</Label>
                            <Select value={String(form.gstRate)} onValueChange={v => setForm(f => ({ ...f, gstRate: Number(v) }))}>
                                <SelectTrigger className="rounded-xl h-10 font-bold text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Discount (%)</Label>
                            <Input type="number" min="0" max="100" value={form.discountPct} onChange={e => setForm(f => ({ ...f, discountPct: Number(e.target.value) }))} className="rounded-xl h-10" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Advance Paid (₹)</Label>
                            <Input type="number" min="0" value={form.advancePaid} onChange={e => setForm(f => ({ ...f, advancePaid: Number(e.target.value) }))} className="rounded-xl h-10" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Due Date</Label>
                            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="rounded-xl h-10" />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 pb-2 border-b border-primary/10">Summary</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground/60 font-bold">Subtotal</span><span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span></div>
                            {form.discountPct > 0 && <div className="flex justify-between"><span className="text-rose-500/70 font-bold">Discount ({form.discountPct}%)</span><span className="font-bold text-rose-500">-₹{discount.toLocaleString('en-IN')}</span></div>}
                            <div className="flex justify-between"><span className="text-muted-foreground/60 font-bold">GST ({form.gstRate}%)</span><span className="font-bold">₹{gstAmt.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between pt-2 border-t border-primary/15"><span className="font-black text-foreground">Grand Total</span><span className="font-black text-primary text-base">₹{grandTotal.toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                </div>

                {/* Right — Line Items */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-card/20 border border-border/30 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Line Items</p>
                            <Button onClick={addItem} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8 gap-1.5 border-border/60">
                                <Plus size={12} /> Add Row
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/20 text-muted-foreground/50">
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Description</th>
                                        <th className="text-center px-3 py-3 font-black uppercase tracking-widest w-16">Qty</th>
                                        <th className="text-center px-3 py-3 font-black uppercase tracking-widest w-20">Unit</th>
                                        <th className="text-right px-3 py-3 font-black uppercase tracking-widest w-24">Rate (₹)</th>
                                        <th className="text-right px-3 py-3 font-black uppercase tracking-widest w-24">Total (₹)</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {items.map((item, i) => (
                                        <tr key={i} className="group">
                                            <td className="px-4 py-2">
                                                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                                                    placeholder="Item description" className="rounded-lg h-9 border-border/40 font-medium text-xs" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.qty} min={1} onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                                                    className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-16" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}
                                                    className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-20" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.rate} min={0} onChange={e => updateItem(i, 'rate', Number(e.target.value))}
                                                    className="rounded-lg h-9 border-border/40 text-right font-bold text-xs w-24" />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <span className="font-black text-foreground">₹{item.total.toLocaleString('en-IN')}</span>
                                            </td>
                                            <td className="px-2 py-2">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(i)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/40">
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

                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => navigate('/invoices')} className="rounded-xl h-11 px-6 font-bold text-xs border-border/60">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createInvoice.isPending} className="rounded-xl h-11 px-8 font-black text-xs gap-2">
                            {createInvoice.isPending && <Loader2 size={13} className="animate-spin" />}
                            Create Invoice
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
