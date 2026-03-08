import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Save, Loader2,
    User2, FileText, ReceiptText, Search,
} from 'lucide-react';
import { useCreateQuotation, useCreateClient, useClients } from '../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { apiUpload } from '../lib/axios';


// ── Types ────────────────────────────────────────────────────────────────────

interface Item {
    id: string;
    srNo: number;
    category: string;
    description: string;
    size: string;
    polish: string;
    material: string;
    qty: number;
    mrp: number;
    sellingPrice: number;
    totalPrice: number;
    photo: string;      // Cloudinary URL
    photoPublicId: string;
    uploading: boolean;
    fabricPhoto: string;   // Secondary Cloudinary URL
    fabricPhotoPublicId: string;
    uploadingFabric: boolean;
}

const makeItem = (srNo: number): Item => ({
    id: crypto.randomUUID(),
    srNo,
    category: '',
    description: '',
    size: '',
    polish: '',
    material: '',
    qty: 1,
    mrp: 0,
    sellingPrice: 0,
    totalPrice: 0,
    photo: '',
    photoPublicId: '',
    uploading: false,
    fabricPhoto: '',
    fabricPhotoPublicId: '',
    uploadingFabric: false,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewQuotationPage() {
    const navigate = useNavigate();
    const createQuotation = useCreateQuotation();
    const createClient = useCreateClient();

    // Client search state
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [newClient, setNewClient] = useState({ name: '', phone: '', clientType: 'direct_client', firmName: '' });
    const [creatingClient, setCreatingClient] = useState(false);

    const { data: clientsRaw } = useClients({ search: clientSearch, limit: 10 });
    const clients: any[] = (clientsRaw as any)?.data ?? [];

    // Project info
    const [project, setProject] = useState({
        projectName: '',
        architect: '',
        deliveryDays: '',
        validUntil: '',
        siteAddress: { line1: '', city: '', state: '', pincode: '' },
    });

    // Items
    const [items, setItems] = useState<Item[]>([makeItem(1)]);

    // Discount
    const [discount, setDiscount] = useState(0);
    const [gstType, setGstType] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');
    const [advancePercent, setAdvancePercent] = useState(50);

    // Terms
    const [terms, setTerms] = useState([
        'Prices are subject to change if site conditions differ.',
        'Payment: 50% advance, 50% before dispatch.',
        'Delivery: As per schedule mutually agreed.',
        'Transport, site unloading & installation charges extra.',
    ]);

    // ── Calculations ─────────────────────────────────────────────────────────

    const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.sellingPrice, 0), [items]);
    const amountAfterDiscount = subtotal - discount;
    const gstAmount = amountAfterDiscount * 0.18;
    const grandTotal = amountAfterDiscount + gstAmount;
    const advanceAmount = (grandTotal * advancePercent) / 100;

    // ── Item management ───────────────────────────────────────────────────────

    const updateItem = useCallback((id: string, field: keyof Item, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.qty * updated.sellingPrice;
            return updated;
        }));
    }, []);

    const addItem = () => setItems(prev => [...prev, makeItem(prev.length + 1)]);
    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id).map((i, idx) => ({ ...i, srNo: idx + 1 })));

    // ── Photo upload ──────────────────────────────────────────────────────────

    const handlePhotoUpload = useCallback(async (itemId: string, file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        if (!file) return;
        const uploadingKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const publicIdKey = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';

        updateItem(itemId, uploadingKey, true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/quotations/upload-item-photo', fd);

            updateItem(itemId, type, res.url);
            updateItem(itemId, publicIdKey, res.publicId);
        } catch (err) {
            console.error('Upload failed', err);
        } finally {
            updateItem(itemId, uploadingKey, false);
        }
    }, [updateItem]);

    // ── Client creation inline ────────────────────────────────────────────────

    const handleCreateClient = async () => {
        if (!newClient.name || !newClient.phone) return;
        setCreatingClient(true);
        try {
            const res: any = await createClient.mutateAsync(newClient);
            setSelectedClient(res?.data);
            setShowNewClientForm(false);
            setShowClientDrop(false);
        } finally {
            setCreatingClient(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) {
            alert('Please select or create a client.');
            return;
        }

        await createQuotation.mutateAsync({
            clientId: selectedClient._id,
            ...project,
            items: items.map(({ id, totalPrice, uploading, uploadingFabric, ...rest }) => ({
                ...rest,
                totalPrice: rest.qty * rest.sellingPrice,
            })),
            discount,
            gstType,
            advancePercent,
            termsAndConditions: terms,
        });
        navigate('/quotations');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-6xl mx-auto space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <button type="button" onClick={() => navigate(-1)} className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors"><ArrowLeft size={16} /></div>
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">New Quotation</p>
                </div>
            </div>

            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tighter mb-2">Create Quotation</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">Build a professional quotation for your client.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">

                {/* === Section 1: Client & Project === */}
                <FormSection title="Client & Project" icon={User2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client search */}
                        <div className="md:col-span-2">
                            <label className={labelCls}>Client *</label>
                            {selectedClient ? (
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border-2 border-primary/30">
                                    <div>
                                        <p className="font-black text-sm text-foreground">{selectedClient.firmName || selectedClient.name}</p>
                                        <p className="text-muted-foreground/60 text-xs font-medium">{selectedClient.phone} · {selectedClient.clientType?.replace('_', ' ')}</p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-xs font-bold text-rose-500 hover:text-rose-400">Change</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                        <Input
                                            value={clientSearch}
                                            onChange={(e) => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                                            onFocus={() => setShowClientDrop(true)}
                                            placeholder="Search client by name, firm, or phone..."
                                            className={cn(inputCls, 'pl-10')}
                                        />
                                    </div>
                                    <AnimatePresence>
                                        {showClientDrop && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                                            >
                                                {clients.map((c: any) => (
                                                    <button
                                                        key={c._id}
                                                        type="button"
                                                        onClick={() => { setSelectedClient(c); setShowClientDrop(false); setClientSearch(''); }}
                                                        className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors text-left border-b border-border/30 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black mt-0.5">
                                                            {(c.firmName || c.name)?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-foreground">{c.firmName || c.name}</p>
                                                            <p className="text-[10px] text-muted-foreground/50 font-medium">{c.phone} · {c.clientType?.replace('_', ' ')}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewClientForm(v => !v); setShowClientDrop(false); }}
                                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-primary hover:bg-primary/5 transition-colors text-sm font-black"
                                                >
                                                    <Plus size={14} /> Create New Client Inline
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Inline new client form */}
                            <AnimatePresence>
                                {showNewClientForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 p-5 rounded-2xl border border-primary/20 bg-primary/3 space-y-4 overflow-hidden"
                                    >
                                        <p className="text-xs font-black uppercase tracking-wider text-primary">Quick Create Client</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>Name *</label>
                                                <Input value={newClient.name} onChange={(e) => setNewClient(p => ({ ...p, name: e.target.value }))} placeholder="Contact name" className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Phone *</label>
                                                <Input value={newClient.phone} onChange={(e) => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="+91..." className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Firm Name</label>
                                                <Input value={newClient.firmName} onChange={(e) => setNewClient(p => ({ ...p, firmName: e.target.value }))} placeholder="Company name" className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Type</label>
                                                <Select value={newClient.clientType} onValueChange={(v) => setNewClient(p => ({ ...p, clientType: v }))}>
                                                    <SelectTrigger className={cn(inputCls, 'w-full')}><SelectValue /></SelectTrigger>
                                                    <SelectContent className="rounded-2xl">
                                                        <SelectItem value="direct_client">Direct Client</SelectItem>
                                                        <SelectItem value="architect">Architect</SelectItem>
                                                        <SelectItem value="designer">Designer</SelectItem>
                                                        <SelectItem value="contractor">Contractor</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button type="button" onClick={handleCreateClient} disabled={creatingClient || !newClient.name || !newClient.phone} className="h-10 px-5 rounded-xl font-bold text-xs gap-2">
                                                {creatingClient ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create & Select
                                            </Button>
                                            <Button type="button" variant="ghost" onClick={() => setShowNewClientForm(false)} className="h-10 px-4 rounded-xl text-xs font-bold text-muted-foreground">Cancel</Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Project fields */}
                        <div>
                            <label className={labelCls}>Project Name *</label>
                            <Input required value={project.projectName} onChange={(e) => setProject(p => ({ ...p, projectName: e.target.value }))} placeholder="e.g. GMP Office — 3rd Floor" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Architect / Consultant</label>
                            <Input value={project.architect} onChange={(e) => setProject(p => ({ ...p, architect: e.target.value }))} placeholder="e.g. Ar. Dreamscape" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Delivery Period</label>
                            <Input value={project.deliveryDays} onChange={(e) => setProject(p => ({ ...p, deliveryDays: e.target.value }))} placeholder="e.g. 75 to 90 days" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Valid Until</label>
                            <Input type="date" value={project.validUntil} onChange={(e) => setProject(p => ({ ...p, validUntil: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Site City</label>
                            <Input value={project.siteAddress.city} onChange={(e) => setProject(p => ({ ...p, siteAddress: { ...p.siteAddress, city: e.target.value } }))} placeholder="City" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Site State</label>
                            <Input value={project.siteAddress.state} onChange={(e) => setProject(p => ({ ...p, siteAddress: { ...p.siteAddress, state: e.target.value } }))} placeholder="State" className={inputCls} />
                        </div>
                    </div>
                </FormSection>

                {/* === Section 2: Items === */}
                <FormSection title="Quotation Items" icon={FileText}>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {items.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-5 bg-card border border-border/60 rounded-2xl space-y-4 relative group"
                                >
                                    {/* Item number + delete */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-lg">Item {item.srNo}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length === 1}
                                            className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/30 hover:text-rose-400 disabled:opacity-0"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5">
                                        {/* ── Photo Upload Zones ─────────────────── */}
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className={labelCls}>Main Photo</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.photo}
                                                    uploading={item.uploading}
                                                    onFileSelect={(file) => handlePhotoUpload(item.id, file, 'photo')}
                                                    onRemove={() => { updateItem(item.id, 'photo', ''); updateItem(item.id, 'photoPublicId', ''); }}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Fabric / Material</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.fabricPhoto}
                                                    uploading={item.uploadingFabric}
                                                    onFileSelect={(file) => handlePhotoUpload(item.id, file, 'fabricPhoto')}
                                                    onRemove={() => { updateItem(item.id, 'fabricPhoto', ''); updateItem(item.id, 'fabricPhotoPublicId', ''); }}
                                                />
                                            </div>
                                        </div>

                                        {/* ── Item Fields ───────────────────────── */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2">
                                                <label className={labelCls}>Description *</label>
                                                <Input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. 2 Seater Sofa" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Category</label>
                                                <Input value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)} placeholder="e.g. Reception Area" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Size</label>
                                                <Input value={item.size} onChange={(e) => updateItem(item.id, 'size', e.target.value)} placeholder='L×W×H' className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Material</label>
                                                <Input value={item.material} onChange={(e) => updateItem(item.id, 'material', e.target.value)} placeholder="e.g. BWR Ply + Laminate" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Polish / Finish</label>
                                                <Input value={item.polish} onChange={(e) => updateItem(item.id, 'polish', e.target.value)} placeholder="e.g. Natural Teak" className={smallInputCls} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Pricing Row ─────────────────────────── */}
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-border/30">
                                        <div>
                                            <label className={labelCls}>Qty</label>
                                            <Input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))} className={smallInputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>MRP (₹)</label>
                                            <Input type="number" min="0" value={item.mrp || ''} onChange={(e) => updateItem(item.id, 'mrp', Number(e.target.value))} placeholder="0" className={smallInputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Selling Price (₹) *</label>
                                            <Input type="number" min="0" required value={item.sellingPrice || ''} onChange={(e) => updateItem(item.id, 'sellingPrice', Number(e.target.value))} placeholder="0" className={smallInputCls} />
                                        </div>
                                        <div className="col-span-2 flex items-end gap-2">
                                            <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                                                <p className="text-[9px] font-black uppercase tracking-wider text-primary/60 mb-0.5">Total</p>
                                                <p className="font-black text-foreground text-sm">₹{(item.qty * item.sellingPrice).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <Button type="button" variant="outline" onClick={addItem} className="w-full h-11 rounded-2xl border-dashed border-border font-bold text-sm gap-2 hover:border-primary/30 hover:bg-primary/3 transition-all text-muted-foreground hover:text-primary">
                            <Plus size={14} /> Add Item
                        </Button>
                    </div>
                </FormSection>

                {/* === Section 3: Totals & Terms === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Financial Summary */}
                    <FormSection title="Financial Summary" icon={ReceiptText}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-muted-foreground/60">Subtotal</p>
                                <p className="font-black text-foreground">₹{subtotal.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-bold text-muted-foreground/60 shrink-0">Discount</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground/40 font-bold">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={discount || ''}
                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                        placeholder="0"
                                        className="h-9 w-32 rounded-xl text-right font-black text-sm border-border/50"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-bold text-muted-foreground/60">Amount After Discount</p>
                                <p className="font-black text-foreground">₹{amountAfterDiscount.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-bold text-muted-foreground/60">GST Type</p>
                                <Select value={gstType} onValueChange={(v: any) => setGstType(v)}>
                                    <SelectTrigger className="h-9 w-36 rounded-xl text-xs font-bold border-border/50"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="cgst_sgst">CGST + SGST (18%)</SelectItem>
                                        <SelectItem value="igst">IGST (18%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-bold text-muted-foreground/60">GST (18%)</p>
                                <p className="font-black text-foreground">₹{gstAmount.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-border/40">
                                <p className="font-black text-foreground text-base">Grand Total</p>
                                <p className="font-black text-primary text-xl">₹{grandTotal.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-bold text-muted-foreground/60">Advance %</p>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={advancePercent}
                                        onChange={(e) => setAdvancePercent(Number(e.target.value))}
                                        className="h-9 w-20 rounded-xl text-right font-black text-sm border-border/50"
                                    />
                                    <span className="text-muted-foreground/40 font-bold">%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <p className="font-bold text-muted-foreground/60">Advance Amount</p>
                                <p className="font-black text-emerald-500">₹{advanceAmount.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </FormSection>

                    {/* Terms & Conditions */}
                    <FormSection title="Terms & Conditions" icon={FileText}>
                        <div className="space-y-3">
                            {terms.map((t, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-muted-foreground/30 font-black text-xs mt-3">{i + 1}.</span>
                                    <Input
                                        value={t}
                                        onChange={(e) => setTerms(prev => prev.map((item, idx) => idx === i ? e.target.value : item))}
                                        className={cn(smallInputCls, 'flex-1')}
                                    />
                                    <button type="button" onClick={() => setTerms(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground/20 hover:text-rose-400 transition-colors mt-2.5 shrink-0">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setTerms(prev => [...prev, ''])}
                                className="text-xs font-bold gap-1.5 text-muted-foreground hover:text-primary h-9"
                            >
                                <Plus size={12} /> Add Term
                            </Button>
                        </div>
                    </FormSection>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-4">
                    <Button
                        type="submit"
                        disabled={createQuotation.isPending}
                        className="h-12 px-8 rounded-2xl font-black text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                        {createQuotation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {createQuotation.isPending ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate('/quotations')} className="h-12 px-6 rounded-2xl font-bold text-sm text-muted-foreground">
                        Cancel
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-medium px-4 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40';
const smallInputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-10 rounded-xl font-medium px-3 text-xs focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 w-full';
const labelCls = 'text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest block mb-2';

function FormSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border dark:border-border/30 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><Icon size={14} /></div>
                <p className="text-foreground text-sm font-black uppercase tracking-wider">{title}</p>
            </div>
            {children}
        </div>
    );
}
