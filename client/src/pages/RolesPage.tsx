import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ShieldCheck, Plus, Trash2, Edit2, X, Loader2,
    CheckCircle2, AlertCircle, Database, Globe, User, Search, Lock, MoreVertical
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppRole {
    _id: string
    name: string
    isSystem: boolean
    permissions: string[]
    dataScope: 'own' | 'department' | 'all'
    isActive: boolean
    createdAt: string
}

// ── All available permissions grouped by resource ─────────────────────────────

const PERMISSION_GROUPS = [
    {
        group: 'Job Cards',
        prefix: 'jobcard',
        icon: '📋',
        perms: ['jobcard.create', 'jobcard.view', 'jobcard.edit', 'jobcard.delete', 'jobcard.export', 'jobcard.close', 'jobcard.assign', 'jobcard.override_status'],
    },
    {
        group: 'Clients',
        prefix: 'client',
        icon: '👤',
        perms: ['client.create', 'client.view', 'client.edit', 'client.delete', 'client.verify_gst'],
    },
    {
        group: 'Quotations',
        prefix: 'quotation',
        icon: '📄',
        perms: ['quotation.create', 'quotation.view', 'quotation.edit', 'quotation.send', 'quotation.approve', 'quotation.reject', 'quotation.delete'],
    },
    {
        group: 'Projects',
        prefix: 'project',
        icon: '🏗️',
        perms: ['project.create', 'project.view', 'project.edit', 'project.delete'],
    },
    {
        group: 'Design Requests',
        prefix: 'designrequest',
        icon: '🎨',
        perms: ['designrequest.create', 'designrequest.view', 'designrequest.edit', 'designrequest.upload', 'designrequest.signoff'],
    },
    {
        group: 'Production Stage',
        prefix: 'productionStage',
        icon: '🏭',
        perms: ['productionStage.view', 'productionStage.edit'],
    },
    {
        group: 'QC Stage',
        prefix: 'qcStage',
        icon: '🔍',
        perms: ['qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail'],
    },
    {
        group: 'Dispatch Stage',
        prefix: 'dispatchStage',
        icon: '🚚',
        perms: ['dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver'],
    },
    {
        group: 'Invoices',
        prefix: 'invoice',
        icon: '🧾',
        perms: ['invoice.create', 'invoice.view', 'invoice.edit', 'invoice.delete', 'invoice.send', 'invoice.payment', 'invoice.archive'],
    },
    {
        group: 'Inventory',
        prefix: 'inventory',
        icon: '📦',
        perms: ['inventory.create', 'inventory.view', 'inventory.edit', 'inventory.delete'],
    },
    {
        group: 'Purchase Orders',
        prefix: 'purchaseOrder',
        icon: '🛒',
        perms: ['purchaseOrder.create', 'purchaseOrder.view', 'purchaseOrder.edit', 'purchaseOrder.approve'],
    },
    {
        group: 'Reports',
        prefix: 'reports',
        icon: '📊',
        perms: ['reports.view_financial', 'reports.view_production', 'reports.view_delivery', 'reports.export'],
    },
    {
        group: 'Users & Roles',
        prefix: 'user',
        icon: '👥',
        perms: [
            'user.create', 'user.view', 'user.edit', 'user.deactivate', 'user.delete',
            'privilege.create', 'privilege.view', 'privilege.edit', 'privilege.delete', 'privilege.grant', 'privilege.deny'
        ],
    },
    {
        group: 'Settings & Utils',
        prefix: 'settings',
        icon: '⚙️',
        perms: [
            'settings.view', 'settings.edit', 'settings.company_edit',
            'audit_log.view', 'audit_log.export',
            'notification.view',
            'whatsapp.send_manual', 'gst.verify'
        ],
    },
]

const DATA_SCOPES = [
    { value: 'own' as const, label: 'Own Data Only', icon: User, desc: 'Can only see records they created or assigned to', color: '#F59E0B' },
    { value: 'department' as const, label: 'Department Data', icon: Database, desc: 'Can see all records within their department', color: '#8B5CF6' },
    { value: 'all' as const, label: 'All Company Data', icon: Globe, desc: 'Full visibility across the entire company', color: '#10B981' },
]

const SCOPE_COLORS: Record<string, string> = { own: '#F59E0B', department: '#8B5CF6', all: '#10B981' }

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchRoles = async (): Promise<AppRole[]> => {
    const { data } = await api.get('/privileges/roles')
    return data.data
}

const createRole = async (body: { name: string; permissions: string[]; dataScope: string }) => {
    const { data } = await api.post('/privileges/roles', body)
    return data.data
}

const updateRole = async ({ id, body }: { id: string; body: Partial<AppRole> }) => {
    const { data } = await api.put(`/privileges/roles/${id}`, body)
    return data.data
}

