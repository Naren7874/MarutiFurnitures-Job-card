import { useState, useEffect } from 'react';
import { 
    Save, Loader2, MapPin, Sparkles,
    BadgeCheck, User2, Phone
} from 'lucide-react';
import { useVerifyGST } from '../../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '../../lib/utils';

const CLIENT_TYPES = [
    { value: 'direct_client', label: 'Direct Client', desc: 'Homeowner or individual buyer' },
    { value: 'architect', label: 'Architect Firm Name', desc: 'Design professional / Studio' },
    { value: 'project_designer', label: 'Project Designer', desc: 'Individual project designer' },
    { value: 'factory_manager', label: 'Factory Manager', desc: 'Production or operations lead' },
];

interface ClientFormProps {
    initialData?: any;
    onSuccess: (data: any) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    submitLabel?: string;
}

export default function ClientForm({ 
    initialData, 
    onSuccess, 
    onCancel, 
    isSubmitting,
    submitLabel = 'Save Client'
}: ClientFormProps) {
    const verifyGST = useVerifyGST();
    const [gstStatus, setGstStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [isSameAsWhatsapp, setIsSameAsWhatsapp] = useState(true);

    const [form, setForm] = useState({
        clientType: 'direct_client',
        name: '',
        firmName: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        gstin: '',
        notes: '',
        address: { houseNumber: '', line1: '', line2: '', city: '', pincode: '' },
    });

    useEffect(() => {
        if (initialData) {
            setForm({
                clientType: initialData.clientType || 'direct_client',
                name: initialData.name || '',
                firmName: initialData.firmName || '',
                phone: initialData.phone || '',
                whatsappNumber: initialData.whatsappNumber || '',
                email: initialData.email || '',
                gstin: initialData.gstin || '',
                notes: initialData.notes || '',
                address: {
                    houseNumber: initialData.address?.houseNumber || '',
                    line1: initialData.address?.line1 || '',
                    line2: initialData.address?.line2 || '',
                    city: initialData.address?.city || '',
                    pincode: initialData.address?.pincode || '',
                },
            });
            setIsSameAsWhatsapp(initialData.phone === initialData.whatsappNumber);
        }
    }, [initialData]);

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
    const setAddr = (field: string, value: string) =>
        setForm(f => ({ ...f, address: { ...f.address, [field]: value } }));

    const handleVerifyGST = async () => {
        if (!form.gstin || form.gstin.length !== 15) return;
        setGstStatus('verifying');
        try {
            const res: any = await verifyGST.mutateAsync({ gstin: form.gstin });
            if (res?.data) {
                setForm(f => ({
                    ...f,
                    firmName: res.data.legalName || f.firmName,
                    address: {
                        ...f.address,
                    },
                }));
                setGstStatus('verified');
            } else {
                setGstStatus('failed');
            }
        } catch {
            setGstStatus('failed');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            whatsappNumber: isSameAsWhatsapp ? form.phone : form.whatsappNumber
        };
        onSuccess(payload);
    };

    const selectedType = CLIENT_TYPES.find(t => t.value === form.clientType);

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {/* === Client Type === */}
            <div className="space-y-4">
                <label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest block ml-1">Select Client Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {CLIENT_TYPES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => set('clientType', t.value)}
                            className={cn(
                                'flex flex-col items-start gap-1.5 p-5 rounded-2xl border-2 text-left transition-all duration-300',
                                form.clientType === t.value
                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                    : 'border-border bg-card/40 hover:border-border/80 hover:bg-accent/5'
                            )}
                        >
                            <p className={cn('text-[11px] font-black uppercase tracking-wider', form.clientType === t.value ? 'text-primary' : 'text-foreground/70')}>{t.label}</p>
                            <p className="text-[10px] text-muted-foreground/50 font-medium leading-relaxed">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* === Left column === */}
                <div className="lg:col-span-7 space-y-10">

                    {/* Identity */}
                    <Section title="Contact Identity" icon={User2}>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField label="Contact Name *">
                                    <Input
                                        required
                                        value={form.name}
                                        onChange={(e) => set('name', e.target.value)}
                                        placeholder="e.g. Rohan Gupta"
                                        className={inputCls}
                                    />
                                </FormField>
                                <FormField label="Firm / Company Name">
                                    <Input
                                        value={form.firmName}
                                        onChange={(e) => set('firmName', e.target.value)}
                                        placeholder={selectedType?.value === 'direct_client' ? 'Optional' : 'e.g. Dreamscape Studio'}
                                        className={inputCls}
                                    />
                                </FormField>
                            </div>

                            {/* GSTIN with verify */}
                            <FormField label="GSTIN (Optional — required for GST invoicing)">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Input
                                            value={form.gstin}
                                            onChange={(e) => { set('gstin', e.target.value.toUpperCase()); setGstStatus('idle'); }}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            className={cn(inputCls, 'uppercase tracking-[0.15em] font-mono pr-10')}
                                        />
                                        {gstStatus === 'verified' && (
                                            <BadgeCheck className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleVerifyGST}
                                        disabled={form.gstin.length !== 15 || gstStatus === 'verifying'}
                                        className="shrink-0 cursor-pointer h-12 px-6 rounded-2xl font-black text-xs gap-2 transition-all border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                                    >
                                        {gstStatus === 'verifying' ? <Loader2 className="animate-spin" size={14} /> : <BadgeCheck size={14} />}
                                        {gstStatus === 'verifying' ? 'Verifying...' : 'Verify'}
                                    </Button>
                                </div>
                                {gstStatus === 'verified' && (
                                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-2 ml-1">
                                        <BadgeCheck size={12} /> GSTIN verified — firm name auto-filled
                                    </p>
                                )}
                                {gstStatus === 'failed' && (
                                    <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1">⚠ GSTIN verification failed. Check the number.</p>
                                )}
                            </FormField>
                        </div>
                    </Section>

                    {/* Communication */}
                    <Section title="Communication" icon={Phone}>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                                <FormField label="Phone Number *">
                                    <Input
                                        required
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => set('phone', e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className={inputCls}
                                    />
                                </FormField>
                                <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-2xl border border-border/10 transition-colors">
                                    <Checkbox 
                                        id="whatsapp-toggle" 
                                        checked={isSameAsWhatsapp}
                                        onCheckedChange={(checked) => setIsSameAsWhatsapp(checked === true)}
                                    />
                                    <label htmlFor="whatsapp-toggle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 cursor-pointer flex-1">
                                        Use same number for WhatsApp
                                    </label>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {!isSameAsWhatsapp && (
                                    <FormField label="WhatsApp Number">
                                        <Input
                                            type="tel"
                                            value={form.whatsappNumber}
                                            onChange={(e) => set('whatsappNumber', e.target.value)}
                                            placeholder="+91 98765 43210"
                                            className={inputCls}
                                        />
                                    </FormField>
                                )}
                                <FormField label="Email" className={cn(!isSameAsWhatsapp ? "" : "sm:col-span-2")}>
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => set('email', e.target.value)}
                                        placeholder="client@example.com"
                                        className={inputCls}
                                    />
                                </FormField>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* === Right column === */}
                <div className="lg:col-span-5 space-y-10">
                    <Section title="Address" icon={MapPin}>
                        <div className="grid gap-5">
                            <FormField label="House / Flat / Unit Number">
                                <Input value={form.address.houseNumber} onChange={(e) => setAddr('houseNumber', e.target.value)} placeholder="e.g. #402, 4th Floor" className={inputCls} />
                            </FormField>
                            <FormField label="Building / Area">
                                <Input value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="e.g. MG Road, Maruti Towers" className={inputCls} />
                            </FormField>
                            <FormField label="Landmark / Locality">
                                <Input value={form.address.line2} onChange={(e) => setAddr('line2', e.target.value)} placeholder="e.g. Near Indiranagar Metro" className={inputCls} />
                            </FormField>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="City">
                                    <Input value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="Ahmedabad" className={inputCls} />
                                </FormField>
                                <FormField label="Pincode">
                                    <Input value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} placeholder="380001" className={inputCls} />
                                </FormField>
                            </div>
                        </div>
                    </Section>

                    <Section title="Internal Notes" icon={Sparkles}>
                        <textarea
                            value={form.notes}
                            onChange={(e) => set('notes', e.target.value)}
                            rows={4}
                            placeholder="Any specific client requirements or special notes..."
                            className="w-full bg-white dark:bg-card/40 border border-border dark:border-border/40 rounded-2xl px-5 py-4 text-foreground text-sm font-medium placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-all shadow-none"
                        />
                    </Section>
                </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 pt-8 border-t border-border/10">
                <Button type="button" variant="ghost" onClick={onCancel} className="h-14 px-8 rounded-[20px] font-black text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 px-10 rounded-[20px] font-black text-xs uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isSubmitting ? 'Registering...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-medium px-4 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40 shadow-none';

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border dark:border-border/30 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-border/30">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Icon size={14} />
                </div>
                <p className="text-foreground text-sm font-black uppercase tracking-wider">{title}</p>
            </div>
            {children}
        </div>
    );
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            <label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest block">{label}</label>
            {children}
        </div>
    );
}
