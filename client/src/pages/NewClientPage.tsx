import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, MapPin, MessageSquare, Sparkles } from 'lucide-react';
import { useCreateClient } from '../hooks/useApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function NewClientPage() {
    const navigate = useNavigate();
    const create = useCreateClient();

    const [form, setForm] = useState({
        name: '', phone: '', email: '', whatsapp: '',
        clientType: 'individual', firmName: '', gstin: '',
        notes: '',
        address: { street: '', city: '', state: '', pincode: '' },
    });

    const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
    const setAddr = (field: string, value: string) =>
        setForm(f => ({ ...f, address: { ...f.address, [field]: value } }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await create.mutateAsync(form);
        navigate('/clients');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 max-w-4xl mx-auto space-y-12"
        >
            {/* Header / Navigation */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest"
                >
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-card dark:bg-muted/40 border border-border dark:border-transparent group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Discard Entry
                </button>
                <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-70">
                        New Entity Registration
                    </p>
                </div>
            </motion.div>

            <div className="space-y-1 text-center md:text-left">
                <h1 className="text-foreground text-4xl md:text-5xl font-black tracking-tighter leading-none mb-4">Onboard New Client</h1>
                <p className="text-muted-foreground text-lg font-bold opacity-60">Initialize a new relationship within the Maruti ecosystem.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10 pb-20">
                {/* Identification Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-8 space-y-8"
                    >
                        <Section title="Primary Identification" icon={Sparkles}>
                            <div className="grid gap-8">
                                <FormField label="Entity Name or Core Project">
                                    <Input
                                        required
                                        value={form.name}
                                        onChange={(e) => set('name', e.target.value)}
                                        placeholder="e.g. Skyline Residency / Rohan Gupta"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-14 rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all font-black text-lg tracking-tight px-6 shadow-sm"
                                    />
                                </FormField>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <FormField label="Classification">
                                        <Select value={form.clientType} onValueChange={(v: string) => set('clientType', v)}>
                                            <SelectTrigger className="h-12 bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest px-6 shadow-sm focus:ring-primary/10 transition-all">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl shadow-2xl">
                                                <SelectItem value="individual" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 hover:bg-primary/10">Individual / Residential</SelectItem>
                                                <SelectItem value="company" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 hover:bg-primary/10">Company / Commercial</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormField>

                                    {form.clientType === 'company' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                        >
                                            <FormField label="Corporate Firm Name">
                                                <Input
                                                    value={form.firmName}
                                                    onChange={(e) => set('firmName', e.target.value)}
                                                    placeholder="Business Name"
                                                    className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-tight px-6 shadow-sm"
                                                />
                                            </FormField>
                                        </motion.div>
                                    )}
                                </div>

                                <FormField label="GSTIN Identifier (Optional)">
                                    <Input
                                        value={form.gstin}
                                        onChange={(e) => set('gstin', e.target.value)}
                                        placeholder="22AAAAA0000A1Z5"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl uppercase font-black tracking-[0.2em] text-xs px-6 shadow-sm"
                                    />
                                </FormField>
                            </div>
                        </Section>

                        <Section title="Communication Channels" icon={MessageSquare}>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <FormField label="Primary Link (Phone)">
                                    <Input
                                        required
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => set('phone', e.target.value)}
                                        placeholder="+91 9876543210"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-wider px-6 shadow-sm"
                                    />
                                </FormField>
                                <FormField label="Direct Messaging (WhatsApp)">
                                    <Input
                                        type="tel"
                                        value={form.whatsapp}
                                        onChange={(e) => set('whatsapp', e.target.value)}
                                        placeholder="+91 9876543210"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-wider px-6 shadow-sm"
                                    />
                                </FormField>
                                <FormField label="Electronic Mail" className="sm:col-span-2">
                                    <Input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => set('email', e.target.value)}
                                        placeholder="client@corporate.domain"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-tight px-6 shadow-sm"
                                    />
                                </FormField>
                            </div>
                        </Section>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="md:col-span-4 space-y-8"
                    >
                        <Section title="Geographical Site" icon={MapPin}>
                            <div className="space-y-6">
                                <FormField label="Street Detail">
                                    <Input
                                        value={form.address.street}
                                        onChange={(e) => setAddr('street', e.target.value)}
                                        placeholder="Site Location"
                                        className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-tight px-4 shadow-sm"
                                    />
                                </FormField>
                                <div className="grid grid-cols-1 gap-6">
                                    <FormField label="City Area">
                                        <Input
                                            value={form.address.city}
                                            onChange={(e) => setAddr('city', e.target.value)}
                                            placeholder="City"
                                            className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-tight px-4 shadow-sm"
                                        />
                                    </FormField>
                                    <FormField label="State / Zone">
                                        <Input
                                            value={form.address.state}
                                            onChange={(e) => setAddr('state', e.target.value)}
                                            placeholder="State"
                                            className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-tight px-4 shadow-sm"
                                        />
                                    </FormField>
                                    <FormField label="Standard PIN">
                                        <Input
                                            value={form.address.pincode}
                                            onChange={(e) => setAddr('pincode', e.target.value)}
                                            placeholder="400001"
                                            className="bg-white dark:bg-card/40 border-border dark:border-border/40 text-foreground h-12 rounded-2xl font-black tracking-[0.3em] px-4 shadow-sm"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </Section>

                        <Section title="Internal Intelligence" icon={Sparkles}>
                            <textarea
                                value={form.notes}
                                onChange={(e) => set('notes', e.target.value)}
                                rows={6}
                                placeholder="Strategic insights on client requirements or constraints..."
                                className="w-full bg-white dark:bg-card/40 border border-border dark:border-border/40 rounded-[28px] px-6 py-5 text-foreground text-sm font-bold placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-primary/50 transition-all shadow-sm backdrop-blur-md"
                            />
                        </Section>
                    </motion.div>
                </div>

                {/* Submission Flow */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center pt-10"
                >
                    <div className="w-full max-w-lg space-y-4">
                        <Button
                            type="submit"
                            disabled={create.isPending}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-16 rounded-[28px] font-black text-xl shadow-[0_20px_50px_-10px_rgba(var(--primary),0.4)] gap-4 w-full transition-all hover:scale-[1.02] active:scale-98 overflow-hidden relative group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {create.isPending ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} strokeWidth={3} />}
                                {create.isPending ? 'ORCHESTRATING REGISTRY...' : 'INSTANTIATE ENTITY'}
                            </span>
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </Button>
                        <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-[0.3em] text-center italic">
                            By proceeding, you authorize this data into the permanent firm records.
                        </p>
                    </div>
                </motion.div>
            </form>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer { 100% { transform: translateX(100%); } }
                .animate-shimmer { animation: shimmer 1.5s infinite; }
            ` }} />
        </motion.div>
    );
}

// ── Components ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
    return (
        <div className="bg-white/80 dark:bg-card/20 border border-border dark:border-border/20 rounded-[40px] p-8 space-y-8 shadow-2xl shadow-black/5 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10 group-hover:bg-primary/30 transition-colors" />
            <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-black uppercase tracking-[0.2em] italic">{title}</p>
                <div className="p-2 rounded-xl bg-muted/50 text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Icon size={16} />
                </div>
            </div>
            {children}
        </div>
    );
}

function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("space-y-3", className)}>
            <label className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-[0.2em] block px-1">{label}</label>
            {children}
        </div>
    );
}