const deleteRole = async (id: string) => {
    const { data } = await api.delete(`/privileges/roles/${id}`)
    return data
}

// ── Role editor drawer ─────────────────────────────────────────────────────────
function RoleDrawer({ open, onClose, editRole, onSuccess }: {
    open: boolean; onClose: () => void; editRole: AppRole | null; onSuccess: (msg: string) => void
}) {
    const qc = useQueryClient()
    const [name, setName] = useState('')
    const [dataScope, setDataScope] = useState<'own' | 'department' | 'all'>('own')
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set())
    const [error, setError] = useState('')
    const [permSearch, setPermSearch] = useState('')

    // Pre-fill when editing — re-runs whenever drawer opens or editRole changes
    useEffect(() => {
        if (editRole) {
            setName(editRole.name)
            setDataScope(editRole.dataScope || 'own')
            setSelectedPerms(new Set(editRole.permissions || []))
        } else {
            setName('')
            setDataScope('own')
            setSelectedPerms(new Set())
        }
        setError('')
        setPermSearch('')
    }, [open, editRole])

    const togglePerm = (perm: string) => {
        setSelectedPerms(prev => {
            const next = new Set(prev)
            next.has(perm) ? next.delete(perm) : next.add(perm)
            return next
        })
    }

    const toggleGroup = (perms: string[]) => {
        const all = perms.every(p => selectedPerms.has(p))
        setSelectedPerms(prev => {
            const next = new Set(prev)
            if (all) perms.forEach(p => next.delete(p))
            else perms.forEach(p => next.add(p))
            return next
        })
    }

    const selectAll = () => setSelectedPerms(new Set(PERMISSION_GROUPS.flatMap(g => g.perms)))
    const clearAll = () => setSelectedPerms(new Set())

    const createMut = useMutation({
        mutationFn: createRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); onSuccess('Role created successfully'); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to create role'),
    })
    const updateMut = useMutation({
        mutationFn: updateRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); onSuccess('Role updated successfully'); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to update role'),
    })

    const isPending = createMut.isPending || updateMut.isPending

    const handleSave = () => {
        setError('')
        if (!name.trim()) { setError('Role name is required'); return }
        const body = { name: name.trim(), permissions: [...selectedPerms], dataScope }
        if (editRole) updateMut.mutate({ id: editRole._id, body })
        else createMut.mutate(body)
    }

    const filteredGroups = permSearch
        ? PERMISSION_GROUPS.map(g => ({
            ...g,
            perms: g.perms.filter(p => p.toLowerCase().includes(permSearch.toLowerCase())),
        })).filter(g => g.perms.length > 0)
        : PERMISSION_GROUPS

    const totalPerms = PERMISSION_GROUPS.reduce((sum, g) => sum + g.perms.length, 0)

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex justify-end"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                    {/* ← KEY FIX: h-screen makes ScrollArea work */}
                    <motion.aside
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative z-10 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-screen"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
                            <div>
                                <h2 className="font-black text-lg text-foreground tracking-tight">
                                    {editRole ? 'Edit Role' : 'New Custom Role'}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {selectedPerms.size} of {totalPerms} permissions
                                    </span>
                                    {selectedPerms.size > 0 && (
                                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-300"
                                                style={{ width: `${(selectedPerms.size / totalPerms) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose} className="rounded-xl shrink-0">
                                <X className="size-4" />
                            </Button>
                        </div>

                        {/* Scrollable body */}
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="p-6 space-y-6">
                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                                        >
                                            <AlertCircle className="size-4 shrink-0" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role Name *</Label>
                                    <Input
                                        placeholder="e.g. Senior Designer"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="rounded-xl h-11"
                                        autoFocus
                                    />
                                </div>

                                {/* Data Scope */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Visibility</Label>
                                    <div className="space-y-2">
                                        {DATA_SCOPES.map(({ value, label, icon: Icon, desc, color }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setDataScope(value)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                                                    dataScope === value
                                                        ? 'border-transparent text-foreground'
                                                        : 'border-border hover:border-muted-foreground/30 bg-transparent'
                                                )}
                                                style={dataScope === value ? {
                                                    backgroundColor: `${color}10`,
                                                    borderColor: `${color}40`,
                                                } : {}}
                                            >
                                                <div className="p-2 rounded-lg shrink-0" style={{
                                                    backgroundColor: dataScope === value ? `${color}20` : undefined,
                                                }}>
                                                    <Icon className="size-4" style={{ color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold">{label}</p>
                                                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                                                </div>
                                                {dataScope === value && (
                                                    <CheckCircle2 className="size-4 shrink-0" style={{ color }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Permissions */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions</Label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={selectAll}
                                                className="text-[10px] font-bold text-primary hover:underline"
                                            >
                                                Select All
                                            </button>
                                            <span className="text-muted-foreground text-[10px]">·</span>
                                            <button
                                                type="button"
                                                onClick={clearAll}
                                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Permission search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Filter permissions…"
                                            value={permSearch}
                                            onChange={e => setPermSearch(e.target.value)}
                                            className="pl-8 h-9 rounded-lg text-xs"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        {filteredGroups.map(({ group, icon, perms }) => {
                                            const allSelected = perms.every(p => selectedPerms.has(p))
                                            const someSelected = perms.some(p => selectedPerms.has(p))
                                            return (
                                                <div key={group} className="border border-border rounded-xl overflow-hidden">
                                                    {/* Group header */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleGroup(perms)}
                                                        className={cn(
                                                            'w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors',
                                                            allSelected
                                                                ? 'bg-primary/10 text-primary'
                                                                : someSelected
                                                                    ? 'bg-primary/5 text-foreground'
                                                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span>{icon}</span>
                                                            <span className="uppercase tracking-wider">{group}</span>
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-semibold opacity-70">
                                                                {perms.filter(p => selectedPerms.has(p)).length}/{perms.length}
                                                            </span>
                                                            {allSelected
                                                                ? <CheckCircle2 className="size-3.5 text-primary" />
                                                                : <div className={cn(
                                                                    'size-3.5 rounded-full border-2',
                                                                    someSelected ? 'border-primary bg-primary/30' : 'border-muted-foreground/30'
                                                                )} />
                                                            }
                                                        </div>
                                                    </button>

                                                    {/* Permission buttons */}
                                                    <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-card">
                                                        {perms.map(perm => {
                                                            const action = perm.split('.').slice(1).join('.')
                                                            const isOn = selectedPerms.has(perm)
                                                            return (
                                                                <button
                                                                    key={perm}
                                                                    type="button"
                                                                    onClick={() => togglePerm(perm)}
                                                                    className={cn(
                                                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold capitalize transition-all text-left',
                                                                        isOn
                                                                            ? 'bg-primary/10 text-primary border border-primary/25'
                                                                            : 'bg-muted/30 text-muted-foreground border border-border/20 hover:border-border hover:text-foreground'
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        'size-2 rounded-full shrink-0 transition-colors',
                                                                        isOn ? 'bg-primary' : 'bg-muted-foreground/30'
                                                                    )} />
                                                                    {action.replace(/\./g, ' ')}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {filteredGroups.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground text-sm">
                                                No permissions matching &quot;{permSearch}&quot;
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Footer — always visible */}
                        <div className="border-t border-border px-6 py-4 flex gap-3 shrink-0 bg-card">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11 text-[13px] font-bold">Cancel</Button>
                            <Button onClick={handleSave} disabled={isPending} className="flex-1 rounded-xl h-11 font-black text-[13px] uppercase tracking-widest">
                                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                                {editRole ? 'Save Changes' : 'Create Role'}
                            </Button>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────
// ── Components ───────────────────────────────────────────────────────────────

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
    const qc = useQueryClient()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<AppRole | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AppRole | null>(null)
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const { hasPermission } = useAuthStore()

    const canCreate = hasPermission('privilege.create')
    const canEdit   = hasPermission('privilege.edit')
    const canDelete = hasPermission('privilege.delete')

    const { data: roles = [], isLoading, error: loadError } = useQuery<AppRole[]>({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    })

    const deleteMut = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setDeleteTarget(null); showToast('Role deleted', 'success') },
        onError: (e: any) => { setDeleteTarget(null); showToast(e.response?.data?.message || 'Cannot delete system role', 'error') },
    })

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const filtered = roles.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.dataScope.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <TooltipProvider>
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <ShieldCheck className="size-6 text-purple-500" />
                            </div>
                            Roles & Permissions
                        </h1>
                        <p className="text-[13px] text-muted-foreground mt-1 tracking-wide">
                            {roles.length} role{roles.length !== 1 ? 's' : ''} •{' '}
                            <span className="text-blue-500 font-bold uppercase tracking-widest text-[11px]">{roles.filter(r => r.isSystem).length} system</span>
                            {' '}• <span className="text-muted-foreground/60 font-bold uppercase tracking-widest text-[11px]">{roles.filter(r => !r.isSystem).length} custom</span>
                        </p>
                    </div>
                    {canCreate && (
                        <Button
                            onClick={() => { setEditTarget(null); setDrawerOpen(true) }}
                            className="rounded-xl h-11 px-6 font-bold gap-2"
                        >
                            <Plus className="size-4" /> New Role
                        </Button>
                    )}
                </div>

                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search roles…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-9 rounded-xl h-10"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="border-border">
                                <CardHeader className="pb-3 pt-5 px-5">
                                    <Skeleton className="h-5 w-32" />
                                </CardHeader>
                                <CardContent className="px-5 pb-5 space-y-3">
                                    <Skeleton className="h-4 w-20" />
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="h-5 w-16" />)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
                        <AlertCircle className="size-8" />
                        <p className="font-bold text-sm">Failed to load roles. Check that the backend server is running.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {filtered.map((role, i) => {
                                const sc = SCOPE_COLORS[role.dataScope] || '#767A8C'
                                const scopeLabel = DATA_SCOPES.find(s => s.value === role.dataScope)?.label || role.dataScope
                                return (
                                    <motion.div
                                        key={role._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.04 }}
                                    >
                                        <Card className={cn(
                                            'border-border bg-card hover:shadow-md transition-all relative overflow-hidden group',
                                            !role.isActive && 'opacity-50'
                                        )}>
                                            {/* Accent top bar */}
                                            <div
                                                className="absolute top-0 left-0 right-0 h-0.5"
                                                style={{ background: `linear-gradient(90deg, transparent, ${sc}, transparent)` }}
                                            />

                                            <CardHeader className="pb-3 pt-5 px-5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                        <CardTitle className="text-base font-black tracking-tight truncate">
                                                            {role.name}
                                                        </CardTitle>
                                                        {role.isSystem ? (
                                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0 bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                                <Lock className="size-2.5 mr-0.5" />
                                                                System
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0">
                                                                Custom
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {!role.isSystem && (canEdit || canDelete) && (
                                                        <div className="shrink-0 flex items-center">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                                                        <MoreVertical className="size-4 text-muted-foreground" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5">
                                                                    {canEdit && (
                                                                        <DropdownMenuItem onClick={() => { setEditTarget(role); setDrawerOpen(true) }} className="rounded-lg gap-2 cursor-pointer">
                                                                            <Edit2 className="size-3.5" />
                                                                            <span>Edit Role</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {canEdit && canDelete && <DropdownMenuSeparator />}
                                                                    {canDelete && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => setDeleteTarget(role)}
                                                                            className="rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                            <span>Delete Role</span>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>

                                            <CardContent className="px-5 pb-5 space-y-3">
                                                {/* Scope chip */}
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visibility:</span>
                                                    <span
                                                        className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                                        style={{ color: sc, backgroundColor: `${sc}12`, borderColor: `${sc}30` }}
                                                    >
                                                        {scopeLabel}
                                                    </span>
                                                </div>

                                                {/* Permissions preview */}
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                                        {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                                    </p>
                                                    {role.permissions.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground/50 italic">No permissions assigned</p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1">
                                                            {role.permissions.slice(0, 8).map(p => (
                                                                <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-foreground/70 border border-border/60">
                                                                    {p}
                                                                </span>
                                                            ))}
                                                            {role.permissions.length > 8 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20">
                                                                    +{role.permissions.length - 8} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>

                        {filtered.length === 0 && !isLoading && (
                            <div className="col-span-full flex flex-col items-center justify-center h-40 border-2 border-dashed border-muted rounded-2xl gap-3">
                                <ShieldCheck className="size-8 text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground font-medium">
                                    {search ? `No roles matching "${search}"` : 'No roles found'}
                                </p>
                                {!search && (
                                    <Button variant="outline" onClick={() => setDrawerOpen(true)} className="rounded-xl text-xs">
                                        + Create First Role
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Role Drawer */}
                <RoleDrawer
                    open={drawerOpen}
                    onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
                    editRole={editTarget}
                    onSuccess={showToast}
                />

                {/* Delete confirmation */}
                <ConfirmationDialog
                    open={!!deleteTarget}
                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                    title="Delete Role"
                    description={deleteTarget ? `Delete the "${deleteTarget.name}" role? Users assigned this role will lose their permissions. This action cannot be undone.` : ''}
                    onConfirm={async () => {
                        if (deleteTarget) await deleteMut.mutateAsync(deleteTarget._id)
                    }}
                    confirmText="Delete Role"
                    variant="destructive"
                    isPending={deleteMut.isPending}
                />

                {/* Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className={cn(
                                'fixed bottom-6 right-6 z-50 border shadow-xl rounded-2xl px-5 py-3 flex items-center gap-2',
                                toast.type === 'error'
                                    ? 'bg-red-500/10 border-red-500/20'
                                    : 'bg-card border-border'
                            )}
                        >
                            {toast.type === 'error'
                                ? <AlertCircle className="size-4 text-red-500" />
                                : <CheckCircle2 className="size-4 text-emerald-500" />
                            }
                            <span className="text-sm font-bold text-foreground">{toast.msg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TooltipProvider>
    )
}
