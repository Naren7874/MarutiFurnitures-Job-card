import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Bell, Shield, Building2, User, Moon, Sun, ChevronRight, CheckCircle2, Globe, Laptop, Fingerprint, LogOut } from 'lucide-react';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

type Tab = 'profile' | 'company' | 'notifications' | 'security';

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>('profile');
    const { user, company, logout } = useAuthStore();

    const TABS: { key: Tab; icon: React.ElementType; label: string; desc: string }[] = [
        { key: 'profile', icon: User, label: 'Identity', desc: 'Personal preferences' },
        { key: 'company', icon: Building2, label: 'Organization', desc: 'Corporate details' },
        { key: 'notifications', icon: Bell, label: 'Alerts', desc: 'Activity streams' },
        { key: 'security', icon: Shield, label: 'Security', desc: 'Protection status' },
    ];

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-10">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-foreground text-3xl font-black tracking-tight mb-2">System Config</h1>
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                        <p className="text-muted-foreground text-sm font-semibold tracking-wide uppercase opacity-70">
                            Environment & Account Orchestration
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={logout}
                    className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-black text-[10px] uppercase tracking-[0.2em] px-6 h-11 rounded-xl"
                >
                    <LogOut size={16} className="mr-2" /> Deauthorize
                </Button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">
                {/* Sidebar Navigation */}
                <motion.nav
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                >
                    {TABS.map(({ key, icon: Icon, label, desc }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={cn(
                                "w-full group relative flex items-center gap-4 p-4 rounded-2xl transition-all text-left overflow-hidden",
                                tab === key
                                    ? "bg-white dark:bg-card shadow-lg shadow-black/5 border border-border dark:border-border/60"
                                    : "hover:bg-muted/30"
                            )}
                        >
                            {tab === key && (
                                <motion.div
                                    layoutId="activeTabBg"
                                    className="absolute inset-0 bg-primary/5 dark:bg-primary/10 -z-10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner",
                                tab === key ? "bg-primary text-white scale-110" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                                <Icon size={18} strokeWidth={tab === key ? 3 : 2} />
                            </div>
                            <div>
                                <p className={cn(
                                    "text-sm font-black tracking-tight",
                                    tab === key ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                )}>{label}</p>
                                <p className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-widest">{desc}</p>
                            </div>
                            {tab === key && (
                                <ChevronRight size={14} className="ml-auto text-primary" strokeWidth={3} />
                            )}
                        </button>
                    ))}
                </motion.nav>

                {/* Content Panel Area */}
                <div className="relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white/80 dark:bg-card/30 border border-border dark:border-border/50 rounded-[32px] p-8 md:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden group/card"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[200px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            {tab === 'profile' && (
                                <div className="space-y-12">
                                    <div className="space-y-1">
                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Personal Identity</h2>
                                        <p className="text-muted-foreground/60 text-sm font-medium">Manage your digital presence within the organization</p>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center gap-8 p-8 rounded-[24px] bg-white dark:bg-muted/20 border border-border dark:border-border/40 relative group/avatar shadow-inner">
                                        <div className="relative shrink-0">
                                            <div className="w-24 h-24 rounded-[28px] bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl transform transition-all group-hover/avatar:rotate-6">
                                                {user?.name?.charAt(0)}
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-lg">
                                                <Laptop size={14} />
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-left">
                                            <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                                                <p className="text-foreground text-2xl font-black tracking-tighter">{user?.name}</p>
                                                <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">Active Vendor</div>
                                            </div>
                                            <p className="text-muted-foreground font-bold text-sm mb-4">{user?.email}</p>
                                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">{user?.role?.replace('_', ' ')}</span>
                                                <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">{user?.department}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-border/20">
                                        <h3 className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">Environmental Control</h3>
                                        <SettingRow label="Visual Aesthetic" description="Toggle between high-contrast and low-light interfaces.">
                                            <div className="bg-muted p-1.5 rounded-2xl border border-border flex items-center gap-2">
                                                <AnimatedThemeToggler />
                                            </div>
                                        </SettingRow>
                                        <SettingRow label="Geographical Locale" description="Update regional formatting and standard time zones.">
                                            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                                                <Globe size={14} /> India (IST)
                                            </div>
                                        </SettingRow>
                                    </div>
                                </div>
                            )}

                            {tab === 'company' && (
                                <div className="space-y-12">
                                    <div className="space-y-1">
                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Organization Profile</h2>
                                        <p className="text-muted-foreground/60 text-sm font-medium">Verified corporate credentials and subscription status</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] block">Legal Entity Name</label>
                                            <div className="bg-muted/40 border border-border/40 p-4 rounded-2xl">
                                                <p className="text-foreground font-black tracking-tight">{company?.name}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] block">GST Identification</label>
                                            <div className="bg-white dark:bg-muted/40 border border-border dark:border-border/40 p-4 rounded-2xl flex items-center justify-between">
                                                <p className="text-foreground font-black tracking-widest uppercase">{(company as any)?.gstin ?? 'UNSENT'}</p>
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            </div>
                                        </div>
                                        <div className="col-span-full space-y-2">
                                            <label className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] block">Active License</label>
                                            <div className="bg-linear-to-br from-primary/5 to-indigo-500/5 border border-primary/20 p-6 rounded-[24px] flex items-center justify-between">
                                                <div>
                                                    <p className="text-primary font-black text-xl tracking-tighter uppercase mb-1">{(company as any)?.plan ?? 'Standard Enterprise'}</p>
                                                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Renewal Date: Oct 24, 2024</p>
                                                </div>
                                                <Button size="sm" className="bg-primary text-white font-black text-[9px] uppercase tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-primary/20">Upgrade Tier</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tab === 'notifications' && (
                                <div className="space-y-12">
                                    <div className="space-y-1">
                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Alert Preferences</h2>
                                        <p className="text-muted-foreground/60 text-sm font-medium">Customize how you receive real-time operational updates</p>
                                    </div>

                                    <div className="space-y-2 divide-y divide-border/20">
                                        {[
                                            { label: 'Lifecycle Status Changes', desc: 'Alert when job cards migrate across production stages', def: true },
                                            { label: 'Delivery Integrity Overdue', desc: 'Critical alerts for delayed client commitments', def: true },
                                            { label: 'Financial Approval Stream', desc: 'Updates on quotation and invoice authorization', def: false },
                                            { label: 'Inventory Depletion Alert', desc: 'Notifications for stock falling below safety thresholds', def: true },
                                            { label: 'Cloud WhatsApp Gateway', desc: 'Real-time push notifications via encrypted mobile channel', def: false },
                                        ].map((item) => (
                                            <SettingRow key={item.label} label={item.label} description={item.desc}>
                                                <Toggle defaultOn={item.def} />
                                            </SettingRow>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tab === 'security' && (
                                <div className="space-y-12">
                                    <div className="space-y-1">
                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Security & Governance</h2>
                                        <p className="text-muted-foreground/60 text-sm font-medium">Protect your account with multi-layered verification</p>
                                    </div>

                                    <div className="grid gap-6">
                                        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between group/row hover:bg-rose-500/10 transition-colors">
                                            <div>
                                                <p className="text-foreground font-black text-[15px] tracking-tight">Password Management</p>
                                                <p className="text-muted-foreground/60 text-xs font-bold uppercase tracking-widest mt-1">Last rotated 45 days ago</p>
                                            </div>
                                            <Button variant="outline" className="h-10 px-6 rounded-xl border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all">Reset Secret</Button>
                                        </div>

                                        <div className="p-6 rounded-2xl bg-linear-to-r from-blue-500/5 to-transparent border border-blue-500/10 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
                                                    <Fingerprint size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-foreground font-black text-[15px] tracking-tight">Biometric MFA</p>
                                                    <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Enhanced biometric verification layer</p>
                                                </div>
                                            </div>
                                            <span className="text-muted-foreground/30 text-[9px] font-black uppercase tracking-[0.2em] italic">Experimental</span>
                                        </div>

                                        <div className="pt-8 border-t border-border/20">
                                            <h3 className="text-muted-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Active Sessions</h3>
                                            <div className="space-y-4">
                                                {[
                                                    { device: 'Desktop Workstation', os: 'Linux / Chrome 122', ip: '103.21.**.**', current: true },
                                                    { device: 'Mobile Handset', os: 'Android 14 / Maruti App', ip: '27.56.**.**', current: false },
                                                ].map((s, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-muted/20 border border-border dark:border-border/30">
                                                        <div className="flex items-center gap-4">
                                                            <Laptop className={cn("text-muted-foreground/40", s.current && "text-primary")} size={18} />
                                                            <div>
                                                                <p className="text-foreground font-bold text-[13px] tracking-tight">{s.device} {s.current && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] uppercase tracking-tighter">Current</span>}</p>
                                                                <p className="text-muted-foreground/40 text-[10px] font-bold">{s.os} • {s.ip}</p>
                                                            </div>
                                                        </div>
                                                        {!s.current && <button className="text-[10px] font-black uppercase tracking-widest text-rose-500/50 hover:text-rose-600 transition-colors">Revoke</button>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-10 py-8 first:pt-0">
            <div className="flex-1 max-w-xl">
                <p className="text-foreground text-[15px] font-black tracking-tight">{label}</p>
                {description && <p className="text-muted-foreground/60 text-xs leading-relaxed mt-2 font-medium">{description}</p>}
            </div>
            <div className="shrink-0">
                {children}
            </div>
        </div>
    );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <button
            onClick={() => setOn(v => !v)}
            className={cn(
                "w-12 h-7 rounded-full transition-all relative p-1",
                on ? "bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" : "bg-muted border border-border"
            )}
        >
            <motion.span
                animate={{ x: on ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                    "block w-5 h-5 rounded-full shadow-2xl transition-colors",
                    on ? "bg-white" : "bg-muted-foreground/40"
                )}
            />
        </button>
    );
}
