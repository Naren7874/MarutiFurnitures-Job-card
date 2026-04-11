import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Plus, Save, Loader2,
    User2, ReceiptText, Search, X, ImagePlus, Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

import { apiGet, apiUpload, apiPost } from '../../lib/axios';
import CreateClientModal from '../clients/CreateClientModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PhotoUploadZone } from '@/components/ui/photo-upload-zone';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Item {
    category: string;
    description: string;
    size: string;
    polish: string;
    material: string;
    fabrics: string[];
    qty: number;
    mrp: number;
    sellingPrice: number;
    photo: string;
    photoPublicId: string;
    fabricPhoto: string;
    fabricPhotoPublicId: string;
    photos: string[];
    uploading: boolean;
    uploadingFabric: boolean;
    uploadingExtra: boolean;
}

const blankItem = (): Item => ({
    category: '', description: '', size: '', polish: '', material: '',
    fabrics: [''],
    qty: 1, mrp: 0, sellingPrice: 0,
    photo: '', photoPublicId: '', uploading: false,
    fabricPhoto: '', fabricPhotoPublicId: '', uploadingFabric: false,
    photos: [], uploadingExtra: false,
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function DirectJobCardForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ── API hooks ─────────────────────────────────────────────────────────────
    const createDirectJobCard = useMutation({
        mutationFn: (payload: any) => apiPost('/jobcards/direct', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobcards'] });
            queryClient.invalidateQueries({ queryKey: ['quotations'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });

    // ── Client search ─────────────────────────────────────────────────────────
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [showClientDrop, setShowClientDrop] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: clientsRaw } = useQuery({
        queryKey: ['clients', 'search', clientSearch],
        queryFn: () => apiGet(`/clients?search=${encodeURIComponent(clientSearch)}&limit=10`),
        staleTime: 60 * 1000
    });
    const clients: any[] = (clientsRaw as any)?.data ?? [];

    // ── Users for Team Assignment ─────────────────────────────────────────────
    const { data: usersRaw } = useQuery({
        queryKey: ['users', 'all'],
        queryFn: () => apiGet('/users'),
    });
    const allUsers: any[] = (usersRaw as any)?.data ?? [];

    const getStaffOptions = (department: string) => {
        return allUsers
            .filter(u => {
                const role = u.role?.toLowerCase().replace(/[\s_]/g, '') || '';
                
                if (department === 'production') {
                    return role === 'factorymanager';
                }

                if (department === 'accounts') {
                    return role === 'accountant';
                }

                // For all other departments (QC, Dispatch)
                // Show all internal staff EXCEPT Factory Manager, Project Designer, and Architecture
                const excludedRoles = ['factorymanager', 'projectdesigner', 'architecture', 'architect', 'client'];
                return !excludedRoles.includes(role);
            })
            .map(u => ({ value: u._id, label: u.name }));
    };

    // ── Form State ────────────────────────────────────────────────────────────
    const [projectName, setProjectName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [salesPerson, setSalesPerson] = useState('');
    const [expectedDelivery, setExpectedDelivery] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
    const [item, setItem] = useState<Item>(blankItem());

    // ── Financials ────────────────────────────────────────────────────────────
    const [discount, setDiscount] = useState(0);

    const [advanceAmount, setAdvanceAmount] = useState(0);

    // ── Team Assignment ───────────────────────────────────────────────────────
    const [assignedTo, setAssignedTo] = useState<{ [key: string]: string[] }>({
        production: [],
        qc: [],
        dispatch: [],
        accounts: [],
    });

    // ── Calculations ──────────────────────────────────────────────────────────
    const itemTotal = item.qty * (item.sellingPrice || 0);
    const amountAfterDiscount = Math.max(0, itemTotal - discount);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const handlePhotoUpload = useCallback(async (file: File, type: 'photo' | 'fabricPhoto' = 'photo') => {
        const uploadKey = type === 'photo' ? 'uploading' : 'uploadingFabric';
        const pubKey = type === 'photo' ? 'photoPublicId' : 'fabricPhotoPublicId';
        setItem(p => ({ ...p, [uploadKey]: true }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/jobcards/upload-item-photo', fd);
            setItem(p => ({ ...p, [type]: res.url, [pubKey]: res.publicId }));
        } catch (e) {
            console.error('Upload failed', e);
            toast.error('Failed to upload photo');
        } finally {
            setItem(p => ({ ...p, [uploadKey]: false }));
        }
    }, []);

    const handleExtraUpload = useCallback(async (file: File) => {
        setItem(p => ({ ...p, uploadingExtra: true }));
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res: any = await apiUpload('/jobcards/upload-item-photo', fd);
            setItem(p => ({ ...p, photos: [...p.photos, res.url], uploadingExtra: false }));
        } catch (e) {
            console.error('Extra upload failed', e);
            setItem(p => ({ ...p, uploadingExtra: false }));
        }
    }, []);

    const assignStaff = (dept: string, userId: string) => {
        if (!userId) return;
        setAssignedTo(prev => {
            const arr = prev[dept] || [];
            if (arr.includes(userId)) return prev;
            return { ...prev, [dept]: [...arr, userId] };
        });
    };

    const removeStaff = (dept: string, userId: string) => {
        setAssignedTo(prev => ({
            ...prev,
            [dept]: prev[dept].filter(id => id !== userId)
        }));
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) { toast.error('Please select or create a client.'); return; }
        if (!item.description) { toast.error('Please enter an item description.'); return; }

        const payload = {
            clientId: selectedClient._id,
            projectName,
            contactPerson,
            salesperson: salesPerson ? { id: salesPerson, name: allUsers.find(u => u._id === salesPerson)?.name || '' } : undefined,
            expectedDelivery,
            priority,
            item: {
                category: item.category,
                description: item.description,
                photo: item.photo,
                fabricPhoto: item.fabricPhoto,
                photos: item.photos,
                specifications: {
                    size: item.size,
                    polish: item.polish,
                    material: item.material,
                    fabrics: item.fabrics.filter(f => f.trim() !== ''),
                },
                qty: item.qty,
                unit: 'pcs',
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
            },
            discount,
            advancePayment: {
                amount: advanceAmount,
            },
            assignedTo,
        };

        try {
            const res: any = await createDirectJobCard.mutateAsync(payload);
            toast.success(res.message || 'Direct Job Card successfully generated!');
            navigate(`/jobcards/${res.jobCard?._id}`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create Job Card flow');
        }
    };

    const isBusy = createDirectJobCard.isPending;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-6">
                <button type="button" onClick={() => navigate('/jobcards')} className="group flex items-center gap-3.5 text-muted-foreground hover:text-primary transition-all text-[11px] font-black uppercase tracking-[0.2em]">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors shadow-sm"><ArrowLeft size={16} /></div>
                    Back
                </button>
            </div>

            <div>
                <h1 className="text-foreground text-2xl md:text-4xl font-black mb-2">Create Direct Job Card</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">Instantly generate a Job Card, Quotation, Project, and Invoice in one step.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">

                {/* === Section 1: Client & Priority === */}
                <FormSection title="Client & Core Details" icon={User2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Client */}
                        <div className="md:col-span-2">
                            <label className={labelCls}>Client *</label>
                            {selectedClient ? (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-primary/5 border-2 border-primary/30 gap-4 sm:gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-black shrink-0">{selectedClient.name?.[0]?.toUpperCase()}</div>
                                        <div>
                                            <p className="font-black text-sm text-foreground leading-tight">{selectedClient.name}</p>
                                            <p className="text-muted-foreground/60 text-xs font-medium mt-0.5">{selectedClient.phone}</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-xs font-bold text-rose-500 hover:text-rose-400">Change</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                                        <Input
                                            value={clientSearch}
                                            onChange={e => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                                            onFocus={() => setShowClientDrop(true)}
                                            placeholder="Search client by name or phone…"
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
                                                    {clients.map((c: any) => (
                                                        <button
                                                            key={c._id}
                                                            type="button"
                                                            onClick={() => { setSelectedClient(c); setShowClientDrop(false); setClientSearch(''); }}
                                                            className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-primary/5 text-left border-b border-border/30 last:border-0"
                                                        >
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-black mt-0.5">{c.name?.[0]?.toUpperCase()}</div>
                                                            <div>
                                                                <p className="text-sm font-black text-foreground">{c.name}</p>
                                                                <p className="text-[10px] text-muted-foreground/50">{c.phone}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={() => { setShowCreateModal(true); setShowClientDrop(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-primary hover:bg-primary/5 transition-colors text-sm font-black bg-primary/3">
                                                    <Plus size={14} /> Create New Client
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}>Project Name</label>
                            <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Master Bedroom Renovation" className={inputCls} />
                        </div>

                        <div>
                            <label className={labelCls}>Contact Person</label>
                            <SearchableSelect
                                options={allUsers.map(u => ({ value: u.name, label: u.name }))}
                                value={contactPerson}
                                onChange={setContactPerson}
                                creatable={true}
                                onCreate={setContactPerson}
                                placeholder="Select or type contact..."
                                searchPlaceholder="Search or enter name..."
                                className={inputCls}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Sales Person</label>
                            <SearchableSelect
                                options={getStaffOptions('sales')}
                                value={salesPerson}
                                onChange={setSalesPerson}
                                placeholder="Assign sales staff"
                                searchPlaceholder="Search staff..."
                                className={inputCls}
                                clearable
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Expected Delivery</label>
                            <DatePicker
                                date={expectedDelivery ? new Date(expectedDelivery) : undefined}
                                setDate={(d) => setExpectedDelivery(d ? format(d, 'yyyy-MM-dd') : '')}
                                placeholder="DD-MM-YYYY"
                                className={cn(inputCls, "h-12")}
                            />
                        </div>

                        <div>
                            <label className={labelCls}>Priority Level</label>
                            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                <SelectTrigger className={inputCls}>
                                    <SelectValue placeholder="Select Priority" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="low" className="text-xs font-black uppercase">Low</SelectItem>
                                    <SelectItem value="medium" className="text-xs font-black uppercase text-yellow-600">Medium</SelectItem>
                                    <SelectItem value="high" className="text-xs font-black uppercase text-primary">High</SelectItem>
                                    <SelectItem value="urgent" className="text-xs font-black uppercase text-red-600">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </FormSection>

                {/* === Section 2: Fixed Single Item === */}
                <FormSection title="Job Card Item Details" icon={Briefcase}>
                    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
                        {/* Photos */}
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className={labelCls}>Main Photo</label>
                                <PhotoUploadZone
                                    photoUrl={item.photo}
                                    uploading={item.uploading}
                                    onFileSelect={file => handlePhotoUpload(file, 'photo')}
                                    onRemove={() => setItem(p => ({ ...p, photo: '', photoPublicId: '' }))}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Fabric / Material</label>
                                <PhotoUploadZone
                                    photoUrl={item.fabricPhoto}
                                    uploading={item.uploadingFabric}
                                    onFileSelect={file => handlePhotoUpload(file, 'fabricPhoto')}
                                    onRemove={() => setItem(p => ({ ...p, fabricPhoto: '', fabricPhotoPublicId: '' }))}
                                />
                            </div>
                            {item.photos.length > 0 && (
                                <div>
                                    <label className={labelCls}>Extra Photos</label>
                                    <div className="flex flex-wrap gap-2">
                                        {item.photos.map((url, idx) => (
                                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border/40 group/photo">
                                                <img src={url} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => setItem(p => ({ ...p, photos: p.photos.filter(x => x !== url) }))} className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity"><X size={13} className="text-white" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <ExtraPhotoPasteZone onUpload={handleExtraUpload} uploading={item.uploadingExtra} />
                        </div>

                        {/* Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Category</label>
                                <Input value={item.category} onChange={e => setItem(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Master Bedroom" className={smallInputCls} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Description *</label>
                                <Input value={item.description} onChange={e => setItem(p => ({ ...p, description: e.target.value }))} placeholder="e.g. King Size Bed" className={smallInputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Size</label>
                                <Input value={item.size} onChange={e => setItem(p => ({ ...p, size: e.target.value }))} placeholder="L×W×H" className={smallInputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Material</label>
                                <Input value={item.material} onChange={e => setItem(p => ({ ...p, material: e.target.value }))} placeholder="e.g. Ply + Laminate" className={smallInputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Polish / Finish</label>
                                <Input value={item.polish} onChange={e => setItem(p => ({ ...p, polish: e.target.value }))} placeholder="e.g. PU Polish" className={smallInputCls} />
                            </div>
                            {/* Fabric Names */}
                            <div className="col-span-2 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className={labelCls} style={{ marginBottom: 0 }}>Fabric Details</label>
                                    <button type="button" onClick={() => setItem(p => ({ ...p, fabrics: [...p.fabrics, ''] }))} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-lg"><Plus size={10} /> Add</button>
                                </div>
                                <div className="space-y-2">
                                    {item.fabrics.map((fabric, fi) => (
                                        <div key={fi} className="flex items-center gap-2">
                                            <Input value={fabric} onChange={e => {
                                                const nw = [...item.fabrics]; nw[fi] = e.target.value;
                                                setItem(p => ({ ...p, fabrics: nw }));
                                            }} placeholder={`Fabric ${fi + 1}`} className={smallInputCls} />
                                            {item.fabrics.length > 1 && (
                                                <button type="button" onClick={() => setItem(p => ({ ...p, fabrics: p.fabrics.filter((_, i) => i !== fi) }))} className="text-muted-foreground/30 hover:text-rose-400 p-1.5 rounded-lg shrink-0"><X size={13} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* === Section 3: Financials & Assignment === */}
                <FormSection title="Financials & Team Assignment" icon={ReceiptText}>
                    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 justify-between items-start">
                        
                        {/* Left side: Pricing (Inputs & Totals) */}
                        <div className="w-full lg:w-1/2 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/40 pb-2 mb-4">Financial Inputs</h3>
                                <div className="grid grid-cols-2 gap-4 lg:pr-8">
                                    <div>
                                        <label className={labelCls}>Qty</label>
                                        <Input type="number" min="1" value={item.qty} onChange={e => setItem(p => ({ ...p, qty: Number(e.target.value) }))} className={smallInputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Selling Price (₹)</label>
                                        <Input type="number" min="0" value={item.sellingPrice || ''} onChange={e => setItem(p => ({ ...p, sellingPrice: Number(e.target.value) }))} placeholder="0" className={smallInputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 lg:pr-8">
                                    <div>
                                        <label className={labelCls}>Discount (₹)</label>
                                        <Input
                                            type="number" min="0"
                                            value={discount || ''}
                                            onChange={e => setDiscount(Number(e.target.value))}
                                            placeholder="0"
                                            className={smallInputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Advance Pay (₹)</label>
                                        <Input
                                            type="number" min="0"
                                            value={advanceAmount || ''}
                                            onChange={e => setAdvanceAmount(Number(e.target.value))}
                                            placeholder="0"
                                            className={smallInputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Totals Box */}
                            <div className="pt-4 lg:pr-8">
                                <div className="space-y-4 pt-6 border-t border-border/20">
                                    <div className="flex justify-between text-sm font-bold text-muted-foreground/80 pb-2 border-b border-border/20">
                                        <span>Subtotal</span>
                                        <span>₹{itemTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-muted-foreground/80 pb-2 border-b border-border/20">
                                        <span>Discount</span>
                                        <span className="text-rose-500">-₹{(discount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-muted-foreground/80 pb-2 border-b border-border/20">
                                        <span>Advance Paid</span>
                                        <span className="text-emerald-500">₹{(advanceAmount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-border/40">
                                        <p className="font-black text-foreground text-base">Final Amt</p>
                                        <p className="font-black text-primary text-xl">₹{amountAfterDiscount.toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right side: Team Assignment */}
                        <div className="w-full lg:w-1/2 lg:pl-12 lg:border-l border-border/20 space-y-4">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground border-b border-border/40 pb-2 mb-5">Department Assignments</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                                {['production', 'qc', 'dispatch', 'accounts'].map((dept) => {
                                    const options = getStaffOptions(dept);
                                    const selectedStaff = assignedTo[dept] || [];
                                    
                                    return (
                                        <div key={dept} className="space-y-3">
                                            <label className={cn(labelCls, 'mb-1')}>
                                                {dept === 'production' ? 'Factory Manager' : dept}
                                            </label>
                                            
                                            <div className="space-y-2">
                                                {selectedStaff.map(userId => {
                                                    const u = allUsers.find(x => x._id === userId);
                                                    return (
                                                        <div key={userId} className="flex flex-col p-2.5 rounded-xl bg-card border border-border/60 shadow-sm relative group">
                                                            <span className="text-xs font-black text-foreground pr-6">{u?.name || 'Unknown'}</span>
                                                            <span className="text-[9px] font-bold text-muted-foreground/60">{u?.email}</span>
                                                            <button type="button" onClick={() => removeStaff(dept, userId)} className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-500/50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <SearchableSelect
                                                options={options}
                                                value=""
                                                onChange={(val) => assignStaff(dept, val)}
                                                placeholder={`+ Assign ${dept} staff`}
                                                searchPlaceholder="Search staff..."
                                                className={cn(smallInputCls, "border-dashed bg-transparent hover:bg-muted/30 text-primary/70")}
                                                clearable={false}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </FormSection>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-6">
                    <Button type="submit" disabled={isBusy} className="h-14 px-8 rounded-2xl font-black text-sm uppercase tracking-[0.2em] gap-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20">
                        {isBusy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {isBusy ? 'Processing...' : 'Create Flow'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate('/jobcards')} className="h-14 px-6 rounded-2xl font-black text-sm uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-foreground">
                        Cancel
                    </Button>
                </div>
            </form>

            <CreateClientModal open={showCreateModal} onOpenChange={setShowCreateModal} onSuccess={(c: any) => { setSelectedClient(c); setShowCreateModal(false); }} />
        </motion.div>
    );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const inputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-bold text-[15px] px-5 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 shadow-xs';
const smallInputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-10 rounded-xl font-bold px-4 text-[13px] focus:ring-1 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30 w-full shadow-xs';
const labelCls = 'text-muted-foreground/60 text-[11px] font-black uppercase tracking-[0.2em] block mb-2.5 ml-1';

function ExtraPhotoPasteZone({ onUpload, uploading }: { onUpload: (file: File) => Promise<void>; uploading: boolean }) {
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
                        onUpload(file).then(() => toast.success('Extra photo pasted!'));
                        e.preventDefault();
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [isHovered, onUpload]);

    return (
        <label className={cn("cursor-pointer outline-none transition-all rounded-xl block", isHovered && "ring-2 ring-primary/40 animate-pulse bg-primary/5")} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/30 text-primary/60 text-xs font-bold hover:bg-primary/5 transition-all cursor-pointer', uploading && 'opacity-60 cursor-wait')}>
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
