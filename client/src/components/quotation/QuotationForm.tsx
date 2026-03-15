/**
 * QuotationForm — unified create / edit form
 *
 * Props:
 *   quotationId?: string   — if provided, switches to EDIT mode (fetches & pre-fills data)
 *                            if omitted, switches to CREATE mode
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Save, Loader2,
    User2, ReceiptText, Search, X, ImagePlus, List,
} from 'lucide-react';
import {
    useCreateQuotation, useUpdateQuotation,
    useClients, useQuotation, useClient,
} from '../../hooks/useApi';
import CreateClientModal from '../clients/CreateClientModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { apiUpload } from '../../lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuotationFormProps {
    quotationId?: string;     // undefined = create mode
}

interface Item {
    id: string;               // local key only
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
    photo: string;
    photoPublicId: string;
    uploading: boolean;
    fabricPhoto: string;
    fabricPhotoPublicId: string;
    uploadingFabric: boolean;
    photos: string[];
    uploadingExtra: boolean;
}

const blankItem = (srNo: number): Item => ({
    id: crypto.randomUUID(),
    srNo,
    category: '', description: '', size: '', polish: '', material: '',
    qty: 1, mrp: 0, sellingPrice: 0, totalPrice: 0,
    photo: '', photoPublicId: '', uploading: false,
    fabricPhoto: '', fabricPhotoPublicId: '', uploadingFabric: false,
    photos: [], uploadingExtra: false,
});

// Map a raw DB item → local Item (preserve existing images)
const dbItemToLocal = (dbItem: any): Item => ({
    id: dbItem._id || crypto.randomUUID(),
    srNo: dbItem.srNo ?? 1,
    category: dbItem.category || '',
    description: dbItem.description || '',
    size: dbItem.specifications?.size || '',
    polish: dbItem.specifications?.polish || '',
    material: dbItem.specifications?.material || '',
    qty: dbItem.qty ?? 1,
    mrp: dbItem.mrp ?? 0,
    sellingPrice: dbItem.sellingPrice ?? 0,
    totalPrice: dbItem.totalPrice ?? 0,
    photo: dbItem.photo || '',
    photoPublicId: dbItem.photoPublicId || '',
    uploading: false,
    fabricPhoto: dbItem.fabricPhoto || '',
    fabricPhotoPublicId: dbItem.fabricPhotoPublicId || '',
    uploadingFabric: false,
    photos: dbItem.photos || [],
    uploadingExtra: false,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuotationForm({ quotationId }: QuotationFormProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlClientId = searchParams.get('clientId');
    const isEditMode = !!quotationId;

    // ── API hooks ─────────────────────────────────────────────────────────────
    const createQuotation = useCreateQuotation();
    const updateQuotation = useUpdateQuotation(quotationId ?? '');

    const { data: raw, isLoading: loadingQuotation } = useQuotation(quotationId ?? '');
    const { data: preRaw } = useClient(urlClientId ?? '');
    const existingQ: any = (raw as any)?.data;
    const preClient: any = (preRaw as any)?.data;

    // ── Client search ─────────────────────────────────────────────────────────
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: clientsRaw } = useClients({ search: clientSearch, limit: 10 });
    const clients: any[] = (clientsRaw as any)?.data ?? [];

    // ── Project info ──────────────────────────────────────────────────────────
    const [project, setProject] = useState({
        projectName: '',
        architect: '',
        deliveryDays: '',
        validUntil: '',
        siteAddress: { line1: '', location: '', pincode: '' },
    });

    // ── Items ─────────────────────────────────────────────────────────────────
    const [items, setItems] = useState<Item[]>([blankItem(1)]);

    // ── Financial ─────────────────────────────────────────────────────────────
    const [discount, setDiscount] = useState(0);
    const [gstType, setGstType] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');
    const [advancePercent, setAdvancePercent] = useState(50);

    // ── Populate form in edit mode ────────────────────────────────────────────
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (isEditMode && existingQ && !loaded) {
            setSelectedClient(existingQ.clientId ?? null);
            setProject({
                projectName:  existingQ.projectName  || '',
                architect:    existingQ.architect     || '',
                deliveryDays: existingQ.deliveryDays  || '',
                validUntil:   existingQ.validUntil
                    ? new Date(existingQ.validUntil).toISOString().slice(0, 10)
                    : '',
                siteAddress: existingQ.siteAddress || { line1: '', location: '', pincode: '' },
            });
            setDiscount(existingQ.discount || 0);
            setGstType(existingQ.gstType || 'cgst_sgst');
            setAdvancePercent(existingQ.advancePercent || 50);
            if (existingQ.items?.length) setItems(existingQ.items.map(dbItemToLocal));
            setLoaded(true);
        }
    }, [isEditMode, existingQ, loaded]);

    // Handle pre-client selection from URL
    useEffect(() => {
        if (!isEditMode && preClient && !selectedClient) {
            setSelectedClient(preClient);
        }
    }, [isEditMode, preClient, selectedClient]);

    // ── Calculations ──────────────────────────────────────────────────────────
    const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * i.sellingPrice, 0), [items]);
    const finalAmt = subtotal - discount;

    // ── Item helpers ──────────────────────────────────────────────────────────
    const updateItem = useCallback((id: string, field: keyof Item, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.qty * updated.sellingPrice;
            return updated;
        }));
    }, []);

    const addItem    = () => setItems(prev => [...prev, blankItem(prev.length + 1)]);
    const removeItem = (id: string) => setItems(prev =>
        prev.filter(i => i.id !== id).map((i, idx) => ({ ...i, srNo: idx + 1 }))
    );

    // ── Photo upload ──────────────────────────────────────────────────────────
    const handlePhotoUpload = useCallback(async (itemId: string, file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        const uploadKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const pubKey    = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';
        updateItem(itemId, uploadKey, true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/quotations/upload-item-photo', fd);
            updateItem(itemId, type, res.url);
            updateItem(itemId, pubKey, res.publicId);
        } catch (e) { console.error('Upload failed', e); }
        finally { updateItem(itemId, uploadKey, false); }
    }, [updateItem]);

    const handleExtraUpload = useCallback(async (itemId: string, file: File) => {
        updateItem(itemId, 'uploadingExtra', true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/quotations/upload-item-photo', fd);
            setItems(prev => prev.map(item =>
                item.id === itemId ? { ...item, photos: [...item.photos, res.url], uploadingExtra: false } : item
            ));
        } catch (e) {
            console.error('Extra upload failed', e);
            updateItem(itemId, 'uploadingExtra', false);
        }
    }, [updateItem]);

    const removeExtraPhoto = useCallback((itemId: string, url: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, photos: item.photos.filter(p => p !== url) } : item
        ));
    }, []);

    // ── Client Creation Modal Handler ────────────────────────────────────────
    const handleClientCreated = (client: any) => {
        setSelectedClient(client);
        setShowCreateModal(false);
    };

    // ── Build payload ─────────────────────────────────────────────────────────
    const buildPayload = () => ({
        clientId: selectedClient?._id,
        ...project,
        validUntil: project.validUntil || null,
        items: items.map(({ id, totalPrice, uploading, uploadingFabric, uploadingExtra, size, polish, material, ...rest }) => ({
            ...rest,
            specifications: { size, polish, material },
            totalPrice: rest.qty * rest.sellingPrice,
        })),
        discount,
        gstType,
        advancePercent,
    });

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) { alert('Please select or create a client.'); return; }
        if (isEditMode) {
            await updateQuotation.mutateAsync(buildPayload());
            navigate(`/quotations/${quotationId}`);
        } else {
            await createQuotation.mutateAsync(buildPayload());
            navigate('/quotations');
        }
    };

    const isBusy = createQuotation.isPending || updateQuotation.isPending;

    // ── Loading skeleton in edit mode ─────────────────────────────────────────
    if (isEditMode && loadingQuotation) {
        return (
            <div className="p-8 max-w-6xl mx-auto space-y-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted/30 rounded-3xl animate-pulse border border-border/20" />
                ))}
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-6xl mx-auto space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <button
                    type="button"
                    onClick={() => navigate(isEditMode ? `/quotations/${quotationId}` : '/quotations')}
                    className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest"
                >
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Back
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">
                        {isEditMode ? 'Edit Quotation' : 'New Quotation'}
                    </p>
                </div>
            </div>

            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tighter mb-2">
                    {isEditMode ? `Edit ${existingQ?.quotationNumber || 'Quotation'}` : 'Create Quotation'}
                </h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">
                    {isEditMode
                        ? 'Update quotation details, add items, or change images.'
                        : 'Build a professional quotation for your client.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">

                {/* === Section 1: Client & Project === */}
                <FormSection title="Client & Project" icon={User2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client */}
                        <div className="md:col-span-2">
                            <label className={labelCls}>Client *</label>
                            {selectedClient ? (
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border-2 border-primary/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-black shrink-0">
                                            {selectedClient.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-foreground leading-tight">{selectedClient.name}</p>
                                            <p className="text-muted-foreground/60 text-xs font-medium mt-0.5">{selectedClient.phone}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                                    {selectedClient.clientType?.replace(/_/g, ' ')}
                                                </span>
                                                {selectedClient.firmName && (
                                                    <span className="text-[10px] text-muted-foreground/50 font-semibold italic">
                                                        {selectedClient.firmName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-xs font-bold text-rose-500 hover:text-rose-400 shrink-0">Change</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                        <Input
                                            value={clientSearch}
                                            onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                                            onFocus={() => setShowClientDrop(true)}
                                            placeholder="Search client by name, firm, or phone…"
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
                                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                                    {clients.length > 0 ? (
                                                        clients.map((c: any) => (
                                                            <button
                                                                key={c._id}
                                                                type="button"
                                                                onClick={() => { setSelectedClient(c); setShowClientDrop(false); setClientSearch(''); }}
                                                                className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-primary/5 transition-colors text-left border-b border-border/30 last:border-0"
                                                            >
                                                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black mt-0.5">
                                                                    {c.name?.[0]?.toUpperCase()}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-black text-foreground leading-tight">{c.name}</p>
                                                                    <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">{c.phone}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                        <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">{c.clientType?.replace(/_/g, ' ')}</span>
                                                                        {c.firmName && <span className="text-[9px] text-muted-foreground/40 font-semibold italic">{c.firmName}</span>}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-5 py-8 text-center">
                                                            <p className="text-xs text-muted-foreground font-medium italic">No clients found matching "{clientSearch}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowCreateModal(true); setShowClientDrop(false); }}
                                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-primary hover:bg-primary/5 transition-colors text-sm font-black bg-primary/3"
                                                >
                                                    <Plus size={14} /> Create New Client
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <CreateClientModal 
                                        open={showCreateModal}
                                        onOpenChange={setShowCreateModal}
                                        onSuccess={handleClientCreated}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Project fields */}
                        <div>
                            <label className={labelCls}>Project Name *</label>
                            <Input required value={project.projectName} onChange={e => setProject(p => ({ ...p, projectName: e.target.value }))} placeholder="e.g. GMP Office — 3rd Floor" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Architect firm name </label>
                            <Input value={project.architect} onChange={e => setProject(p => ({ ...p, architect: e.target.value }))} placeholder="e.g. Ar. Dreamscape" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Delivery Period</label>
                            <Input value={project.deliveryDays} onChange={e => setProject(p => ({ ...p, deliveryDays: e.target.value }))} placeholder="e.g. 75 to 90 days" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Valid Until</label>
                            <Input type="date" value={project.validUntil} onChange={e => setProject(p => ({ ...p, validUntil: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Site Location</label>
                            <Input value={project.siteAddress.location} onChange={e => setProject(p => ({ ...p, siteAddress: { ...p.siteAddress, location: e.target.value } }))} placeholder="e.g. Ahmedabad, Gujarat" className={inputCls} />
                        </div>
                    </div>
                </FormSection>

                {/* === Section 2: Items === */}
                <FormSection title={`Quotation Items (${items.length})`} icon={List}>
                    <div className="space-y-4">
                        <AnimatePresence>
                            {items.map(item => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-5 bg-card border border-border/60 rounded-2xl space-y-4 relative group"
                                >
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

                                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
                                        {/* Photos */}
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className={labelCls}>Main Photo</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.photo}
                                                    uploading={item.uploading}
                                                    onFileSelect={file => handlePhotoUpload(item.id, file, 'photo')}
                                                    onRemove={() => { updateItem(item.id, 'photo', ''); updateItem(item.id, 'photoPublicId', ''); }}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Fabric / Material</label>
                                                <PhotoUploadZone
                                                    photoUrl={item.fabricPhoto}
                                                    uploading={item.uploadingFabric}
                                                    onFileSelect={file => handlePhotoUpload(item.id, file, 'fabricPhoto')}
                                                    onRemove={() => { updateItem(item.id, 'fabricPhoto', ''); updateItem(item.id, 'fabricPhotoPublicId', ''); }}
                                                />
                                            </div>
                                            {/* Extra photos */}
                                            {item.photos.length > 0 && (
                                                <div>
                                                    <label className={labelCls}>Extra Photos</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.photos.map((url, idx) => (
                                                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/40 group/photo">
                                                                <img src={url} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeExtraPhoto(item.id, url)}
                                                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity"
                                                                >
                                                                    <X size={13} className="text-white" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <label className="cursor-pointer">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={item.uploadingExtra}
                                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleExtraUpload(item.id, f); e.target.value = ''; }}
                                                />
                                                <div className={cn(
                                                    'flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/30 text-primary/60 text-xs font-bold hover:bg-primary/5 transition-colors cursor-pointer',
                                                    item.uploadingExtra && 'opacity-60 cursor-wait'
                                                )}>
                                                    {item.uploadingExtra ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                                                    {item.uploadingExtra ? 'Uploading…' : '+ Add More Photos'}
                                                </div>
                                            </label>
                                        </div>

                                        {/* Fields */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Category</label>
                                                <Input value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} placeholder="e.g. Reception Area" className={smallInputCls} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className={labelCls}>Description *</label>
                                                <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. 2 Seater Sofa" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Size</label>
                                                <Input value={item.size} onChange={e => updateItem(item.id, 'size', e.target.value)} placeholder="L×W×H" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Material</label>
                                                <Input value={item.material} onChange={e => updateItem(item.id, 'material', e.target.value)} placeholder="e.g. BWR Ply + Laminate" className={smallInputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Polish / Finish</label>
                                                <Input value={item.polish} onChange={e => updateItem(item.id, 'polish', e.target.value)} placeholder="e.g. Natural Teak" className={smallInputCls} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-border/30">
                                        <div>
                                            <label className={labelCls}>Qty</label>
                                            <Input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className={smallInputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>MRP (₹)</label>
                                            <Input type="number" min="0" value={item.mrp || ''} onChange={e => updateItem(item.id, 'mrp', Number(e.target.value))} placeholder="0" className={smallInputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Selling Price (₹) *</label>
                                            <Input type="number" min="0" required value={item.sellingPrice || ''} onChange={e => updateItem(item.id, 'sellingPrice', Number(e.target.value))} placeholder="0" className={smallInputCls} />
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

                {/* === Section 3: Financial Summary === */}
                <FormSection title="Financial Summary" icon={ReceiptText}>
                    <div className="space-y-4 max-w-sm">
                        <FinRow label="Total Amt" value={`₹${subtotal.toLocaleString('en-IN')}`} />
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-bold text-muted-foreground/60 shrink-0">Discount (₹)</p>
                            <Input
                                type="number" min="0"
                                value={discount || ''}
                                onChange={e => setDiscount(Number(e.target.value))}
                                placeholder="0"
                                className="h-9 w-36 rounded-xl text-right font-black text-sm border-border/50"
                            />
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-border/40">
                            <p className="font-black text-foreground text-base">Final Amt</p>
                            <p className="font-black text-primary text-xl">₹{finalAmt.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </FormSection>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-4">
                    <Button
                        type="submit"
                        disabled={isBusy}
                        className="h-12 px-8 rounded-2xl font-black text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                        {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {isBusy
                            ? (isEditMode ? 'Saving Changes…' : 'Saving…')
                            : (isEditMode ? 'Save Changes' : 'Save as Draft')}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(isEditMode ? `/quotations/${quotationId}` : '/quotations')}
                        className="h-12 px-6 rounded-2xl font-bold text-sm text-muted-foreground"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

const inputCls      = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-medium px-4 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40';
const smallInputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-10 rounded-xl font-medium px-3 text-xs focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 w-full';
const labelCls      = 'text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest block mb-2';

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

function FinRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <p className="font-bold text-muted-foreground/60">{label}</p>
            <p className={cn('font-bold text-foreground', valueClass)}>{value}</p>
        </div>
    );
}
