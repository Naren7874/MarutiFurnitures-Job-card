import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, MapPin, Sparkles,
    BadgeCheck, User2, Phone,
} from 'lucide-react';
import { useClient, useUpdateClient, useVerifyGST } from '../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const CLIENT_TYPES = [
    { value: 'direct_client', label: 'Direct Client', desc: 'Homeowner or individual buyer' },
    { value: 'architect', label: 'Architect Firm Name', desc: 'Design professional / Studio' },
    { value: 'designer', label: 'Project Designer', desc: 'Individual interior designer' },
    { value: 'factory_manager', label: 'Factory Manager', desc: 'Production or operations lead' },
];

export default function EditClientPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const update = useUpdateClient(id ?? '');
    const verifyGST = useVerifyGST();
    const { data: raw, isLoading } = useClient(id ?? '');
    const existing: any = (raw as any)?.data ?? (raw as any) ?? {};
    const [gstStatus, setGstStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [isSameAsWhatsapp, setIsSameAsWhatsapp] = useState(true);
    const [ready, setReady] = useState(false);

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

    // Pre-populate from existing data
    useEffect(() => {
        if (existing?._id) {
            setForm({
                clientType: existing.clientType || 'direct_client',
                name: existing.name || '',
                firmName: existing.firmName || '',
                phone: existing.phone || '',
                whatsappNumber: existing.whatsappNumber || '',
                email: existing.email || '',
                gstin: existing.gstin || '',
                notes: existing.notes || '',
                address: {
                    houseNumber: existing.address?.houseNumber || '',
                    line1: existing.address?.line1 || '',
                    line2: existing.address?.line2 || '',
                    city: existing.address?.city || '',
                    pincode: existing.address?.pincode || '',
                },
            });
            setIsSameAsWhatsapp(existing.phone === existing.whatsappNumber);
            setReady(true);
        }
    }, [existing?._id]);

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
                    address: { ...f.address /* state is removed */ },
                }));
                setGstStatus('verified');
            } else { setGstStatus('failed'); }
        } catch { setGstStatus('failed'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...form,
            whatsappNumber: isSameAsWhatsapp ? form.phone : form.whatsappNumber
        };
        await update.mutateAsync(payload);
        navigate(`/clients/${id}`);
    };

    if (isLoading || !ready) {
        return (
            <div className="p-8 space-y-6 max-w-5xl mx-auto">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted/40 rounded-3xl animate-pulse border border-border/30" />
                ))}
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 max-w-5xl mx-auto space-y-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between gap-6">
                <button type="button" onClick={() => navigate(`/clients/${id}`)}
                    className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Client
                </button>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">Edit Client</p>
                </div>
            </motion.div>

            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tighter mb-2">Edit Client</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">Update contact information and details.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">

                {/* Client Type */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CLIENT_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => set('clientType', t.value)}
                            className={cn('flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all',
                                form.clientType === t.value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-border/80 hover:bg-accent/5')}>
                            <p className={cn('text-xs font-black uppercase tracking-wider', form.clientType === t.value ? 'text-primary' : 'text-foreground/70')}>{t.label}</p>
                            <p className="text-[10px] text-muted-foreground/50 font-medium">{t.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Left column */}
                    <div className="md:col-span-8 space-y-6">
                        <Section title="Contact Identity" icon={User2}>
                            <div className="grid gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FormField label="Contact Name *">
                                        <Input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rohan Gupta" className={inputCls} />
                                    </FormField>
                                    <FormField label="Firm / Company Name">
                                        <Input value={form.firmName} onChange={e => set('firmName', e.target.value)} placeholder="e.g. Dreamscape Studio" className={inputCls} />
                                    </FormField>
                                </div>

                                <FormField label="GSTIN (Optional)">
                                    <div className="flex gap-3">
                                        <Input value={form.gstin} onChange={e => { set('gstin', e.target.value.toUpperCase()); setGstStatus('idle'); }}
                                            placeholder="22AAAAA0000A1Z5" maxLength={15} className={cn(inputCls, 'uppercase tracking-[0.15em] font-mono')} />
                                        <Button type="button" variant="outline" onClick={handleVerifyGST}
                                            disabled={form.gstin.length !== 15 || gstStatus === 'verifying'}
                                            className="shrink-0 h-12 px-5 rounded-xl font-bold text-xs gap-2 transition-all">
                                            {gstStatus === 'verifying' ? <Loader2 className="animate-spin" size={14} /> : <BadgeCheck size={14} />}
                                            {gstStatus === 'verifying' ? 'Verifying...' : 'Verify'}
                                        </Button>
                                    </div>
                                    {gstStatus === 'verified' && <p className="text-emerald-500 text-xs font-bold flex items-center gap-1.5 mt-1"><BadgeCheck size={12} /> GSTIN verified</p>}
                                    {gstStatus === 'failed' && <p className="text-rose-500 text-xs font-bold mt-1">⚠ GSTIN verification failed.</p>}
                                </FormField>
                            </div>
                        </Section>

                        <Section title="Communication Channels" icon={Phone}>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <FormField label="Phone Number *">
                                    <Input required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
                                </FormField>
                                <div className="flex items-center space-x-2 py-2">
                                    <Checkbox 
                                        id="whatsapp-toggle" 
                                        checked={isSameAsWhatsapp}
                                        onCheckedChange={(checked) => setIsSameAsWhatsapp(checked === true)}
                                    />
                                    <label htmlFor="whatsapp-toggle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 cursor-pointer">
                                        Use same number for WhatsApp
                                    </label>
                                </div>
                                {!isSameAsWhatsapp && (
                                    <FormField label="WhatsApp Number">
                                        <Input type="tel" value={form.whatsappNumber} onChange={e => set('whatsappNumber', e.target.value)} placeholder="+91 98765 43210" className={inputCls} />
                                    </FormField>
                                )}
                                <FormField label="Email" className="sm:col-span-2">
                                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="client@example.com" className={inputCls} />
                                </FormField>
                            </div>
                        </Section>
                    </div>

                    {/* Right column */}
                    <div className="md:col-span-4 space-y-6">
                        <Section title="Address" icon={MapPin}>
                             <div className="space-y-4">
                                <FormField label="House / Flat / Unit Number">
                                    <Input value={form.address.houseNumber} onChange={e => setAddr('houseNumber', e.target.value)} placeholder="e.g. #402, 4th Floor" className={inputCls} />
                                </FormField>
                                <FormField label="Address Line 1 (Street/Building)">
                                    <Input value={form.address.line1} onChange={e => setAddr('line1', e.target.value)} placeholder="e.g. MG Road, Maruti Towers" className={inputCls} />
                                </FormField>
                                <FormField label="Address Line 2 (Area)">
                                    <Input value={form.address.line2} onChange={e => setAddr('line2', e.target.value)} placeholder="e.g. Indiranagar" className={inputCls} />
                                </FormField>
                                <FormField label="City">
                                    <Input value={form.address.city} onChange={e => setAddr('city', e.target.value)} placeholder="City" className={inputCls} />
                                </FormField>
                                <FormField label="Pincode">
                                    <Input value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)} placeholder="400001" className={inputCls} />
                                </FormField>
                            </div>
                        </Section>

                        <Section title="Internal Notes" icon={Sparkles}>
                            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
                                placeholder="Any specific client requirements or special notes..."
                                className="w-full bg-white dark:bg-card/40 border border-border dark:border-border/40 rounded-2xl px-5 py-4 text-foreground text-sm font-medium placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-all" />
                        </Section>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-4">
                    <Button type="submit" disabled={update.isPending}
                        className="h-12 px-8 rounded-2xl font-black text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                        {update.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {update.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate(`/clients/${id}`)} className="h-12 px-6 rounded-2xl font-bold text-sm text-muted-foreground">
                        Cancel
                    </Button>
                </div>
            </form>
        </motion.div>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-medium px-4 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/40 shadow-none';

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-card/20 border border-border dark:border-border/30 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 pb-1 border-b border-border/30">
                <div className="p-2 rounded-xl bg-primary/10 text-primary"><Icon size={14} /></div>
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
