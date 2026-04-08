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
    User2, ReceiptText, Search, X, ImagePlus, List, Check,
    GripVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/axios';
import {
    useCreateQuotation, useUpdateQuotation,
    useClients, useQuotation, useClient,
} from '../../hooks/useApi';
import { useAuthStore } from '../../stores/authStore';
import CreateClientModal from '../clients/CreateClientModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from '../../lib/utils';
import { apiUpload } from '../../lib/axios';
import { toast } from 'sonner';

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
    priority: 'low' | 'medium' | 'high' | 'urgent';
    fabrics: string[];        // multi-fabric names
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
    priority: 'medium',
    fabrics: [''],
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
    priority: dbItem.specifications?.priority || 'medium',
    // Multi-fabric: prefer new array, fallback to legacy single fabric string
    fabrics: dbItem.specifications?.fabrics?.length
        ? dbItem.specifications.fabrics
        : dbItem.specifications?.fabric
            ? [dbItem.specifications.fabric]
            : [''],
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
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin;
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
        architectContact: '',
        projectDesigner: '',
        projectDesignerContact: '',
        deliveryDays: '',
        validUntil: '',
        siteAddress: { line1: '', location: '', pincode: '' },
        architectName: '',
        architectId: '',
        architectCommissionPercent: 0,
    });

    // ── Items ─────────────────────────────────────────────────────────────────
    const [items, setItems] = useState<Item[]>([blankItem(1)]);

    // ── Financial ─────────────────────────────────────────────────────────────
    const [discount, setDiscount] = useState(0);
    const [gstType, setGstType] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');
    const [advancePercent, setAdvancePercent] = useState(50);
    const [additionalTerms, setAdditionalTerms] = useState<string[]>([]);
    const [assignedStaff, setAssignedStaff] = useState<string[]>([]);

    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    const architectOptions = useMemo(() => {
        return allUsers
            .filter(u => {
                const role = u.role?.toLowerCase() || '';
                return ['architect', 'architecture'].includes(role);
            })
            .map(u => ({
                value: u._id,
                label: u.name,
                firmName: u.firmName,
                contact: u.phone || u.email || '',
                teamEmail: u.teamEmail || '',
            }));
    }, [allUsers]);

    // ── Populate form in edit mode ────────────────────────────────────────────
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (isEditMode && existingQ && !loaded) {
            setSelectedClient(existingQ.clientId ?? null);
            setProject({
                projectName: existingQ.projectName || '',
                architect: existingQ.architect || '',
                architectContact: existingQ.architectContact || '',
                projectDesigner: existingQ.projectDesigner || '',
                projectDesignerContact: existingQ.projectDesignerContact || '',
                deliveryDays: existingQ.deliveryDays || '',
                validUntil: existingQ.validUntil
                    ? new Date(existingQ.validUntil).toISOString().slice(0, 10)
                    : '',
                siteAddress: existingQ.siteAddress || { line1: '', location: '', pincode: '' },
                architectName: existingQ.architectName || '',
                architectId: existingQ.architectId || '',
                architectCommissionPercent: existingQ.architectCommissionPercent || 0,
            });
            setDiscount(existingQ.discount || 0);
            setGstType(existingQ.gstType || 'cgst_sgst');
            setAdvancePercent(existingQ.advancePercent || 50);
            setAdditionalTerms(existingQ.additionalTerms || []);
            setAssignedStaff((existingQ.assignedStaff || []).map((s: any) => s._id || s));
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
    const subtotal = useMemo(() => items.reduce((s, i) => s + i.qty * (i.sellingPrice || 0), 0), [items]);
    const finalAmt = subtotal - discount;

    // ── Item helpers ──────────────────────────────────────────────────────────
    const updateItem = useCallback((id: string, field: keyof Item, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            updated.totalPrice = updated.qty * (updated.sellingPrice || 0);
            return updated;
        }));
    }, []);

    const addItem = () => setItems(prev => [...prev, blankItem(prev.length + 1)]);
    const removeItem = (id: string) => setItems(prev =>
        prev.filter(i => i.id !== id).map((i, idx) => ({ ...i, srNo: idx + 1 }))
    );

    // ── Photo upload ──────────────────────────────────────────────────────────
    const handlePhotoUpload = useCallback(async (itemId: string, file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        const uploadKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const pubKey = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';
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

    // ── Validation ────────────────────────────────────────────────────────────
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!selectedClient) errors.clientId = 'Please select or create a client';
        if (!project.projectName) errors.projectName = 'Project Name is required';
        
        items.forEach((item) => {
            if (!item.description?.trim()) {
                errors[`item_${item.id}_description`] = 'Description is required';
            }
            if (!item.qty || item.qty < 1) {
                errors[`item_${item.id}_qty`] = 'Quantity must be at least 1';
            }
        });

        setValidationErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            // Scroll to the first error
            const firstErrorKey = Object.keys(errors)[0];
            const element = document.getElementById(firstErrorKey);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            toast.error('Please fix the validation errors before saving.');
            return false;
        }
        return true;
    };

    // ── Build payload ─────────────────────────────────────────────────────────
    const buildPayload = () => {
        const payload: any = {
            ...project,
            clientId: selectedClient?._id,
            validUntil: project.validUntil || null,
            items: items.map(({ id, totalPrice, uploading, uploadingFabric, uploadingExtra, size, polish, material, fabrics, priority, ...rest }) => ({
                ...rest,
                specifications: {
                    size: size || null,
                    polish: polish || null,
                    material: material || null,
                    priority: priority || 'medium',
                    fabrics: fabrics.filter(f => f.trim() !== ''),
                },
                totalPrice: rest.qty * (rest.sellingPrice || 0),
            })),
            discount,
            gstType,
            advancePercent,
            additionalTerms: additionalTerms.filter(t => t.trim() !== ''),
            assignedStaff,
        };

        // Clean up empty strings for ObjectIds to avoid Mongoose casting errors
        if (!payload.architectId) payload.architectId = null;
        if (!payload.clientId) delete payload.clientId; // Should be handled by validation but safe to have

        return payload;
    };

    // ── Item-Level Save ───────────────────────────────────────────────────────
    const [savingItemId, setSavingItemId] = useState<string | null>(null);
    const [savedItemId, setSavedItemId] = useState<string | null>(null);

    const handleSaveItem = async (itemId: string) => {
        if (!validateForm()) return;

        setSavingItemId(itemId);
        try {
            const payload = buildPayload();
            if (isEditMode) {
                await updateQuotation.mutateAsync(payload);
                // After successful update, we stay here but toast success (handled by hook)
            } else {
                const res: any = await createQuotation.mutateAsync(payload);
                if (res?.data?._id) {
                    toast.success('Quotation created successfully');
                    navigate(`/quotations/${res.data._id}`, { replace: true });
                }
            }
            setSavedItemId(itemId);
            setTimeout(() => setSavedItemId(null), 2000);
        } catch (e) {
            console.error('Failed to save item', e);
            // Error toast is handled by hook
        } finally {
            setSavingItemId(null);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const payload = buildPayload();
            if (isEditMode) {
                await updateQuotation.mutateAsync(payload);
                toast.success('Quotation updated successfully');
                navigate(`/quotations/${quotationId}`);
            } else {
                const res: any = await createQuotation.mutateAsync(payload);
                if (res?.data?._id) {
                    toast.success('Quotation created successfully');
                    navigate(`/quotations/${res.data._id}`);
                } else {
                    navigate('/quotations');
                }
            }
        } catch (err) {
            console.error('Submit failed', err);
        }
    };

    const isBusy = createQuotation.isPending || updateQuotation.isPending;

    // ── Loading skeleton in edit mode ─────────────────────────────────────────
    if (isEditMode && loadingQuotation) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
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
            className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <button
                    type="button"
                    onClick={() => navigate(isEditMode ? `/quotations/${quotationId}` : '/quotations')}
                    className="group flex items-center gap-3.5 text-muted-foreground hover:text-primary transition-all text-[11px] font-black uppercase tracking-[0.2em]"
                >
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors shadow-sm">
                        <ArrowLeft size={16} />
                    </div>
                    Back
                </button>
                <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    <p className="text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em] opacity-70">
                        {isEditMode ? 'Edit Quotation' : 'New Quotation'}
                    </p>
                </div>
            </div>

            <div>
                <h1 className="text-foreground text-2xl md:text-4xl font-black  mb-2">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Client */}
                        <div className="md:col-span-2">
                            <label className={labelCls}>Client *</label>
                            {selectedClient ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-primary/5 border-2 border-primary/30 gap-4 sm:gap-2">
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
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-xs font-bold text-rose-500 hover:text-rose-400 shrink-0 w-full sm:w-auto">Change</Button>
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
                                                <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
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

                                </div>
                            )}
                            {validationErrors.clientId && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1 animate-in fade-in slide-in-from-top-1">{validationErrors.clientId}</p>
                            )}
                        </div>

                        {/* Project fields */}
                        <div id="projectName">
                            <label className={labelCls}>Project Name *</label>
                            <Input
                                value={project.projectName}
                                onChange={e => {
                                    setProject(p => ({ ...p, projectName: e.target.value }));
                                    if (validationErrors.projectName) setValidationErrors(prev => {
                                        const n = { ...prev };
                                        delete n.projectName;
                                        return n;
                                    });
                                }}
                                placeholder="e.g. GMP Office — 3rd Floor"
                                className={cn(inputCls, validationErrors.projectName && 'border-rose-500/50 bg-rose-50/5') }
                            />
                            {validationErrors.projectName && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1 animate-in fade-in slide-in-from-top-1">{validationErrors.projectName}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}>Architect Name</label>
                            <SearchableSelect
                                options={architectOptions}
                                value={project.architectId || project.architectName}
                                placeholder="Search or Type Architect Name…"
                                searchPlaceholder="Type name to search or add…"
                                onChange={(userId) => {
                                    const arch = architectOptions.find(o => o.value === userId);
                                            if (arch) {
                                                setProject(p => ({
                                                    ...p,
                                                    architectId: userId,
                                                    architectName: arch.label,
                                                    architect: arch.firmName || arch.label,
                                                    architectContact: arch.contact,
                                                    // Auto-fill Project Designer Contact with team email if available
                                                    projectDesignerContact: arch.teamEmail ? arch.teamEmail.toLowerCase() : p.projectDesignerContact,
                                                }));
                                            } else {
                                                setProject(p => ({
                                                    ...p,
                                                    architectId: '',
                                                    architectName: '',
                                                    architect: '',
                                                    architectContact: '',
                                                    projectDesignerContact: '',
                                                }));
                                            }
                                }}
                                creatable
                                onCreate={(val) => {
                                    setProject(p => ({
                                        ...p,
                                        architectId: '',
                                        architectName: val,
                                        architect: '',
                                        architectContact: ''
                                    }));
                                }}
                                clearable
                                className="h-12 rounded-2xl border-primary/20 bg-primary/10 hover:border-primary/40 transition-all font-bold"
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Architect Firm Name</label>
                            <Input
                                value={project.architect}
                                onChange={e => setProject(p => ({ ...p, architect: e.target.value }))}
                                placeholder="Firm Name"
                                className={inputCls}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Architect Contact Details </label>
                            <Input value={project.architectContact} onChange={e => setProject(p => ({ ...p, architectContact: e.target.value }))} placeholder="Phone or Email" className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Project Designer Name </label>
                            <Input value={project.projectDesigner} onChange={e => setProject(p => ({ ...p, projectDesigner: e.target.value }))} placeholder="e.g. Rahul Sharma" className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Project Designer Contact </label>
                            <div className="relative">
                                <Input
                                    value={project.projectDesignerContact}
                                    onChange={e => setProject(p => ({ ...p, projectDesignerContact: e.target.value }))}
                                    placeholder="Phone or Email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    style={{ textTransform: 'lowercase' }}
                                    className={cn(
                                        inputCls,
                                        project.architectId && architectOptions.find(a => a.value === project.architectId)?.teamEmail
                                            ? 'border-amber-500/30 bg-amber-500/5'
                                            : ''
                                    )}
                                />
                                {project.architectId && architectOptions.find(a => a.value === project.architectId)?.teamEmail && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md pointer-events-none">
                                        Auto-filled
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className={labelCls}>Delivery Period</label>
                            <Input value={project.deliveryDays} onChange={e => setProject(p => ({ ...p, deliveryDays: e.target.value }))} placeholder="e.g. 75 to 90 days" className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Valid Until</label>
                            <DatePicker
                                date={project.validUntil ? new Date(project.validUntil) : undefined}
                                setDate={(d) => setProject(p => ({ ...p, validUntil: d ? format(d, 'yyyy-MM-dd') : '' }))}
                                placeholder="DD-MM-YYYY"
                                className={cn(inputCls, "h-12")}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Site Location</label>
                            <Input value={project.siteAddress.location} onChange={e => setProject(p => ({ ...p, siteAddress: { ...p.siteAddress, location: e.target.value } }))} placeholder="e.g. Ahmedabad, Gujarat" className={inputCls} />
                        </div>

                    </div>
                </FormSection>

                {/* === Section 2: Items === */}
                <FormSection title={`Quotation Items (${items.length})`} icon={List}>
                    <Reorder.Group
                        axis="y"
                        values={items}
                        onReorder={(newItems) => {
                            setItems(newItems.map((item, idx) => ({ ...item, srNo: idx + 1 })));
                        }}
                        className="space-y-4"
                    >
                        <AnimatePresence initial={false}>
                            {items.map(item => (
                                <Reorder.Item
                                    key={item.id}
                                    value={item}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="p-4 md:p-5 bg-card border border-border/60 rounded-2xl md:rounded-3xl space-y-4 relative group touch-none"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-primary transition-colors">
                                                <GripVertical size={16} />
                                            </div>
                                            <span className="text-[11px] font-black text-primary/70 uppercase tracking-[0.15em] bg-primary/10 px-3 py-1.5 rounded-xl">Item {item.srNo}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSaveItem(item.id)}
                                                disabled={savingItemId === item.id}
                                                className={cn(
                                                    "h-7 px-3 text-xs font-bold rounded-lg transition-all",
                                                    savedItemId === item.id
                                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-600"
                                                        : "bg-primary/5 text-primary hover:bg-primary/10"
                                                )}
                                            >
                                                {savingItemId === item.id ? (
                                                    <><Loader2 size={12} className="mr-1.5 animate-spin" /> Saving...</>
                                                ) : savedItemId === item.id ? (
                                                    <><Check size={12} className="mr-1.5" /> Saved</>
                                                ) : (
                                                    <><Save size={12} className="mr-1.5" /> Save Item</>
                                                )}
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                disabled={items.length === 1}
                                                className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground/30 hover:text-rose-400 disabled:opacity-0 p-1.5"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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
                                            <ExtraPhotoPasteZone
                                                itemId={item.id}
                                                onUpload={handleExtraUpload}
                                                uploading={item.uploadingExtra}
                                            />
                                        </div>

                                        {/* Fields */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelCls}>Category</label>
                                                <Input value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} placeholder="e.g. Reception Area" className={smallInputCls} />
                                            </div>
                                            <div className="col-span-2" id={`item_${item.id}_description`}>
                                                <label className={labelCls}>Description *</label>
                                                <Input
                                                    value={item.description}
                                                    onChange={e => {
                                                        updateItem(item.id, 'description', e.target.value);
                                                        if (validationErrors[`item_${item.id}_description`]) setValidationErrors(prev => {
                                                            const n = { ...prev };
                                                            delete n[`item_${item.id}_description`];
                                                            return n;
                                                        });
                                                    }}
                                                    placeholder="e.g. 2 Seater Sofa"
                                                    className={cn(smallInputCls, validationErrors[`item_${item.id}_description`] && 'border-rose-500/50 bg-rose-50/5')}
                                                />
                                                {validationErrors[`item_${item.id}_description`] && (
                                                    <p className="text-[9px] font-bold text-rose-500 mt-1.5 ml-1">{validationErrors[`item_${item.id}_description`]}</p>
                                                )}
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
                                            <div>
                                                <label className={labelCls}>Priority Level</label>
                                                <Select value={item.priority} onValueChange={(v: any) => updateItem(item.id, 'priority', v)}>
                                                    <SelectTrigger className={cn(smallInputCls, "justify-between")}>
                                                        <SelectValue placeholder="Select Priority" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl">
                                                        <SelectItem value="low" className="text-[10px] font-black uppercase tracking-widest">Low Level</SelectItem>
                                                        <SelectItem value="medium" className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500">Medium</SelectItem>
                                                        <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest text-primary">High Priority</SelectItem>
                                                        <SelectItem value="urgent" className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500">Urgent Action</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* ── Fabric Names (multi) ── */}
                                            <div className="col-span-2">
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <label className={labelCls} style={{ marginBottom: 0 }}>Fabric Names</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateItem(item.id, 'fabrics', [...item.fabrics, ''])}
                                                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg transition-all"
                                                    >
                                                        <Plus size={10} /> Add Fabric
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {item.fabrics.map((fabric, fi) => (
                                                        <div key={fi} className="flex items-center gap-2">
                                                            <div className="flex-1 relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary/40 uppercase tracking-wider w-4 text-center">{fi + 1}</span>
                                                                <Input
                                                                    value={fabric}
                                                                    onChange={e => {
                                                                        const newFabrics = [...item.fabrics];
                                                                        newFabrics[fi] = e.target.value;
                                                                        updateItem(item.id, 'fabrics', newFabrics);
                                                                    }}
                                                                    placeholder={`e.g. Velvet Grey — Code VG-02`}
                                                                    className={cn(smallInputCls, 'pl-7')}
                                                                />
                                                            </div>
                                                            {item.fabrics.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateItem(item.id, 'fabrics', item.fabrics.filter((_, i) => i !== fi))}
                                                                    className="text-muted-foreground/30 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-border/30">
                                        <div id={`item_${item.id}_qty`}>
                                            <label className={labelCls}>Qty *</label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.qty}
                                                onChange={e => {
                                                    updateItem(item.id, 'qty', Number(e.target.value));
                                                    if (validationErrors[`item_${item.id}_qty`]) setValidationErrors(prev => {
                                                        const n = { ...prev };
                                                        delete n[`item_${item.id}_qty`];
                                                        return n;
                                                    });
                                                }}
                                                className={cn(smallInputCls, validationErrors[`item_${item.id}_qty`] && 'border-rose-500/50 bg-rose-50/5')}
                                            />
                                            {validationErrors[`item_${item.id}_qty`] && (
                                                <p className="text-[9px] font-bold text-rose-500 mt-1.5 ml-1">{validationErrors[`item_${item.id}_qty`]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelCls}>MRP (₹)</label>
                                            <Input type="number" min="0" value={item.mrp || ''} onChange={e => updateItem(item.id, 'mrp', Number(e.target.value))} placeholder="0" className={smallInputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Selling Price (₹)</label>
                                            <Input type="number" min="0" value={item.sellingPrice || ''} onChange={e => updateItem(item.id, 'sellingPrice', Number(e.target.value))} placeholder="0" className={smallInputCls} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 md:col-span-2 flex items-end gap-2">
                                            <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
                                                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 mb-0.5">Total</p>
                                                <p className="font-black text-foreground text-[15px] tracking-tight">₹{(item.qty * item.sellingPrice).toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                    <Button type="button" variant="outline" onClick={addItem} className="w-full h-11 rounded-2xl border-dashed border-border font-bold text-sm gap-2 hover:border-primary/30 hover:bg-primary/3 transition-all text-muted-foreground hover:text-primary">
                        <Plus size={14} /> Add Item
                    </Button>
                </FormSection>

                {/* === Section 3: Financial Summary === */}
                <FormSection title="Financial Summary" icon={ReceiptText}>
                    <div className="space-y-4 max-w-sm">
                        <div className="flex justify-between text-sm font-bold text-muted-foreground/80 pb-2 border-b border-border/20">
                            <span>Subtotal</span>
                            <span>₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
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

                        {/* Architect Commission — shown only to super_admin when architect is set */}
                        {isSuperAdmin && (project.architectId || project.architectName) && (
                            <div className="mt-4 pt-4 border-t border-primary/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-foreground text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                                            Architect Commission
                                        </p>
                                        <p className="text-muted-foreground text-[10px] mt-0.5">
                                            For: <span className="text-foreground font-bold">{project.architectName || 'Architect'}</span> · Paid on approval
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-primary text-xl font-black">
                                            ₹{((subtotal || 0) * ((project.architectCommissionPercent || 0) / 100)).toLocaleString('en-IN')}
                                        </p>
                                        <p className="text-muted-foreground text-[9px]">{project.architectCommissionPercent || 0}% of ₹{subtotal.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">0%</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        value={project.architectCommissionPercent}
                                        onChange={e => setProject(p => ({ ...p, architectCommissionPercent: parseFloat(e.target.value) }))}
                                        className="flex-1 accent-primary cursor-pointer h-2"
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">20%</span>
                                    <div className="relative flex items-center ml-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.5"
                                            value={project.architectCommissionPercent}
                                            onChange={e => setProject(p => ({ ...p, architectCommissionPercent: parseFloat(e.target.value) || 0 }))}
                                            className="w-20 h-9 rounded-xl border border-primary/30 bg-background text-foreground font-bold text-center text-sm pr-6 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                        />
                                        <span className="absolute right-3 text-muted-foreground text-sm font-bold pointer-events-none">%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </FormSection>

                {/* === Section 4: Extra Terms === */}
                <FormSection title="Extra Terms & Conditions" icon={ReceiptText}>
                    <div className="space-y-3">
                        {additionalTerms.map((term, idx) => (
                            <div key={idx} className="flex gap-2">
                                <Input
                                    value={term}
                                    onChange={e => {
                                        const newTerms = [...additionalTerms];
                                        newTerms[idx] = e.target.value;
                                        setAdditionalTerms(newTerms);
                                    }}
                                    placeholder={`Extra term ${idx + 1}`}
                                    className={smallInputCls}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAdditionalTerms(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-rose-500 hover:text-rose-600 p-2"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAdditionalTerms(prev => [...prev, ''])}
                            className="text-[11px] font-black uppercase tracking-[0.15em] gap-2 py-2.5 h-auto rounded-xl"
                        >
                            <Plus size={12} /> Add Extra Term
                        </Button>
                        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground/50 italic mt-3">
                            * These terms will appear below the default Maruti Furniture terms on the PDF.
                        </p>
                    </div>
                </FormSection>

                {/* Submit */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6 pt-6">
                    <Button
                        type="submit"
                        disabled={isBusy}
                        className="h-12 md:h-14 px-8 rounded-2xl font-black text-[13px] md:text-sm uppercase tracking-[0.2em] gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 order-1 md:order-0"
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
                        className="h-12 md:h-14 px-6 rounded-2xl font-black text-[13px] md:text-sm uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground order-2 md:order-0"
                    >
                        Cancel
                    </Button>
                </div>
            </form>

            <CreateClientModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSuccess={handleClientCreated}
            />
        </motion.div>
    );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

const inputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-bold text-[15px] px-5 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 shadow-xs';
const smallInputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-10 rounded-xl font-bold px-4 text-[13px] focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 w-full shadow-xs';
const labelCls = 'text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.2em] block mb-2.5 ml-1';

function ExtraPhotoPasteZone({ itemId, onUpload, uploading }: { itemId: string; onUpload: (id: string, file: File) => Promise<void>; uploading: boolean }) {
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            if (!isHovered) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        onUpload(itemId, file).then(() => toast.success('Extra photo pasted!'));
                        e.preventDefault();
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [isHovered, itemId, onUpload]);

    return (
        <label
            className={cn(
                "cursor-pointer outline-none transition-all rounded-xl block",
                isHovered && "ring-2 ring-primary/40 animate-pulse bg-primary/5"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(itemId, f); e.target.value = ''; }}
            />
            <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/30 text-primary/60 text-xs font-bold hover:bg-primary/5 transition-all cursor-pointer',
                uploading && 'opacity-60 cursor-wait'
            )}>
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                {uploading ? 'Uploading…' : isHovered ? 'Press Ctrl+V to Paste' : '+ Add More (Paste Ctrl+V)'}
            </div>
        </label>
    );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border dark:border-border/30 rounded-[28px] md:rounded-[32px] p-5 md:p-8 space-y-5 md:space-y-7 shadow-sm">
            <div className="flex items-center gap-4 pb-4 border-b border-border/30">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner"><Icon size={16} /></div>
                <p className="text-foreground text-[15px] font-black uppercase tracking-[0.15em]">{title}</p>
            </div>
            {children}
        </div>
    );
}
