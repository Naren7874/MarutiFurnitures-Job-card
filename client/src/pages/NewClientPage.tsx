import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Save, Loader2, MapPin, Sparkles,
    BadgeCheck, User2, Phone,
} from 'lucide-react';
import { useCreateClient, useVerifyGST } from '../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const CLIENT_TYPES = [
    { value: 'direct_client', label: 'Direct Client', desc: 'Homeowner or individual buyer' },
    { value: 'architect', label: 'Architect', desc: 'Design professional' },
    { value: 'designer', label: 'Interior Designer', desc: 'Design studio or firm' },
    { value: 'contractor', label: 'Contractor', desc: 'Construction or builder company' },
];

export default function NewClientPage() {
    const navigate = useNavigate();
    const create = useCreateClient();
    const verifyGST = useVerifyGST();
    const [gstStatus, setGstStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');

    const [form, setForm] = useState({
        clientType: 'direct_client',
        name: '',
        firmName: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        gstin: '',
        notes: '',
        address: { line1: '', line2: '', city: '', state: '', pincode: '' },
    });

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
                        state: res.data.stateName || f.address.state,
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await create.mutateAsync(form);
        navigate('/clients');
    };

    const selectedType = CLIENT_TYPES.find(t => t.value === form.clientType);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 md:p-8 max-w-5xl mx-auto space-y-10"
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between gap-6"
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
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
                        New Client Registration
                    </p>
                </div>
            </motion.div>

            <div>
                <h1 className="text-foreground text-4xl font-black tracking-tighter mb-2">Register New Client</h1>
                <p className="text-muted-foreground text-sm font-semibold opacity-60">
                    Add an external client — this is separate from your internal staff.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">

                {/* === Client Type === */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {CLIENT_TYPES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => set('clientType', t.value)}
                            className={cn(
                                'flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all',
                                form.clientType === t.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-card hover:border-border/80 hover:bg-accent/5'
                            )}
                        >
                            <p className={cn('text-xs font-black uppercase tracking-wider', form.clientType === t.value ? 'text-primary' : 'text-foreground/70')}>{t.label}</p>
                            <p className="text-[10px] text-muted-foreground/50 font-medium">{t.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* === Left column === */}
                    <div className="md:col-span-8 space-y-6">

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
                                        <Input
                                            value={form.gstin}
                                            onChange={(e) => { set('gstin', e.target.value.toUpperCase()); setGstStatus('idle'); }}
                                            placeholder="22AAAAA0000A1Z5"
                                            maxLength={15}
                                            className={cn(inputCls, 'uppercase tracking-[0.15em] font-mono')}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleVerifyGST}
                                            disabled={form.gstin.length !== 15 || gstStatus === 'verifying'}
                                            className="shrink-0 h-12 px-5 rounded-xl font-bold text-xs gap-2 transition-all"
                                        >
                                            {gstStatus === 'verifying' ? <Loader2 className="animate-spin" size={14} /> : <BadgeCheck size={14} />}
                                            {gstStatus === 'verifying' ? 'Verifying...' : 'Verify'}
                                        </Button>
                                    </div>
                                    {gstStatus === 'verified' && (
                                        <p className="text-emerald-500 text-xs font-bold flex items-center gap-1.5 mt-1">
                                            <BadgeCheck size={12} /> GSTIN verified — firm name & state auto-filled
                                        </p>
                                    )}
                                    {gstStatus === 'failed' && (
                                        <p className="text-rose-500 text-xs font-bold mt-1">⚠ GSTIN verification failed. Check the number and try again.</p>
                                    )}
                                </FormField>
                            </div>
                        </Section>

                        {/* Communication */}
                        <Section title="Communication Channels" icon={Phone}>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <FormField label="Phone *">
                                    <Input
                                        required
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => set('phone', e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className={inputCls}
                                    />
                                </FormField>
                                <FormField label="WhatsApp Number">
                                    <Input
                                        type="tel"
                                        value={form.whatsappNumber}
                                        onChange={(e) => set('whatsappNumber', e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className={inputCls}
                                    />
                                </FormField>
                                <FormField label="Email" className="sm:col-span-2">
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => set('email', e.target.value)}
                                        placeholder="client@example.com"
                                        className={inputCls}
                                    />
                                </FormField>
                            </div>
                        </Section>
                    </div>

                    {/* === Right column === */}
                    <div className="md:col-span-4 space-y-6">
                        <Section title="Address" icon={MapPin}>
                            <div className="space-y-4">
                                <FormField label="Address Line 1">
                                    <Input value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="Street / Building" className={inputCls} />
                                </FormField>
                                <FormField label="Address Line 2">
                                    <Input value={form.address.line2} onChange={(e) => setAddr('line2', e.target.value)} placeholder="Area / Locality" className={inputCls} />
                                </FormField>
                                <FormField label="City">
                                    <Input value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="City" className={inputCls} />
                                </FormField>
                                <FormField label="State">
                                    <Input value={form.address.state} onChange={(e) => setAddr('state', e.target.value)} placeholder="State" className={inputCls} />
                                </FormField>
                                <FormField label="Pincode">
                                    <Input value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} placeholder="400001" className={inputCls} />
                                </FormField>
                            </div>
                        </Section>

                        <Section title="Internal Notes" icon={Sparkles}>
                            <textarea
                                value={form.notes}
                                onChange={(e) => set('notes', e.target.value)}
                                rows={4}
                                placeholder="Any specific client requirements or special notes..."
                                className="w-full bg-white dark:bg-card/40 border border-border dark:border-border/40 rounded-2xl px-5 py-4 text-foreground text-sm font-medium placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-all"
                            />
                        </Section>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4 pt-4">
                    <Button
                        type="submit"
                        disabled={create.isPending}
                        className="h-12 px-8 rounded-2xl font-black text-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                        {create.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {create.isPending ? 'Saving...' : 'Create Client'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => navigate('/clients')} className="h-12 px-6 rounded-2xl font-bold text-sm text-muted-foreground">
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
