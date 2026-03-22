import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Loader2, Plus, Trash2 } from 'lucide-react';
import { useCreatePO, useInventory } from '../hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';

interface POItem {
    itemName: string;
    qty: number;
    unit: string;
    unitRate: number;
}

export default function NewPurchaseOrderPage() {
    const navigate = useNavigate();
    const createPO = useCreatePO();
    const { data: invRaw } = useInventory({ limit: 200 });
    const inventoryItems: any[] = (invRaw as any)?.data ?? [];

    const [vendor, setVendor] = useState({ vendorName: '', vendorContact: '', vendorPhone: '' });
    const [requiredBy, setRequiredBy] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([{ itemName: '', qty: 1, unit: 'pcs', unitRate: 0 }]);
    const [error, setError] = useState('');

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

    const handleSubmit = async () => {
        if (!vendor.vendorName) { setError('Vendor name is required'); return; }
        if (items.some(it => !it.itemName)) { setError('All items need a name'); return; }
        try {
            const res: any = await createPO.mutateAsync({ ...vendor, items, totalAmount, requiredBy: requiredBy || undefined, notes: notes || undefined });
            const poId = res?.data?._id || res?._id;
            navigate(poId ? `/purchase-orders/${poId}` : '/purchase-orders');
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to create purchase order');
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/purchase-orders')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border hover:bg-primary/10 hover:border-primary/30 transition text-muted-foreground hover:text-primary">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-primary/10 text-primary"><ShoppingCart size={18} /></span>
                        Raise Purchase Order
                    </h1>
                    <p className="text-muted-foreground/50 text-xs font-bold mt-1">Create a new procurement request for vendor approval</p>
                </div>
            </div>

            <AnimatePresence>
                {error && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold">{error}</motion.div>}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left */}
                <div className="space-y-5">
                    <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 pb-2 border-b border-border/20">Vendor Details</p>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground/80">Vendor Name *</Label>
                            <Input value={vendor.vendorName} onChange={e => setVendor(v => ({ ...v, vendorName: e.target.value }))} className="rounded-xl h-10" placeholder="e.g. Royal Timber Suppliers" autoFocus />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground/60">Contact Person</Label>
                            <Input value={vendor.vendorContact} onChange={e => setVendor(v => ({ ...v, vendorContact: e.target.value }))} className="rounded-xl h-10" placeholder="Name" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground/60">Phone</Label>
                            <Input value={vendor.vendorPhone} onChange={e => setVendor(v => ({ ...v, vendorPhone: e.target.value }))} className="rounded-xl h-10" placeholder="+91 98765 43210" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground/60">Required By</Label>
                            <Input type="date" value={requiredBy} onChange={e => setRequiredBy(e.target.value)} className="rounded-xl h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-muted-foreground/60">Notes</Label>
                            <Input value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl h-10" placeholder="Any special instructions…" />
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
                        <div className="flex justify-between items-center">
                            <p className="font-black text-foreground">Total Order Value</p>
                            <p className="font-black text-primary text-xl">₹{totalAmount.toLocaleString('en-IN')}</p>
                        </div>
                        {totalAmount >= 50000 && (
                            <p className="text-xs text-amber-500 font-bold mt-2">⚠ Orders ≥ ₹50,000 require Super Admin approval</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => navigate('/purchase-orders')} className="flex-1 rounded-xl h-11 font-bold text-xs border-border/60">Cancel</Button>
                        <Button onClick={handleSubmit} disabled={createPO.isPending} className="flex-1 rounded-xl h-11 font-black text-xs gap-2">
                            {createPO.isPending && <Loader2 size={13} className="animate-spin" />}
                            Raise PO
                        </Button>
                    </div>
                </div>

                {/* Right — Items */}
                <div className="lg:col-span-2">
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Items ({items.length})</p>
                            <Button onClick={addItem} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8 gap-1.5 border-border/60">
                                <Plus size={12} /> Add Row
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/20 text-muted-foreground/50">
                                        <th className="text-left px-4 py-3 font-black uppercase tracking-widest">Item</th>
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
                                                <Select value={item.itemName || 'custom'} onValueChange={v => {
                                                    if (v === 'custom') { updateItem(i, 'itemName', ''); return; }
                                                    const inv = inventoryItems.find((inv: any) => inv._id === v);
                                                    if (inv) { updateItem(i, 'itemName', inv.itemName); updateItem(i, 'unit', inv.unit); updateItem(i, 'unitRate', inv.unitRate || 0); }
                                                }}>
                                                    <SelectTrigger className="rounded-lg h-9 font-bold text-xs border-border/40 mb-1"><SelectValue placeholder="Select from inventory…" /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="custom">Custom item…</SelectItem>
                                                        {inventoryItems.map((inv: any) => <SelectItem key={inv._id} value={inv._id}>{inv.itemName}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Input value={item.itemName} onChange={e => updateItem(i, 'itemName', e.target.value)} placeholder="Item name" className="rounded-lg h-8 border-border/30 text-xs" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.qty} min={1} onChange={e => updateItem(i, 'qty', Number(e.target.value))} className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-16" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className="rounded-lg h-9 border-border/40 text-center font-bold text-xs w-20" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" value={item.unitRate} min={0} onChange={e => updateItem(i, 'unitRate', Number(e.target.value))} className="rounded-lg h-9 border-border/40 text-right font-bold text-xs w-24" />
                                            </td>
                                            <td className="px-3 py-2 text-right font-black text-foreground">
                                                ₹{(item.qty * item.unitRate).toLocaleString('en-IN')}
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
                </div>
            </div>
        </motion.div>
    );
}
