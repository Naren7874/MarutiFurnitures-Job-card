import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, FileText, ClipboardList, CheckCircle, XCircle, Building2, Phone, Mail, Globe, MessageSquare, ChevronRight, PowerOff } from 'lucide-react';
import { useClient, useDeactivateClient } from '../hooks/useApi';
import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';

const FIELD = ({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) =>
    !value ? null : (
        <div className="group/field p-4 rounded-2xl bg-white dark:bg-muted/20 border border-border dark:border-border/40 hover:bg-card hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon size={12} className="text-primary/40 group-hover/field:text-primary transition-colors" />}
                <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-foreground text-sm font-black tracking-tight">{value}</p>
        </div >
    );

export default function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: raw, isLoading } = useClient(id ?? '');
    const client: any = (raw as any) ?? {};
    const deactivateMut = useDeactivateClient(id ?? '');
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);

    const handleDeactivate = async () => {
        await deactivateMut.mutateAsync();
        navigate('/clients');
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-6 max-w-4xl mx-auto">
                <div className="h-6 w-32 bg-muted/40 rounded-lg animate-pulse" />
                <div className="h-40 bg-card/40 rounded-[32px] animate-pulse border border-border/30" />
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-64 bg-card/40 rounded-[32px] animate-pulse border border-border/30" />
                    <div className="h-64 bg-card/40 rounded-[32px] animate-pulse border border-border/30" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 max-w-5xl mx-auto">
            {/* Header / Navigation */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
                <Link to="/clients" className="group flex items-center gap-3 text-muted-foreground hover:text-primary transition-all text-xs font-black uppercase tracking-widest">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/40 group-hover:bg-primary/10 transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Registry
                </Link>
                <div className="flex gap-2 flex-wrap">
                    <Link to={`/clients/${id}/edit`}>
                        <Button variant="outline" className="h-10 px-6 rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10 font-black text-[10px] uppercase tracking-widest gap-2">
                            ✏ Edit Client
                        </Button>
                    </Link>
                    <Button className="h-10 px-6 rounded-xl bg-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">
                        Create Transaction
                    </Button>
                    {client.isActive !== false && (
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDeactivate(true)}
                            className="h-10 px-5 rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-black text-[10px] uppercase tracking-widest gap-2"
                        >
                            <PowerOff size={13} /> Deactivate
                        </Button>
                    )}
                    {client.isActive === false && (
                        <span className="h-10 px-5 rounded-xl border border-rose-500/20 text-rose-500/60 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                            <PowerOff size={13} /> Deactivated
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Profile Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative group bg-white dark:bg-card/40 border border-border dark:border-border/50 rounded-[40px] p-8 md:p-12 shadow-2xl backdrop-blur-xl overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[160px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 relative z-10 text-center md:text-left">
                    <div className="relative shrink-0">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[32px] md:rounded-[40px] bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-4xl md:text-6xl font-black shadow-2xl transform transition-all group-hover:rotate-6">
                            {client.name?.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-primary shadow-xl">
                            {client.clientType === 'company' ? <Building2 size={24} /> : <User size={24} />}
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div>
                            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start mb-2">
                                <h1 className="text-foreground text-3xl md:text-5xl font-black tracking-tighter leading-none">{client.name}</h1>
                                {client.gstin && (
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border flex items-center gap-1.5",
                                        client.gstVerified ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                                    )}>
                                        {client.gstVerified ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        GST: {client.gstin}
                                    </div>
                                )}
                            </div>
                            {client.firmName && (
                                <p className="text-muted-foreground text-lg md:text-xl font-bold tracking-tight opacity-80">{client.firmName}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start pt-2 border-t border-border/30">
                            {[
                                { label: 'Client ID', value: id?.slice(-6).toUpperCase(), color: 'text-indigo-500' },
                                { label: 'Lifecycle', value: 'Active Portfolio', color: 'text-emerald-500' },
                                { label: 'Category', value: client.clientType?.toUpperCase() || 'CORE', color: 'text-rose-500' },
                            ].map((s, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-widest">{s.label}</p>
                                    <p className={cn("text-xs font-black tracking-wider uppercase", s.color)}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Information Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                <div className="space-y-8">
                    {/* Sections */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <motion.section
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-card/40 border border-border dark:border-border/50 rounded-[32px] p-6 space-y-6 backdrop-blur-md shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                                    <MessageSquare size={16} />
                                </div>
                                <h3 className="text-foreground text-sm font-black uppercase tracking-[0.2em]">Communications</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <FIELD icon={Phone} label="Primary Contact" value={client.phone} />
                                <FIELD icon={Mail} label="Corporate Email" value={client.email} />
                                <FIELD icon={MessageSquare} label="Instant Messaging" value={client.whatsapp} />
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white dark:bg-card/40 border border-border dark:border-border/50 rounded-[32px] p-6 space-y-6 backdrop-blur-md shadow-sm"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                                    <MapPin size={16} />
                                </div>
                                <h3 className="text-foreground text-sm font-black uppercase tracking-[0.2em]">Entity Location</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="p-6 rounded-2xl bg-muted/20 border border-border/40">
                                    <p className="text-foreground text-sm font-bold leading-relaxed">
                                        {client.address?.street},<br />
                                        {client.address?.city}, {client.address?.state}<br />
                                        <span className="text-primary font-black tracking-widest">{client.address?.pincode}</span>
                                    </p>
                                </div>
                                <Button variant="ghost" className="w-full justify-start h-10 px-0 hover:bg-transparent text-primary hover:text-primary/70 font-black text-[10px] uppercase tracking-widest gap-2">
                                    <Globe size={14} /> Navigate on Map
                                </Button>
                            </div>
                        </motion.section>
                    </div>

                    {/* Operational Summary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-card/40 border border-border dark:border-border/50 rounded-[32px] p-8 shadow-xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-foreground text-sm font-black uppercase tracking-[0.2em]">Operational History</h3>
                            <button className="text-primary font-black text-[9px] uppercase tracking-widest hover:underline">Full Audit Trail</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link to={`/quotations?clientId=${id}`} className="group flex items-center justify-between p-6 rounded-[24px] bg-muted/20 border border-border/40 hover:bg-primary hover:border-primary transition-all duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-card text-primary group-hover:bg-white/20 group-hover:text-white transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-foreground font-black tracking-tight group-hover:text-white transition-colors">Estimates</p>
                                        <p className="text-muted-foreground/60 text-[10px] uppercase font-black group-hover:text-white/60 transition-colors">8 Total Generated</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-muted-foreground/30 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                            </Link>
                            <Link to={`/jobcards?clientId=${id}`} className="group flex items-center justify-between p-6 rounded-[24px] bg-muted/20 border border-border/40 hover:bg-violet-600 hover:border-violet-600 transition-all duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-card text-violet-600 group-hover:bg-white/20 group-hover:text-white transition-colors">
                                        <ClipboardList size={20} />
                                    </div>
                                    <div>
                                        <p className="text-foreground font-black tracking-tight group-hover:text-white transition-colors">Engagements</p>
                                        <p className="text-muted-foreground/60 text-[10px] uppercase font-black group-hover:text-white/60 transition-colors">12 Active Cards</p>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-muted-foreground/30 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Sidebar Context */}
                <motion.aside
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6"
                >
                    <div className="bg-primary/5 rounded-[32px] p-6 border border-primary/10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-primary" />
                            <h4 className="text-foreground text-xs font-black uppercase tracking-widest italic">Strategic Notes</h4>
                        </div>
                        <p className="text-muted-foreground text-sm font-bold leading-relaxed italic opacity-80">
                            {client.notes || "Establish deeper strategic alignment with this entity. Key interests include large scale infrastructure projects and high-volume procurement."}
                        </p>
                    </div>

                    <div className="bg-card/40 rounded-[32px] p-6 border border-border animate-pulse">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entity Credit Limit</span>
                            <span className="text-emerald-500 text-[10px] font-black uppercase">Elite Tier</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-primary w-[75%]" />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-foreground/40">Used: ₹4.5L</span>
                            <span className="text-primary">Limit: ₹10L</span>
                        </div>
                    </div>
                </motion.aside>
            </div>

            {/* Deactivate Confirmation */}
            {confirmDeactivate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="bg-card border border-border rounded-[28px] p-8 max-w-md w-full shadow-2xl space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                <PowerOff size={20} className="text-rose-500" />
                            </div>
                            <div>
                                <p className="font-black text-foreground text-lg">Deactivate Client?</p>
                                <p className="text-muted-foreground/60 text-sm font-medium">{client.name} will be marked inactive.</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground/70 font-medium">This client will no longer appear in selection dropdowns. Existing records are preserved.</p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setConfirmDeactivate(false)} className="flex-1 rounded-xl h-11 font-bold border-border/60">Cancel</Button>
                            <Button onClick={handleDeactivate} disabled={deactivateMut.isPending} className="flex-1 rounded-xl h-11 font-black bg-rose-500 hover:bg-rose-600 text-white">
                                {deactivateMut.isPending ? 'Deactivating…' : 'Confirm Deactivate'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
