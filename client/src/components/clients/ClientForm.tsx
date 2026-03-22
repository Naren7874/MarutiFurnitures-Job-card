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
import { toast } from 'sonner';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        firstName: '',
        middleName: '',
        lastName: '',
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
            // Smart name splitting for existing clients
            const nameParts = (initialData.name || '').split(' ').filter(Boolean);
            const derivedFirst = nameParts[0] || '';
            const derivedLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
            const derivedMiddle = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

            setForm({
                clientType: initialData.clientType || 'direct_client',
                firstName: initialData.firstName || derivedFirst,
                middleName: initialData.middleName || derivedMiddle,
                lastName: initialData.lastName || derivedLast,
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

        // ── Validation ────────────────────────────────────────────────────────
        if (!PHONE_REGEX.test(form.phone)) {
            toast.error('Invalid Phone Number', {
                description: 'Please enter a valid 10-digit Indian mobile number starting with 6-9.'
            });
            return;
        }

        if (form.email && !EMAIL_REGEX.test(form.email)) {
            toast.error('Invalid Email Format', {
                description: 'Please enter a valid email address (e.g. client@example.com).'
            });
            return;
        }

        if (!isSameAsWhatsapp && form.whatsappNumber && !PHONE_REGEX.test(form.whatsappNumber)) {
            toast.error('Invalid WhatsApp Number', {
                description: 'The WhatsApp number must also be a valid 10-digit mobile number.'
            });
            return;
        }

        const payload = {
            ...form,
            whatsappNumber: isSameAsWhatsapp ? form.phone : form.whatsappNumber
        };
        onSuccess(payload);
    };

    const inputCls = 'h-12 rounded-2xl border-2 border-primary/10 transition-all focus:border-primary/40 focus:ring-4 focus:ring-primary/5 font-semibold text-sm px-6';

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-7 space-y-10">
                    <Section title="Contact Identity" icon={User2}>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField label="First Name *">
                                    <Input
                                        required
                                        value={form.firstName}
                                        onChange={(e) => set('firstName', e.target.value)}
                                        placeholder="e.g. Rohan"
                                        className={inputCls}
                                    />
                                </FormField>
                                <FormField label="Middle Name (Optional)">
                                    <Input
                                        value={form.middleName}
                                        onChange={(e) => set('middleName', e.target.value)}
                                        placeholder="e.g. Kumar"
                                        className={inputCls}
                                    />
                                </FormField>
                                <FormField label="Last Name *">
                                    <Input
                                        required
                                        value={form.lastName}
                                        onChange={(e) => set('lastName', e.target.value)}
                                        placeholder="e.g. Gupta"
                                        className={inputCls}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Firm / Company Name">
                                <Input
                                    value={form.firmName}
                                    onChange={(e) => set('firmName', e.target.value)}
                                    placeholder="Optional"
                                    className={inputCls}
                                />
                            </FormField>

                            <FormField label="GSTIN (Optional)">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Input
                                            value={form.gstin}
                                            onChange={(e) => { set('gstin', e.target.value.toUpperCase()); setGstStatus('idle'); }}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            className={cn(inputCls, 'uppercase tracking-[0.15em] font-mono pr-12')}
                                        />
                                        {gstStatus === 'verified' && (
                                            <BadgeCheck className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleVerifyGST}
                                        disabled={form.gstin.length !== 15 || gstStatus === 'verifying'}
                                        className="h-12 px-6 rounded-2xl font-black text-xs gap-2 border-2 border-primary/20 hover:border-primary/40"
                                    >
                                        {gstStatus === 'verifying' ? <Loader2 className="animate-spin" size={14} /> : <BadgeCheck size={14} />}
                                        {gstStatus === 'verifying' ? 'Verifying...' : 'Verify'}
                                    </Button>
                                </div>
                                {gstStatus === 'verified' && (
                                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1">GSTIN verified</p>
                                )}
                            </FormField>
                        </div>
                    </Section>

                    <Section title="Communication" icon={Phone}>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                                <FormField label="Phone Number *">
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" size={16} />
                                        <Input
                                            required
                                            type="tel"
                                            maxLength={10}
                                            value={form.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                set('phone', val);
                                            }}
                                            placeholder="10-digit Mobile Number"
                                            className={cn(inputCls, 'pl-12')}
                                        />
                                    </div>
                                </FormField>
                                <div className="flex items-center gap-2 pb-4">
                                    <Checkbox 
                                        id="whatsapp" 
                                        checked={isSameAsWhatsapp} 
                                        onCheckedChange={(checked) => setIsSameAsWhatsapp(checked === true)}
                                    />
                                    <label htmlFor="whatsapp" className="text-xs font-bold text-muted-foreground/80 cursor-pointer">Same as WhatsApp</label>
                                </div>
                            </div>

                            {!isSameAsWhatsapp && (
                                <FormField label="WhatsApp Number">
                                    <Input
                                        type="tel"
                                        maxLength={10}
                                        value={form.whatsappNumber}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            set('whatsappNumber', val);
                                        }}
                                        placeholder="WhatsApp Number"
                                        className={inputCls}
                                    />
                                </FormField>
                            )}

                            <FormField label="Email Address">
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set('email', e.target.value)}
                                    placeholder="e.g. client@example.com"
                                    className={inputCls}
                                />
                            </FormField>
                        </div>
                    </Section>
                </div>

                <div className="lg:col-span-5 space-y-10">
                    <Section title="Address Details" icon={MapPin}>
                        <div className="grid gap-5">
                            <FormField label="House / Plot Number">
                                <Input value={form.address.houseNumber} onChange={(e) => setAddr('houseNumber', e.target.value)} placeholder="e.g. 102 / Plot-7" className={inputCls} />
                            </FormField>
                            <FormField label="Address Line 1">
                                <Input value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="Building name, Street" className={inputCls} />
                            </FormField>
                            <FormField label="Address Line 2">
                                <Input value={form.address.line2} onChange={(e) => setAddr('line2', e.target.value)} placeholder="Area, Landmark" className={inputCls} />
                            </FormField>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="City">
                                    <Input value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="Ahmedabad" className={inputCls} />
                                </FormField>
                                <FormField label="Pincode">
                                    <Input value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} placeholder="380001" maxLength={6} className={inputCls} />
                                </FormField>
                            </div>
                        </div>
                    </Section>

                    <Section title="Project Notes" icon={Sparkles}>
                        <textarea
                            value={form.notes}
                            onChange={(e) => set('notes', e.target.value)}
                            placeholder="Add specific client preferences, budget notes, or follow-up details..."
                            className="w-full h-32 bg-card/10 border-2 border-primary/10 rounded-[24px] p-6 text-sm font-semibold focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                        />
                    </Section>

                    <div className="flex gap-4 pt-4">
                        <Button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-1 h-16 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={20} />}
                            {submitLabel}
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={onCancel}
                            className="h-16 px-8 rounded-[24px] border-2 border-border font-black text-xs uppercase tracking-widest hover:bg-muted transition-all"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border/60 rounded-[40px] p-8 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-foreground text-lg font-black tracking-tight leading-none mb-1">{title}</h3>
                    <div className="h-1 w-8 bg-primary/20 rounded-full" />
                </div>
            </div>
            {children}
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 ml-1">{label}</label>
            {children}
        </div>
    );
}
