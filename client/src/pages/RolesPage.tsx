import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    ShieldCheck, Plus, Trash2, Edit2, X, Loader2,
    CheckCircle2, AlertCircle, Database, Globe, User
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'

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
        perms: ['jobcard.view', 'jobcard.create', 'jobcard.update', 'jobcard.delete', 'jobcard.stage.advance'],
    },
    {
        group: 'Clients',
        prefix: 'client',
        perms: ['client.view', 'client.create', 'client.update', 'client.delete'],
    },
    {
        group: 'Quotations',
        prefix: 'quotation',
        perms: ['quotation.view', 'quotation.create', 'quotation.approve', 'quotation.delete'],
    },
    {
        group: 'Invoices',
        prefix: 'invoice',
        perms: ['invoice.view', 'invoice.create', 'invoice.send', 'invoice.delete'],
    },
    {
        group: 'Inventory',
        prefix: 'inventory',
        perms: ['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete'],
    },
    {
        group: 'Purchase Orders',
        prefix: 'purchaseorder',
        perms: ['purchaseorder.view', 'purchaseorder.create', 'purchaseorder.approve'],
    },
    {
        group: 'Projects',
        prefix: 'project',
        perms: ['project.view', 'project.create', 'project.update'],
    },
    {
        group: 'Reports',
        prefix: 'report',
        perms: ['report.view', 'report.export'],
    },
    {
        group: 'Users & Roles',
        prefix: 'user',
        perms: ['user.view', 'user.create', 'user.update', 'user.delete', 'role.manage'],
    },
]

const DATA_SCOPES = [
    { value: 'own', label: 'Own Data Only', icon: User, desc: 'Can only see records they created or assigned to' },
    { value: 'department', label: 'Department Data', icon: Database, desc: 'Can see all records within their department' },
    { value: 'all', label: 'All Company Data', icon: Globe, desc: 'Full visibility across the entire company' },
]

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchRoles = async (): Promise<AppRole[]> => {
    const { data } = await api.get('/privileges')
    return data.data
}

const createRole = async (body: { name: string; permissions: string[]; dataScope: string }) => {
    const { data } = await api.post('/privileges', body)
    return data.data
}

const updateRole = async ({ id, body }: { id: string; body: Partial<AppRole> }) => {
    const { data } = await api.put(`/privileges/${id}`, body)
    return data.data
}

const deleteRole = async (id: string) => {
    const { data } = await api.delete(`/privileges/${id}`)
    return data
}

