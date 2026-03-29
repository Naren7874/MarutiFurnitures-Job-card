import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, Loader2, Plus, Trash2, 
    ShieldAlert, Info, Package, 
    ArrowRight, Calculator, UserCircle, Calendar
} from 'lucide-react';
import { useCreatePO, useInventory } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

interface POItem {
    itemName: string;
    qty: number;
    unit: string;
    unitRate: number;
}

export default function NewPurchaseOrderPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const createPO = useCreatePO();
    const { data: invRaw } = useInventory({ limit: 200 });
    const inventoryItems: any[] = (invRaw as any)?.data ?? [];

    const [vendor, setVendor] = useState({ vendorName: '', vendorContact: '', vendorPhone: '' });
    const [requiredBy, setRequiredBy] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([{ itemName: '', qty: 1, unit: 'pcs', unitRate: 0 }]);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const prefilledName = searchParams.get('itemName');
        if (prefilledName) {
            setItems([{ itemName: prefilledName, qty: 1, unit: 'pcs', unitRate: 0 }]);
        }
    }, [searchParams]);

    const updateItem = (i: number, field: keyof POItem, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], [field]: value };
            return updated;
        });
    };

    const addItem = () => setItems(prev => [...prev, { itemName: '', qty: 1, unit: 'pcs', unitRate: 0 }]);
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const totalAmount = items.reduce((s, it) => s + (it.qty * it.unitRate), 0);
    const isHighValue = totalAmount >= 50000;

    const handleSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!vendor.vendorName) errors.vendorName = 'Vendor name is required';
        if (vendor.vendorPhone && vendor.vendorPhone.length !== 10) errors.vendorPhone = 'Must be exactly 10 digits';
        if (!requiredBy) errors.requiredBy = 'Delivery target date is required';
        
        items.forEach((it, i) => {
            if (!it.itemName) errors[`item_${i}_name`] = 'Required';
            if (it.qty <= 0) errors[`item_${i}_qty`] = 'Must be > 0';
            if (it.unitRate <= 0) errors[`item_${i}_rate`] = 'Rate required';
        });

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setError('Please correct the highlighted errors before finalizing.');
            return;
        }

        setError('');
        setFieldErrors({});

        try {
            const payload = {
                supplier: vendor.vendorName,
                vendorContact: vendor.vendorContact,
                vendorPhone: vendor.vendorPhone,
                expectedDate: requiredBy || undefined,
                notes: notes || undefined,
                items: items.map(it => {
                    const inv = inventoryItems.find(invIt => invIt.itemName === it.itemName);
                    return {
                        inventoryId: inv?._id || undefined,
                        materialName: it.itemName,
                        qty: it.qty,
                        unit: it.unit,
                        pricePerUnit: it.unitRate,
                        totalPrice: it.qty * it.unitRate
                    };
                }),
                totalAmount
            };

            const res: any = await createPO.mutateAsync(payload);
            const poId = res?.data?._id || res?._id;
            navigate(poId ? `/purchase-orders/${poId}` : '/purchase-orders');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to create purchase order');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-linear-to-b from-background to-muted/20 p-2 md:p-4 max-w-full mx-auto space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button onClick={() => navigate('/purchase-orders')} 
                        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary transition-colors">
                        <div className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                            <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        Back to Procurement
                    </button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-foreground lowercase flex items-end gap-3">
                            Raise <span className="text-primary italic">Purchase</span> Order
                        </h1>
                        <p className="text-muted-foreground/50 text-xs font-bold mt-2 uppercase tracking-widest">Inventory Replenishment & Vendor Request</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="rounded-2xl h-12 px-6 font-black text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:bg-muted/50 transition-all">Discard</Button>
                    <Button onClick={handleSubmit} disabled={createPO.isPending} 
                        className="rounded-2xl h-12 px-8 font-black text-[10px] uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 active:scale-95 transition-all">
                        {createPO.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                        Finalize Request
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-3">
                        <ShieldAlert size={18} />
                        <span className="text-xs font-black uppercase tracking-tight">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Sidebar: Config ── */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Vendor Identity */}
                    <div className="rounded-[2rem] bg-card border border-border/40 p-6 space-y-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <UserCircle size={120} />
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10">
                                    <UserCircle size={18} className="text-primary/60" />
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground/80">Vendor Identity</h3>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Vendor Entity Name *</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                                            <div className="w-1 h-6 bg-primary rounded-full ml-1" />
                                        </div>
                                        <Input value={vendor.vendorName} onChange={e => {
                                            setVendor(v => ({ ...v, vendorName: e.target.value }));
                                            if (fieldErrors.vendorName) setFieldErrors(p => { const n = { ...p }; delete n.vendorName; return n; });
                                        }} 
                                            className={cn("rounded-2xl h-14 bg-muted/20 border-border/10 px-6 font-bold text-sm focus-visible:ring-primary/20 transition-all placeholder:font-medium placeholder:text-muted-foreground/30", fieldErrors.vendorName && "border-rose-500/50 bg-rose-500/5")}
                                            placeholder="Enter registered vendor name" autoFocus />
                                    </div>
                                    {fieldErrors.vendorName && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1.5 px-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.vendorName}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Contact Person</Label>
                                        <Input value={vendor.vendorContact} onChange={e => setVendor(v => ({ ...v, vendorContact: e.target.value }))} 
                                            className="rounded-2xl h-12 bg-muted/10 border-border/5 px-4 font-bold text-xs" placeholder="Full name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Phone Line</Label>
                                        <Input value={vendor.vendorPhone} onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setVendor(v => ({ ...v, vendorPhone: val }));
                                            if (fieldErrors.vendorPhone) setFieldErrors(p => { const n = { ...p }; delete n.vendorPhone; return n; });
                                        }} 
                                            className={cn("rounded-2xl h-12 bg-muted/10 border-border/5 px-4 font-bold text-xs", fieldErrors.vendorPhone && "border-rose-500/50 bg-rose-500/5")} placeholder="+91..." />
                                        {fieldErrors.vendorPhone && <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.vendorPhone}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border/5" />

                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10">
                                    <Calendar size={18} className="text-amber-500/60" />
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-foreground/80">Delivery Target</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 text-amber-600/60">Expected Arrival</Label>
                                    <DatePicker 
                                        date={requiredBy ? parseISO(requiredBy) : undefined} 
                                        setDate={(date) => {
                                            setRequiredBy(date ? format(date, 'yyyy-MM-dd') : '');
                                            if (fieldErrors.requiredBy) setFieldErrors(p => { const n = { ...p }; delete n.requiredBy; return n; });
                                        }}
                                        className={cn("h-14 rounded-2xl border-border/10 bg-muted/10 font-bold text-xs px-6 hover:bg-muted/20 transition-colors", fieldErrors.requiredBy && "border-rose-500/50 bg-rose-500/5")}
                                    />
                                    {fieldErrors.requiredBy && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1.5 px-1 animate-in fade-in slide-in-from-top-1">{fieldErrors.requiredBy}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">Internal Notes</Label>
                                    <Input value={notes} onChange={e => setNotes(e.target.value)} 
                                        className="rounded-2xl h-14 bg-muted/10 border-border/5 px-6 font-bold text-xs" placeholder="Special requirements..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className={cn(
                        "rounded-[2rem] p-6 border transition-all duration-500 relative overflow-hidden group/summary",
                        isHighValue ? "bg-amber-500/5 border-amber-500/20 shadow-xl shadow-amber-500/5" : "bg-primary/5 border-primary/20 shadow-xl shadow-primary/5"
                    )}>
                        <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover/summary:scale-110 transition-transform duration-700">
                            <Calculator size={100} />
                        </div>
                        
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Purchase Valuation</p>
                                <div className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", isHighValue ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/10")}>
                                    {isHighValue ? 'Approval Required' : 'Standard PO'}
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <p className={cn("text-5xl font-black tracking-tighter italic transition-colors", isHighValue ? "text-amber-500" : "text-primary")}>₹{totalAmount.toLocaleString('en-IN')}</p>
                                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic flex items-center gap-1.5">
                                    <Info size={10} /> Comprehensive valuation including all listed items
                                </p>
                            </div>

                            {isHighValue && (
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/10 space-y-2">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <ShieldAlert size={14} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">High Value Threshold</p>
                                    </div>
                                    <p className="text-[10px] font-medium text-amber-800/60 leading-relaxed italic">Orders exceeding ₹50k trigger an automated administrative review workflow.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Main: Line Items ── */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="rounded-[2rem] bg-card border border-border/40 overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                        <div className="px-6 py-6 border-b border-border/10 flex items-center justify-between bg-card/50 backdrop-blur-xl sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[1.2rem] bg-muted/30 flex items-center justify-center border border-border/10 shadow-sm transition-transform hover:rotate-12">
                                    <Package size={20} className="text-muted-foreground/50" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-[0.15em] text-foreground/80 leading-none">Line Item Declaration</h3>
                                    <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest mt-2">{items.length} items manifest registered</p>
                                </div>
                            </div>
                            
                            <Button onClick={addItem} variant="outline" className="rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest gap-2 bg-background hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all group/add shadow-sm">
                                <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" /> Append Item
                            </Button>
                        </div>
                        
                        <div className="overflow-x-auto flex-1 scrollbar-hide">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/10 text-muted-foreground/30 border-b border-border/5">
                                        <th className="text-left px-6 py-4 font-black uppercase tracking-[0.15em] w-1/2">Item Description & Classification</th>
                                        <th className="text-center px-4 py-4 font-black uppercase tracking-[0.15em]">Qty</th>
                                        <th className="text-center px-4 py-4 font-black uppercase tracking-[0.15em]">Metric</th>
                                        <th className="text-right px-4 py-4 font-black uppercase tracking-[0.15em]">Rate (₹)</th>
                                        <th className="text-right px-6 py-4 font-black uppercase tracking-[0.15em]">Extension (₹)</th>
                                        <th className="w-16" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/5">
                                    <AnimatePresence initial={false}>
                                        {items.map((item, i) => (
                                            <motion.tr key={i} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                                className="group hover:bg-primary/1 transition-colors relative">
                                                <td className="px-6 py-5">
                                                    <div className="space-y-3">
                                                        <Select value={item.itemName || 'custom'} onValueChange={v => {
                                                            if (v === 'custom') { updateItem(i, 'itemName', ''); return; }
                                                            const inv = inventoryItems.find((inv: any) => inv._id === v);
                                                            if (inv) { 
                                                                updateItem(i, 'itemName', inv.itemName); 
                                                                updateItem(i, 'unit', inv.unit); 
                                                                updateItem(i, 'unitRate', inv.unitRate || 0); 
                                                            }
                                                        }}>
                                                            <SelectTrigger className="rounded-xl h-12 bg-muted/10 border-border/5 font-black text-[11px] uppercase tracking-wider text-muted-foreground focus:ring-primary/10 transition-all hover:bg-muted/20">
                                                                <SelectValue placeholder="Catalog Selection..." />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-2xl border-border/20 shadow-2xl">
                                                                <SelectItem value="custom" className="text-[10px] font-black uppercase tracking-widest text-primary/60">Manual Override / Custom Item</SelectItem>
                                                                <div className="h-px bg-muted my-2" />
                                                                {inventoryItems.map((inv: any) => (
                                                                    <SelectItem key={inv._id} value={inv._id} className="text-[10px] font-bold uppercase tracking-tight py-2.5">
                                                                        {inv.itemName} <span className="ml-2 opacity-30 text-[8px]">In Stock: {inv.currentStock}</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input value={item.itemName} onChange={e => {
                                                            updateItem(i, 'itemName', e.target.value);
                                                            if (fieldErrors[`item_${i}_name`]) setFieldErrors(p => { const n = { ...p }; delete n[`item_${i}_name`]; return n; });
                                                        }} 
                                                            placeholder="Declaration label..." 
                                                            className={cn("rounded-xl h-10 border-border/5 bg-transparent font-medium text-sm placeholder:text-muted-foreground/20 italic", fieldErrors[`item_${i}_name`] && "border-rose-500/40")} />
                                                        {fieldErrors[`item_${i}_name`] && <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter animate-in fade-in slide-in-from-top-1">Name required</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <Input type="number" value={item.qty} min={1} onChange={e => {
                                                        updateItem(i, 'qty', Number(e.target.value));
                                                        if (fieldErrors[`item_${i}_qty`]) setFieldErrors(p => { const n = { ...p }; delete n[`item_${i}_qty`]; return n; });
                                                    }} 
                                                        className={cn("rounded-xl h-12 bg-muted/10 border-border/5 text-center font-black text-sm w-20 mx-auto transition-transform focus:scale-105", fieldErrors[`item_${i}_qty`] && "border-rose-500/40 bg-rose-500/5")} />
                                                    {fieldErrors[`item_${i}_qty`] && <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1 animate-in fade-in slide-in-from-top-1">{fieldErrors[`item_${i}_qty`]}</p>}
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    <Select value={item.unit} onValueChange={v => updateItem(i, 'unit', v)}>
                                                        <SelectTrigger className="rounded-xl h-12 bg-muted/10 border-border/5 font-bold text-[10px] uppercase tracking-widest w-24 mx-auto">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {['pcs', 'kg', 'm', 'sqft', 'ft', 'sheets', 'liters', 'packets'].map(u => (
                                                                <SelectItem key={u} value={u} className="text-[10px] font-bold uppercase tracking-tight">{u}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-6 text-right">
                                                    <div className="relative group/rate w-32 ml-auto">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/30 group-focus-within/rate:text-primary transition-colors">₹</span>
                                                        <Input type="number" value={item.unitRate} min={0} onChange={e => {
                                                            updateItem(i, 'unitRate', Number(e.target.value));
                                                            if (fieldErrors[`item_${i}_rate`]) setFieldErrors(p => { const n = { ...p }; delete n[`item_${i}_rate`]; return n; });
                                                        }} 
                                                            className={cn("rounded-xl h-12 bg-muted/10 border-border/5 text-right font-black text-sm pl-8 transition-transform focus:scale-105", fieldErrors[`item_${i}_rate`] && "border-rose-500/40 bg-rose-500/5")} />
                                                    </div>
                                                    {fieldErrors[`item_${i}_rate`] && <p className="text-[8px] font-black text-rose-500 uppercase tracking-tighter mt-1 animate-in fade-in slide-in-from-top-1">Rate Required</p>}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="text-sm font-black text-foreground italic tracking-tight">₹{(item.qty * item.unitRate).toLocaleString('en-IN')}</p>
                                                </td>
                                                <td className="px-6 py-6 text-right">
                                                    {items.length > 1 && (
                                                        <button onClick={() => removeItem(i)} 
                                                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/20 active:scale-95 shadow-sm hover:border border-rose-500/10">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {items.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center py-24 italic opacity-20">
                                <Package size={48} className="mb-4" />
                                <p className="text-xs uppercase tracking-[0.3em] font-black">Null Items Registered</p>
                            </div>
                        )}

                        <div className="p-6 border-t border-border/5 bg-muted/5 flex justify-between items-center italic">
                            <div className="flex items-center gap-3 text-muted-foreground/40 text-[9px] font-bold uppercase tracking-[0.2em]">
                                <Info size={12} /> Unit rates are subject to vendor confirmation
                            </div>
                            <div className="flex items-center gap-4 text-primary">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Subtotal</span>
                                <span className="text-xl font-black tracking-tighter italic">₹{totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
