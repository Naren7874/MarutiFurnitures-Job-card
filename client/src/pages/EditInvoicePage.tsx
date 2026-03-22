import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Receipt, Loader2, Plus, Trash2, Check, ChevronDown, X } from 'lucide-react';
import { useInvoice, useUpdateInvoice, useClients, useProjects, useProject, useQuotation } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

interface LineItem {
    category: string;
    description: string;
    qty: number;
    rate: number;
    total: number;
}

const GST_RATES = [0, 5, 9, 12, 18, 28];

export default function EditInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { data: rawInv, isLoading: invLoading } = useInvoice(id!);
    const updateInvoice = useUpdateInvoice(id!);
    
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
        notes: '',
    });
    const [items, setItems] = useState<LineItem[]>([{ category: '', description: '', qty: 1, rate: 0, total: 0 }]);
    const [error, setError] = useState('');
    const [clientOpen, setClientOpen] = useState(false);
    const [projectOpen, setProjectOpen] = useState(false);

    // Auto-fill from project (when manually changed)
    const { data: pData } = useProject(form.projectId);
    const qid = (pData as any)?.data?.quotationId?._id || (pData as any)?.data?.quotationId;
    const { data: qData } = useQuotation(qid || '');

    useEffect(() => {
        // Only auto-fill if the project was manually changed, 
        // not during the initial load of the invoice.
        // We can check if rawInv project matches form project to distinguish.
        const originalProjectId = (rawInv as any)?.data?.projectId?._id || (rawInv as any)?.data?.projectId;
        if (form.projectId && form.projectId !== originalProjectId) {
            const inv = (qData as any)?.data;
            if (inv && inv.items) {
                setItems(inv.items.map((it: any) => ({
                    category: it.category || '',
                    description: it.description,
                    qty: it.qty,
                    rate: it.sellingPrice || it.rate || 0,
                    total: (it.qty * (it.sellingPrice || it.rate || 0))
                })));
                setForm(f => ({ 
                    ...f, 
                    discountPct: inv.discountPct || 0,
                    gstRate: inv.gstRate || 18,
                    gstType: inv.gstType === 'igst' ? 'igst' : 'cgst_sgst'
                }));
            }
        }
    }, [qData, form.projectId, rawInv]);

    useEffect(() => {
        const inv = (rawInv as any)?.data;
        if (inv) {
            setForm({
                clientId: inv.clientId?._id || inv.clientId || '',
                projectId: inv.projectId?._id || inv.projectId || '',
                gstType: inv.gstType || 'cgst_sgst',
                gstRate: inv.gstAmount && inv.amountAfterDiscount ? Math.round((inv.gstAmount / inv.amountAfterDiscount) * 100) : 18,
                discountPct: inv.subtotal ? Math.round((inv.discount / inv.subtotal) * 100) : 0,
                advancePaid: inv.advancePaid || 0,
                dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
                notes: inv.notes || '',
            });
            if (inv.items?.length > 0) {
                setItems(inv.items.map((it: any) => ({
                    category: it.category || '',
                    description: it.description,
                    qty: it.qty,
                    rate: it.rate,
                    total: it.amount || (it.qty * it.rate)
                })));
            }
        }
    }, [rawInv]);

    const filteredProjects = form.clientId 
        ? projects.filter((p: any) => {
            const pClientId = typeof p.clientId === 'object' ? p.clientId?._id : (p.clientId || p.client?._id || p.client);
            return pClientId === form.clientId;
        })
        : projects;

    const updateItem = (i: number, field: keyof LineItem, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            updated[i].total = updated[i].qty * updated[i].rate;
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, { category: '', description: '', qty: 1, rate: 0, total: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const discount = (subtotal * form.discountPct) / 100;
    const taxable = subtotal - discount;
    const gstAmt = (taxable * form.gstRate) / 100;
    const grandTotal = taxable + gstAmt;

    const handleSubmit = async () => {
        if (!form.clientId) { setError('Please select a client'); return; }
        if (items.some(it => !it.category && !it.description)) { setError('All items need a category or description'); return; }
        try {
            await updateInvoice.mutateAsync({
                ...form,
                items: items.map(it => ({ ...it, amount: it.total })),
                subtotal,
                discount,
                grandTotal,
                taxableAmount: taxable,
                gstRate: form.gstRate,
                gstAmount: gstAmt,
                ...(form.gstType === 'cgst_sgst' ? { cgst: gstAmt / 2, sgst: gstAmt / 2, igst: 0 } : { igst: gstAmt, cgst: 0, sgst: 0 }),
            });
            navigate(`/invoices/${id}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to update invoice');
        }
    };

    if (invLoading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin text-primary" />
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(`/invoices/${id}`)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3.5">
                        <span className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner"><Receipt size={20} /></span>
                        Edit Invoice
                    </h1>
                    <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em] opacity-70">Edit Proforma Invoice details for {(rawInv as any)?.data?.invoiceNumber}</p>
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
                <div className="space-y-5">
                    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 pb-2.5 border-b border-border/20">Client & Project</p>

                        <div className="space-y-2.5 pt-2">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 ml-1">Client *</Label>
                            <Popover open={clientOpen} onOpenChange={setClientOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={clientOpen} className="w-full justify-between h-10 rounded-xl font-bold text-xs group">
                                        <span className="truncate">
                                            {form.clientId ? (() => {
                                                const client = clients.find((c: any) => c._id === form.clientId);
                                                return client ? (client.name || client.firmName) : 'Select client...';
                                            })() : "Select client..."}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {form.clientId && (
                                                <div role="button" className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, clientId: '', projectId: '' })); }}>
                                                    <X className="h-3 w-3" />
                                                </div>
                                            )}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 rounded-xl">
                                    <Command>
                                        <CommandInput placeholder="Search client..." className="h-9 text-xs" />
                                        <CommandList>
                                            <CommandEmpty>No client found.</CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((c: any) => (
                                                    <CommandItem key={c._id} value={c.name || c.firmName} onSelect={() => { setForm(f => ({ ...f, clientId: c._id })); setClientOpen(false); }}>
                                                        {c.name || c.firmName}
                                                        <Check className={cn("ml-auto h-4 w-4", form.clientId === c._id ? "opacity-100" : "opacity-0")} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground/60">Project (optional)</Label>
                            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={projectOpen} className="w-full justify-between h-10 rounded-xl font-bold text-xs group">
                                        <span className="truncate">
                                            {form.projectId ? (() => {
                                                const project = projects.find((p: any) => p._id === form.projectId);
                                                return project ? project.projectName : 'Link to project...';
                                            })() : "Link to project..."}
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {form.projectId && (
                                                <div role="button" className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, projectId: '' })); }}>
                                                    <X className="h-3 w-3" />
                                                </div>
                                            )}
                                            <ChevronDown className="h-4 w-4 opacity-50" />
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0 rounded-xl">
                                    <Command>
                                        <CommandInput placeholder="Search project..." className="h-9 text-xs" />
                                        <CommandList>
                                            <CommandEmpty>No project found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem value="none" onSelect={() => { setForm(f => ({ ...f, projectId: '' })); setProjectOpen(false); }}>None</CommandItem>
                                                {filteredProjects.map((p: any) => (
                                                    <CommandItem key={p._id} value={p.projectName} onSelect={() => { setForm(f => ({ ...f, projectId: p._id, clientId: p.clientId?._id || p.clientId || f.clientId })); setProjectOpen(false); }}>
                                                        {p.projectName}
                                                        <Check className={cn("ml-auto h-4 w-4", form.projectId === p._id ? "opacity-100" : "opacity-0")} />
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 pb-2.5 border-b border-border/20">Tax & Dates</p>
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
                            <DatePicker 
                                date={form.dueDate ? parseISO(form.dueDate) : undefined} 
                                setDate={(date) => setForm(f => ({ ...f, dueDate: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                className="h-10 border-border/60 font-bold text-xs"
                            />
                        </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 space-y-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 pb-2.5 border-b border-primary/10">Summary</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground/80 font-bold">Subtotal</span><span className="font-bold">₹{subtotal.toLocaleString('en-IN')}</span></div>
                            {form.discountPct > 0 && <div className="flex justify-between"><span className="text-rose-500/70 font-bold">Discount ({form.discountPct}%)</span><span className="font-bold text-rose-500">-₹{discount.toLocaleString('en-IN')}</span></div>}
                            <div className="flex justify-between"><span className="text-muted-foreground/80 font-bold">GST ({form.gstRate}%)</span><span className="font-bold">₹{gstAmt.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between pt-2 border-t border-primary/15"><span className="font-black text-foreground">Grand Total</span><span className="font-black text-primary text-base">₹{grandTotal.toLocaleString('en-IN')}</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Line Items</p>
                            <Button onClick={addItem} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8 gap-1.5 border-border/60">
                                <Plus size={12} /> Add Row
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/20 text-muted-foreground/50">
                                        <th className="text-left px-5 py-4 font-black uppercase tracking-[0.15em] text-[11px]">Category</th>
                                        <th className="text-center px-4 py-4 font-black uppercase tracking-[0.15em] text-[11px] w-20">Qty</th>
                                        <th className="text-right px-4 py-4 font-black uppercase tracking-[0.15em] text-[11px] w-28">Rate (₹)</th>
                                        <th className="text-right px-5 py-4 font-black uppercase tracking-[0.15em] text-[11px] w-32">Total (₹)</th>
                                        <th className="w-12" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {items.map((item, i) => (
                                        <tr key={i} className="group">
                                            <td className="px-4 py-2">
                                                <Input value={item.category || item.description} onChange={e => updateItem(i, 'category', e.target.value)} placeholder="Item category" className="rounded-lg h-9 border-border/40 font-medium text-xs" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.qty} min={1} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-16" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.rate || ''} min={0} onChange={e => updateItem(i, 'rate', Number(e.target.value))}
                                                    placeholder="0" className="rounded-lg h-9 border-border/40 text-right font-bold text-xs w-24" />
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
                        <Button variant="outline" onClick={() => navigate(`/invoices/${id}`)} className="rounded-xl h-11 px-6 font-bold text-xs border-border/60">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={updateInvoice.isPending} className="rounded-xl h-11 px-8 font-black text-xs gap-2">
                            {updateInvoice.isPending && <Loader2 size={13} className="animate-spin" />}
                            Update Proforma Invoice
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
