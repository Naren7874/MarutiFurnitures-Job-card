import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Bell, Shield, User, ChevronRight, Globe, Laptop, Fingerprint, LogOut, ScrollText, Download, Calendar as CalendarIcon, ArrowRight, Hash, Inbox } from 'lucide-react';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '@/lib/axios';
import { SearchableSelect } from '@/components/ui/searchable-select';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

type Tab = 'profile' | 'notifications' | 'security' | 'auditlog';

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>('profile');
    const { user, logout, hasPermission } = useAuthStore();


    const TABS: { key: Tab; icon: React.ElementType; label: string; desc: string }[] = [
        { key: 'profile', icon: User, label: 'Identity', desc: 'Personal preferences' },
        { key: 'notifications', icon: Bell, label: 'Alerts', desc: 'Activity streams' },
        { key: 'security', icon: Shield, label: 'Security', desc: 'Protection status' },
        ...(hasPermission('audit_log.view') ? [{ key: 'auditlog' as Tab, icon: ScrollText, label: 'Audit Log', desc: 'System event trail' }] : []),
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-10">
            {/* Header Area */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-4xl font-black  text-foreground mb-3 leading-none">System Config</h1>
                    <div className="flex items-center gap-3.5">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
                        <p className="text-muted-foreground/60 text-[13px] font-black uppercase tracking-[0.15em]">
                            Environment & Account Orchestration
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    onClick={logout}
                    className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 font-black text-[11px] uppercase tracking-[0.2em] px-8 h-12 rounded-xl"
                >
                    <LogOut size={16} className="mr-2.5" /> Deauthorize
                </Button>
            </motion.div>

            <Tabs defaultValue="profile" value={tab} onValueChange={(val) => setTab(val as Tab)} orientation="vertical" className="w-full h-auto">
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 items-start w-full">
                    {/* Sidebar Navigation */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <TabsList className="flex flex-col h-auto bg-transparent gap-2 p-0 w-full items-stretch">
                            {TABS.map(({ key, icon: Icon, label, desc }) => (
                                <TabsTrigger
                                    key={key}
                                    value={key}
                                    className={cn(
                                        "w-full group relative flex items-center gap-4 p-4 rounded-2xl transition-all text-left justify-start h-auto border border-transparent shadow-none! data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:border-border/50 dark:data-[state=active]:border-white/5 data-[state=active]:shadow-lg data-[state=active]:shadow-black/5"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-inner shrink-0",
                                        tab === key ? "bg-primary text-white scale-110" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        <Icon size={18} strokeWidth={tab === key ? 3 : 2} />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className={cn(
                                            "text-[15px] font-black tracking-tight leading-none mb-1",
                                            tab === key ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                                        )}>{label}</p>
                                        <p className="text-[11px] text-muted-foreground/50 font-black uppercase tracking-widest">{desc}</p>
                                    </div>
                                    {tab === key && (
                                        <ChevronRight size={14} className="ml-auto text-primary" strokeWidth={3} />
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </motion.div>

                    {/* Content Panel Area */}
                    <div className="relative w-full">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={tab}
                                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <TabsContent value={tab} className="m-0 mt-0 w-full">
                                    <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden relative">
                                        <CardContent className="p-8 md:p-12">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-primary/5 to-transparent rounded-bl-[200px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />

                                            {tab === 'profile' && (
                                                <div className="space-y-12">
                                                    <div className="space-y-1">
                                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Personal Identity</h2>
                                                        <CardDescription className="text-muted-foreground/60 text-sm font-medium">Manage your digital presence within the organization</CardDescription>
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row items-center gap-8 p-8 rounded-[24px] bg-card border border-border/60 relative group/avatar shadow-inner">
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
                                                                <p className="text-foreground text-2xl font-black ">{user?.name}</p>
                                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded-md px-2 py-0.5">Active Vendor</Badge>
                                                            </div>
                                                            <p className="text-muted-foreground/80 font-bold text-sm mb-4">{user?.email}</p>
                                                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                                <Badge variant="secondary" className="bg-card border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground rounded-xl px-3 py-1.5">{user?.role?.replace('_', ' ')}</Badge>
                                                                <Badge variant="secondary" className="bg-card border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground rounded-xl px-3 py-1.5">{user?.department}</Badge>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6 pt-6 border-t border-border/20">
                                                        <h3 className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.2em]">Environmental Control</h3>
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

                                            {tab === 'notifications' && (
                                                <div className="space-y-12">
                                                    <div className="space-y-1">
                                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Alert Preferences</h2>
                                                        <CardDescription className="text-muted-foreground/60 text-sm font-medium">Customize how you receive real-time operational updates</CardDescription>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {[
                                                            { label: 'Lifecycle Status Changes', desc: 'Alert when job cards migrate across production stages', def: true, id: 'lifecycle' },
                                                            { label: 'Delivery Integrity Overdue', desc: 'Critical alerts for delayed client commitments', def: true, id: 'delivery' },
                                                            { label: 'Financial Approval Stream', desc: 'Updates on quotation and proforma invoice authorization', def: false, id: 'financial' },
                                                            { label: 'Inventory Depletion Alert', desc: 'Notifications for stock falling below safety thresholds', def: true, id: 'inventory' },
                                                            { label: 'Cloud WhatsApp Gateway', desc: 'Real-time push notifications via encrypted mobile channel', def: false, id: 'whatsapp' },
                                                        ].map((item, idx) => (
                                                            <div key={item.id}>
                                                                <SettingRow label={item.label} description={item.desc}>
                                                                    <Switch defaultChecked={item.def} />
                                                                </SettingRow>
                                                                {idx < 4 && <Separator className="bg-border/20" />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {tab === 'security' && (
                                                <div className="space-y-12">
                                                    <div className="space-y-1">
                                                        <h2 className="text-foreground text-2xl font-black tracking-tight">Security & Governance</h2>
                                                        <CardDescription className="text-muted-foreground/60 text-sm font-medium">Protect your account with multi-layered verification</CardDescription>
                                                    </div>

                                                    <div className="grid gap-6">
                                                        <Card className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between group/row hover:bg-rose-500/10 transition-colors shadow-none">
                                                            <div>
                                                                <p className="text-foreground font-black text-[15px] tracking-tight">Password Management</p>
                                                                <CardDescription className="text-muted-foreground/60 text-[11px] font-black uppercase tracking-widest mt-1">Last rotated 45 days ago</CardDescription>
                                                            </div>
                                                            <Button variant="outline" className="h-10 px-6 rounded-xl border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white font-black text-[11px] uppercase tracking-widest transition-all">Reset Secret</Button>
                                                        </Card>

                                                        <Card className="p-6 rounded-2xl bg-linear-to-r from-blue-500/5 to-transparent border border-blue-500/10 flex items-center justify-between shadow-none">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
                                                                    <Fingerprint size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-foreground font-black text-[15px] tracking-tight">Biometric MFA</p>
                                                                    <CardDescription className="text-muted-foreground/60 text-[11px] font-black uppercase tracking-widest">Enhanced biometric verification layer</CardDescription>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="text-muted-foreground/30 text-[9px] font-black uppercase tracking-[0.2em] italic border-none">Experimental</Badge>
                                                        </Card>

                                                        <div className="pt-8 border-t border-border/20">
                                                            <h3 className="text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.2em] mb-6">Active Sessions</h3>
                                                            <div className="space-y-4">
                                                                {[
                                                                    { device: 'Desktop Workstation', os: 'Linux / Chrome 122', ip: '103.21.**.**', current: true },
                                                                    { device: 'Mobile Handset', os: 'Android 14 / Maruti App', ip: '27.56.**.**', current: false },
                                                                ].map((s, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/60 shadow-xs">
                                                                        <div className="flex items-center gap-4">
                                                                            <Laptop className={cn("text-muted-foreground/40", s.current && "text-primary")} size={18} />
                                                                            <div>
                                                                                <p className="text-foreground font-bold text-[13px] tracking-tight">{s.device} {s.current && <Badge variant="outline" className="ml-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] uppercase  border-none">Current</Badge>}</p>
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
                                            {tab === 'auditlog' && (
                                                <AuditLogTab />
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
    create: '#10B981', update: '#6366F1', delete: '#EF4444',
    login: '#8B5CF6', logout: '#64748B', role_change: '#F59E0B',
    permission_grant: '#10B981', permission_deny: '#EF4444',
    deactivate: '#EF4444', activate: '#10B981', password_reset: '#8ffb03',
}

interface AuditEntry {
    _id: string; action: string; actorName: string; actorRole: string
    resourceType?: string; resourceLabel?: string
    changes?: Record<string, { from: unknown; to: unknown }>
    ip?: string; createdAt: string
}

function AuditLogTab() {
    const [filterAction, setFilterAction] = useState('')
    const [filterFrom, setFilterFrom] = useState('')
    const [filterTo, setFilterTo] = useState('')
    const [page, setPage] = useState(1)

    const params = new URLSearchParams({ page: String(page), limit: '10' })
    if (filterAction) params.set('action', filterAction)
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)

    const { company } = useAuthStore();
    const companyId = company?.id;

    const { data, isLoading, isFetching } = useQuery<{ data: AuditEntry[]; pagination: { total: number; pages: number } }>({
        queryKey: ['audit-logs', companyId, filterAction, filterFrom, filterTo, page],
        queryFn: () => api.get(`/privileges/access-logs?${params.toString()}`).then(r => r.data),
    })

    const hasFilters = filterAction || filterFrom || filterTo
    const clearFilters = () => {
        setFilterAction('')
        setFilterFrom('')
        setFilterTo('')
        setPage(1)
    }

    const handleExport = () => {
        const exportParams = new URLSearchParams()
        if (filterAction) exportParams.set('action', filterAction)
        if (filterFrom) exportParams.set('from', filterFrom)
        if (filterTo) exportParams.set('to', filterTo)
        window.open(`/api/privileges/access-logs/export?${exportParams.toString()}`, '_blank')
    }

    const logs = data?.data || []
    const pagination = data?.pagination

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <h2 className="text-4xl font-black  flex items-center gap-3.5 mb-2">
                        <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                            <ScrollText className="size-5 text-primary" strokeWidth={3} />
                        </div>
                        Audit Log
                    </h2>
                    <p className="text-muted-foreground/60 text-[13px] font-black uppercase tracking-widest">Monitoring system integrity and user accountability</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleExport} variant="outline" className="rounded-xl h-10 px-4 text-xs font-bold gap-2 bg-background border-border/40 hover:bg-accent/50 transition-all">
                        <Download className="size-3.5" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="p-1.5 rounded-2xl border border-border/40 bg-accent/5 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                    <SearchableSelect
                        options={[
                            { value: '', label: 'All Actions' },
                            ...Object.entries(ACTION_COLORS).map(([a, color]) => ({ value: a, label: a, color }))
                        ]}
                        value={filterAction}
                        onChange={(val: string) => { setFilterAction(val); setPage(1) }}
                        placeholder="Filter by action..."
                        searchPlaceholder="Search actions..."
                        clearable
                        size="sm"
                        className="bg-background/80 border-none shadow-none focus-within:ring-1 ring-primary/20"
                    />
                </div>

                <div className="h-8 w-px bg-border/40 shrink-0 hidden md:block" />

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 rounded-xl border border-border/20 bg-background/50 px-3 text-xs justify-start text-left font-bold min-w-[140px]", !filterFrom && "text-muted-foreground/50")}>
                                <CalendarIcon className="size-3.5 mr-2 opacity-50" />
                                {filterFrom ? format(new Date(filterFrom), "MMM dd, yyyy") : "Start Date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-border/20 shadow-none" align="start">
                            <Calendar
                                mode="single"
                                selected={filterFrom ? new Date(filterFrom) : undefined}
                                onSelect={(date) => { setFilterFrom(date ? format(date, "yyyy-MM-dd") : ''); setPage(1) }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground/30 font-bold text-[10px]">TO</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-9 rounded-xl border border-border/20 bg-background/50 px-3 text-xs justify-start text-left font-bold min-w-[140px]", !filterTo && "text-muted-foreground/50")}>
                                <CalendarIcon className="size-3.5 mr-2 opacity-50" />
                                {filterTo ? format(new Date(filterTo), "MMM dd, yyyy") : "End Date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-border/20 shadow-none" align="start">
                            <Calendar
                                mode="single"
                                selected={filterTo ? new Date(filterTo) : undefined}
                                onSelect={(date) => { setFilterTo(date ? format(date, "yyyy-MM-dd") : ''); setPage(1) }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl ml-auto"
                    >
                        Reset Filters
                    </Button>
                )}
            </div>

            {/* Log Grid */}
            <div className="relative">
                {isLoading || isFetching ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="size-10 rounded-2xl bg-primary/5 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
                            <ScrollText className="size-5 text-primary/40" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 animate-pulse">Syncing logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-accent/5 rounded-3xl border border-dashed border-border/60">
                        <div className="size-16 rounded-3xl bg-muted/20 flex items-center justify-center mb-4">
                            <Inbox className="size-8 text-muted-foreground/20" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">Clean Slate</h3>
                        <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">No audit records found matching your current filter criteria.</p>
                        {hasFilters && (
                            <Button variant="link" onClick={clearFilters} className="mt-4 text-xs font-bold text-primary">Clear all filters</Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {logs.map((entry, idx) => {
                                const color = ACTION_COLORS[entry.action] || '#64748B'
                                return (
                                    <motion.div
                                        key={entry._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                                        className="group relative p-5 rounded-3xl border border-border/40 bg-card hover:bg-accent/5 hover:border-border transition-all duration-300"
                                    >
                                        <div className="flex gap-5">
                                            {/* Left side action icon */}
                                            <div className="shrink-0 flex flex-col items-center pt-1">
                                                <div className="size-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300"
                                                    style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                                                    <div className="size-2 rounded-full animate-pulse" style={{ background: color }} />
                                                </div>
                                                <div className="w-[2px] flex-1 bg-linear-to-b from-border/40 to-transparent mt-3 group-last:hidden" />
                                            </div>

                                            {/* Right content */}
                                            <div className="flex-1 min-w-0 space-y-3">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
                                                            style={{ color, background: `${color}10`, border: `1px solid ${color}20` }}>
                                                            {entry.action.replace('_', ' ')}
                                                        </span>
                                                        <h4 className="font-bold text-foreground text-[13px] leading-tight">
                                                            {entry.actorName}
                                                            {entry.resourceLabel && (
                                                                <span className="text-muted-foreground/40 font-medium ml-2">
                                                                    modified <span className="text-foreground/80 underline decoration-primary/20">{entry.resourceType}</span> · <span className="text-primary font-bold">{entry.resourceLabel}</span>
                                                                </span>
                                                            )}
                                                        </h4>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[11px] font-bold text-muted-foreground/60">{format(new Date(entry.createdAt), "MMM d, yyyy")}</p>
                                                        <p className="text-[10px] text-muted-foreground/30 font-mono ">{format(new Date(entry.createdAt), "hh:mm a")}</p>
                                                    </div>
                                                </div>

                                                {entry.changes && Object.keys(entry.changes).length > 0 && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                                        {Object.entries(entry.changes).map(([field, diff]) => (
                                                            <div key={field} className="p-3 rounded-2xl bg-accent/5 border border-border/20 space-y-2 group/field hover:border-primary/20 transition-colors">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover/field:text-primary transition-colors">{field}</span>
                                                                    <div className="flex gap-1">
                                                                        <div className="size-1.5 rounded-full bg-red-400/20 group-hover/field:bg-red-400 transition-colors" />
                                                                        <div className="size-1.5 rounded-full bg-emerald-400/20 group-hover/field:bg-emerald-400 transition-colors" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="flex-1 bg-red-500/5 rounded-lg px-2 py-1.5 border border-red-500/10 min-w-0">
                                                                        <p className="text-[11px] text-red-500/70 line-through truncate font-medium">{String((diff as any).from || 'None')}</p>
                                                                    </div>
                                                                    <ArrowRight className="size-3 text-muted-foreground/20 shrink-0" />
                                                                    <div className="flex-1 bg-emerald-500/5 rounded-lg px-2 py-1.5 border border-emerald-500/10 min-w-0">
                                                                        <p className="text-[11px] text-emerald-600 font-bold truncate">{String((diff as any).to || 'None')}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 pt-1">
                                                    {entry.ip && (
                                                        <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                                                            <Globe className="size-3 text-muted-foreground" />
                                                            <span className="text-[9px] font-mono font-bold text-muted-foreground">{entry.ip}</span>
                                                        </div>
                                                    )}
                                                    <div className="h-px flex-1 bg-border/20" />
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Hash className="size-3 text-muted-foreground/40" />
                                                        <span className="text-[9px] font-mono text-muted-foreground/40">{entry._id.slice(-8)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            {pagination && pagination.total > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 mt-8 border-t border-border/40">
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-accent/5 border border-border/40">
                            <span className="text-xs font-bold text-foreground">
                                {logs.length} <span className="text-muted-foreground/60 font-medium">OF</span> {pagination.total}
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Audit Events Logged</p>
                    </div>

                    {pagination.pages > 1 && (
                        <div className="p-1 px-2.5 rounded-2xl bg-accent/5 border border-border/40 transition-colors">
                            <Pagination>
                                <PaginationContent className="gap-2">
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)) }}
                                            className={cn("h-9 px-4 rounded-xl hover:bg-accent/10 transition-all text-foreground/80 hover:text-foreground", page === 1 && "pointer-events-none opacity-20")}
                                        />
                                    </PaginationItem>

                                    {[...Array(pagination.pages)].map((_, i) => {
                                        const p = i + 1;
                                        if (p === 1 || p === pagination.pages || (p >= page - 1 && p <= page + 1)) {
                                            return (
                                                <PaginationItem key={p}>
                                                    <PaginationLink
                                                        onClick={(e) => { e.preventDefault(); setPage(p) }}
                                                        isActive={page === p}
                                                        className={cn("h-9 w-9 rounded-xl font-bold text-xs transition-all",
                                                            page === p
                                                                ? "bg-primary text-primary-foreground font-black shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                                                        )}
                                                    >
                                                        {p}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        }
                                        if (p === page - 2 || p === page + 2) {
                                            return <PaginationItem key={p} className="mx-0.5"><PaginationEllipsis className="scale-75 opacity-50" /></PaginationItem>;
                                        }
                                        return null;
                                    })}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={(e) => { e.preventDefault(); setPage(p => Math.min(pagination.pages, p + 1)) }}
                                            className={cn("h-9 px-4 rounded-xl hover:bg-accent/10 transition-all text-foreground/80 hover:text-foreground", page === pagination.pages && "pointer-events-none opacity-20")}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            )}
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