// ── Role editor drawer ─────────────────────────────────────────────────────────
function RoleDrawer({ open, onClose, editRole }: {
    open: boolean; onClose: () => void; editRole: AppRole | null
}) {
    const qc = useQueryClient()
    const [name, setName] = useState(editRole?.name || '')
    const [dataScope, setDataScope] = useState<'own' | 'department' | 'all'>(editRole?.dataScope || 'own')
    const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
        new Set(editRole?.permissions || [])
    )
    const [error, setError] = useState('')

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

    const createMut = useMutation({
        mutationFn: createRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to create role'),
    })
    const updateMut = useMutation({
        mutationFn: updateRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); onClose() },
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

    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
                    <motion.aside
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative z-10 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-black text-lg text-foreground tracking-tight">
                                    {editRole ? 'Edit Role' : 'New Custom Role'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedPerms.size} permissions selected
                                </p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose} className="rounded-xl"><X className="size-4" /></Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {error && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role Name *</Label>
                                    <Input placeholder="e.g. Senior Designer" value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-11" />
                                </div>

                                {/* Data Scope */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Visibility</Label>
                                    <div className="space-y-2">
                                        {DATA_SCOPES.map(({ value, label, icon: Icon, desc }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setDataScope(value as 'own' | 'department' | 'all')}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                                    dataScope === value
                                                        ? 'border-primary/40 bg-primary/5 text-foreground'
                                                        : 'border-border hover:border-muted-foreground/30'
                                                )}
                                            >
                                                <div className={cn('p-1.5 rounded-lg', dataScope === value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                                                    <Icon className="size-3.5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">{label}</p>
                                                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Permissions */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permissions</Label>
                                    {PERMISSION_GROUPS.map(({ group, perms }) => {
                                        const allSelected = perms.every(p => selectedPerms.has(p))
                                        return (
                                            <div key={group} className="border border-border rounded-xl overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleGroup(perms)}
                                                    className={cn(
                                                        'w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors',
                                                        allSelected ? 'bg-primary/10 text-primary' : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                                                    )}
                                                >
                                                    <span>{group}</span>
                                                    <span className="text-[10px] font-semibold">
                                                        {perms.filter(p => selectedPerms.has(p)).length}/{perms.length}
                                                    </span>
                                                </button>
                                                <div className="grid grid-cols-2 gap-1 p-2">
                                                    {perms.map(perm => {
                                                        const action = perm.split('.').slice(1).join('.')
                                                        const isOn = selectedPerms.has(perm)
                                                        return (
                                                            <button
                                                                key={perm}
                                                                type="button"
                                                                onClick={() => togglePerm(perm)}
                                                                className={cn(
                                                                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold capitalize transition-all',
                                                                    isOn
                                                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                                                        : 'bg-background text-muted-foreground border border-border hover:border-muted-foreground/30'
                                                                )}
                                                            >
                                                                <div className={cn('size-2 rounded-full', isOn ? 'bg-primary' : 'bg-muted-foreground/30')} />
                                                                {action.replace('.', ' ')}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="border-t border-border px-6 py-4 flex gap-3">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Cancel</Button>
                            <Button onClick={handleSave} disabled={isPending} className="flex-1 rounded-xl h-11 font-bold">
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
    const qc = useQueryClient()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<AppRole | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const { data: roles = [], isLoading, error: loadError } = useQuery<AppRole[]>({
        queryKey: ['roles'],
        queryFn: fetchRoles,
    })

    const deleteMut = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); showToast('Role deleted') },
        onError: (e: any) => showToast(e.response?.data?.message || 'Cannot delete system role'),
    })

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    const scopeColor = { own: '#F59E0B', department: '#8B5CF6', all: '#10B981' }

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10">
                            <ShieldCheck className="size-6 text-purple-500" />
                        </div>
                        Roles & Permissions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {roles.length} role{roles.length !== 1 ? 's' : ''} •{' '}
                        {roles.filter(r => r.isSystem).length} system • {roles.filter(r => !r.isSystem).length} custom
                    </p>
                </div>
                <Button onClick={() => { setEditTarget(null); setDrawerOpen(true) }} className="rounded-xl h-11 px-6 font-bold gap-2">
                    <Plus className="size-4" /> New Role
                </Button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="size-6 animate-spin text-primary" />
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
                    <AlertCircle className="size-8" />
                    <p className="font-bold text-sm">Failed to load roles. Make sure the backend server is running.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {roles.map((role, i) => {
                        const sc = scopeColor[role.dataScope] || '#767A8C'
                        return (
                            <motion.div
                                key={role._id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className={cn('border-border bg-card hover:shadow-md transition-shadow relative overflow-hidden', !role.isActive && 'opacity-60')}>
                                    {/* accent top bar */}
                                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${sc}, transparent)` }} />

                                    <CardHeader className="pb-3 pt-5 px-5">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                                                {role.name}
                                                {role.isSystem && (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">System</span>
                                                )}
                                            </CardTitle>
                                            {!role.isSystem && (
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => { setEditTarget(role); setDrawerOpen(true) }} className="size-8 rounded-lg text-muted-foreground hover:text-foreground">
                                                        <Edit2 className="size-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(role._id)} className="size-8 rounded-lg text-muted-foreground hover:text-red-500">
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="px-5 pb-5 space-y-3">
                                        {/* Scope chip */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scope:</span>
                                            <span
                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border"
                                                style={{ color: sc, backgroundColor: `${sc}15`, borderColor: `${sc}30` }}
                                            >
                                                {role.dataScope}
                                            </span>
                                        </div>

                                        {/* Permissions preview */}
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                                                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                            </p>
                                            {role.permissions.length === 0 ? (
                                                <p className="text-xs text-muted-foreground/50 italic">No permissions assigned</p>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions.slice(0, 6).map(p => (
                                                        <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border">
                                                            {p}
                                                        </span>
                                                    ))}
                                                    {role.permissions.length > 6 && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground">
                                                            +{role.permissions.length - 6} more
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

                    {roles.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center h-40 border-2 border-dashed border-muted rounded-2xl gap-3">
                            <ShieldCheck className="size-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground font-medium">No roles found</p>
                            <Button variant="outline" onClick={() => setDrawerOpen(true)} className="rounded-xl text-xs">+ Create First Role</Button>
                        </div>
                    )}
                </div>
            )}

            {/* Drawer */}
            <RoleDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} editRole={editTarget} />

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-6 right-6 z-50 bg-card border border-border shadow-xl rounded-2xl px-5 py-3 flex items-center gap-2"
                    >
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span className="text-sm font-bold text-foreground">{toast}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
