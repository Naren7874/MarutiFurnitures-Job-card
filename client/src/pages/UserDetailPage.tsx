import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
    ArrowLeft, User, ShieldCheck, ShieldX, ShieldAlert, Shield,
    Clock, Trash2, Plus, Loader2, CheckCircle2, AlertCircle,
    Key, UserX, UserCheck, History, Mail, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = string

interface AppUser {
    _id: string; name: string; email: string; role: UserRole
    department?: string; phone?: string; isActive: boolean; lastLogin?: string; isSuperAdmin?: boolean
}

interface Override {
    _id: string; permission: string; type: 'grant' | 'deny'
    reason?: string; expiresAt?: string; grantedBy?: { name: string }; grantedAt: string
}


interface UserPermData {
    user: AppUser
    permissions: {
        roleId?: { name: string; permissions: string[] }
        overrides?: Override[]
        effectivePermissions?: string[]
    } | null
}

interface AuditEntry {
    _id: string; action: string; actorName: string; actorRole: string
    changes?: Record<string, { from: unknown; to: unknown }>
    metadata?: Record<string, unknown>; ip?: string; createdAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Dynamic roles are fetched from the API — system + custom
interface AppRole {
    _id: string; name: string; isSystem: boolean
    permissions: string[]; dataScope: string; isActive: boolean
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
    { value: 'super_admin', label: 'Super Admin', color: '#EF4444' },
    { value: 'sales', label: 'Sales', color: '#8B5CF6' },
    { value: 'design', label: 'Design', color: '#6366F1' },
    { value: 'store', label: 'Store', color: '#F59E0B' },
    { value: 'production', label: 'Production', color: '#1315E5' },
    { value: 'qc', label: 'Quality Control', color: '#10B981' },
    { value: 'dispatch', label: 'Dispatch', color: '#F97316' },
    { value: 'accountant', label: 'Accountant', color: '#EC4899' },
    { value: 'client', label: 'Client', color: '#64748B' },
]

// SRS §5.3 — full permission list grouped by module
const ALL_PERMISSIONS = [
    'client.create', 'client.view', 'client.edit', 'client.delete', 'client.verify_gst',
    'quotation.create', 'quotation.view', 'quotation.edit', 'quotation.send', 'quotation.approve', 'quotation.reject',
    'project.create', 'project.view', 'project.edit',
    'jobcard.create', 'jobcard.view', 'jobcard.edit', 'jobcard.export', 'jobcard.close', 'jobcard.assign', 'jobcard.override_status',
    'designrequest.create', 'designrequest.view', 'designrequest.edit', 'designrequest.upload', 'designrequest.signoff', 'designrequest.ready',
    'storeStage.view', 'storeStage.edit', 'storeStage.issue',
    'productionStage.view', 'productionStage.edit',
    'qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail',
    'dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver',
    'invoice.create', 'invoice.view', 'invoice.edit', 'invoice.send', 'invoice.payment',
    'inventory.create', 'inventory.view', 'inventory.edit',
    'purchaseOrder.create', 'purchaseOrder.view', 'purchaseOrder.edit', 'purchaseOrder.approve',
    'reports.view_financial', 'reports.view_production', 'reports.view_delivery', 'reports.export',
    'user.create', 'user.view', 'user.edit', 'user.deactivate',
    'privilege.view', 'privilege.grant', 'privilege.deny',
    'whatsapp.send_manual', 'gst.verify',
    'settings.view', 'settings.edit', 'settings.company_edit',
    'audit_log.view', 'audit_log.export',
]

const ACTION_COLORS: Record<string, string> = {
    create: '#10B981', update: '#6366F1', delete: '#EF4444',
    login: '#8B5CF6', logout: '#64748B', role_change: '#F59E0B',
    permission_grant: '#10B981', permission_deny: '#EF4444',
    deactivate: '#EF4444', activate: '#10B981',
    password_reset: '#F97316',
}

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchUser = (id: string) => api.get(`/users/${id}`).then(r => r.data.data)
const fetchPerms = (id: string) => api.get(`/privileges/users/${id}`).then(r => r.data.data)
const fetchHistory = (id: string) => api.get(`/privileges/users/${id}/history`).then(r => r.data.data)
const fetchAllRoles = () => api.get('/privileges/roles').then(r => r.data.data as AppRole[])

// Helper to pick a color per role (system roles get fixed colors, custom roles use a default)
const SYSTEM_ROLE_COLORS: Record<string, string> = {
    super_admin: '#EF4444', sales: '#8B5CF6', design: '#6366F1',
    store: '#F59E0B', production: '#1315E5', qc: '#10B981',
    dispatch: '#F97316', accountant: '#EC4899', client: '#64748B',
}
function getRoleColor(name: string) { return SYSTEM_ROLE_COLORS[name] || '#767A8C' }

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
    const color = getRoleColor(role)
    return (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
            style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}>
            {role}
        </span>
    )
}

// ── Effective Permissions Grid ────────────────────────────────────────────────
function PermissionsGrid({ perms }: { perms: UserPermData['permissions'] | undefined }) {
    const effective = new Set(perms?.effectivePermissions || [])
    const rolePerms = new Set(perms?.roleId?.permissions || [])
    const grants = new Set((perms?.overrides || []).filter(o => o.type === 'grant').map(o => o.permission))
    const denies = new Set((perms?.overrides || []).filter(o => o.type === 'deny').map(o => o.permission))

    const getSource = (p: string): 'role' | 'set' | 'grant' | 'none' => {
        if (grants.has(p)) return 'grant'
        if (rolePerms.has(p)) return 'role'
        return 'none'
    }

    // Group by module
    const modules: Record<string, string[]> = {}
    ALL_PERMISSIONS.forEach(p => {
        const mod = p.split('.')[0]
        if (!modules[mod]) modules[mod] = []
        modules[mod].push(p)
    })

    return (
        <div className="space-y-4">
            {Object.entries(modules).map(([mod, ps]) => (
                <div key={mod}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{mod}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ps.map(p => {
                            const action = p.split('.')[1]
                            const has = effective.has(p)
                            const denied = denies.has(p)
                            const source = has ? getSource(p) : 'none'
                            const sourceColor = source === 'grant' ? '#10B981' : source === 'role' ? '#64748B' : 'transparent'
                            return (
                                <span key={p} title={`source: ${source}`}
                                    className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border transition-all',
                                        has ? 'bg-card text-foreground border-border' : 'bg-muted/30 text-muted-foreground/40 border-transparent',
                                        denied && 'line-through decoration-red-500/50 opacity-40')}>
                                    <div className="size-1.5 rounded-full" style={{ backgroundColor: has ? sourceColor : 'transparent' }} />
                                    {action.replace(/_/g, ' ')}
                                </span>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Overrides Tab ─────────────────────────────────────────────────────────────
function OverridesTab({ userId, overrides }: { userId: string, overrides: Override[] }) {
    const qc = useQueryClient()
    const [perm, setPerm] = useState('')
    const [type, setType] = useState<'grant' | 'deny'>('grant')
    const [reason, setReason] = useState('')
    const [toast, setToast] = useState<string | null>(null)

    const grantMut = useMutation({
        mutationFn: (data: { permission: string; reason: string }) =>
            api.post(`/privileges/users/${userId}/grant`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-perms', userId] }); setPerm(''); setReason(''); setToast('Override added') },
        onError: () => setToast('Failed to add override')
    })

    const denyMut = useMutation({
        mutationFn: (data: { permission: string; reason: string }) =>
            api.post(`/privileges/users/${userId}/deny`, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-perms', userId] }); setPerm(''); setReason(''); setToast('Override added') },
        onError: () => setToast('Failed to add override')
    })

    const delMut = useMutation({
        mutationFn: (oid: string) => api.delete(`/privileges/users/${userId}/override/${oid}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user-perms', userId] }); setToast('Override removed') }
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                        <button onClick={() => setType('grant')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', type === 'grant' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-card border-border')}>Grant</button>
                        <button onClick={() => setType('deny')} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border transition-all', type === 'deny' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-card border-border')}>Deny</button>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Permission</label>
                        <SearchableSelect options={ALL_PERMISSIONS.map(p => ({ label: p, value: p }))} value={perm} onChange={setPerm} placeholder="Choose permission..." />
                    </div>
                    <Input placeholder="Reason (optional)..." value={reason} onChange={e => setReason(e.target.value)} className="bg-card border-border h-10 rounded-xl" />
                </div>
                <div className="w-full md:w-32 flex items-end">
                    <Button
                        onClick={() => {
                            if (!perm) return
                            if (type === 'grant') grantMut.mutate({ permission: perm, reason })
                            else denyMut.mutate({ permission: perm, reason })
                        }}
                        disabled={!perm || grantMut.isPending || denyMut.isPending}
                        className="w-full h-10 rounded-xl font-bold"
                    >
                        {(grantMut.isPending || denyMut.isPending) ? <Loader2 className="size-4 animate-spin" /> : type === 'grant' ? <Plus className="size-4 mr-2" /> : <ShieldX className="size-4 mr-2" />}
                        Add
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {overrides.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground italic">No manual overrides for this user.</p> : overrides.map(o => (
                    <div key={o._id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border group">
                        <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", o.type === 'grant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                                {o.type === 'grant' ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-foreground uppercase tracking-tight">{o.permission}</p>
                                <p className="text-[10px] text-muted-foreground italic">By {o.grantedBy?.name || 'Admin'} · {new Date(o.grantedAt).toLocaleDateString()} {o.reason && `· "${o.reason}"`}</p>
                            </div>
                        </div>
                        <Button onClick={() => delMut.mutate(o._id)} variant="ghost" size="icon" className="size-8 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500">
                            <Trash2 className="size-3.5" />
                        </Button>
                    </div>
                ))}
            </div>
            <AnimatePresence>{toast && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold shadow-xl z-50"> {toast} </motion.div>}</AnimatePresence>
        </div>
    )
}

// ── Main Page Component ───────────────────────────────────────────────────────

export default function UserDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const qc = useQueryClient()
    const [toast, setToast] = useState<string | null>(null)
    const [newRole, setNewRole] = useState<UserRole | ''>('')
    const [activeTab, setActiveTab] = useState<'perms' | 'overrides' | 'sets' | 'history'>('perms')
    const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'change_role' | null }>({ type: null })

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500) }

    const { data: user, isLoading: loadingUser } = useQuery<AppUser>({
        queryKey: ['user', id],
        queryFn: () => fetchUser(id!)
    })

    const { data: permsData, isLoading: loadingPerms } = useQuery<UserPermData>({
        queryKey: ['user-perms', id],
        queryFn: () => fetchPerms(id!)
    })

    const { data: history } = useQuery<AuditEntry[]>({ queryKey: ['user-history', id], queryFn: () => fetchHistory(id!) })

    // Fetch ALL roles (system + custom) for the Change Role section
    const { data: allRoles = [] } = useQuery<AppRole[]>({ queryKey: ['roles'], queryFn: fetchAllRoles })

    const deactivateMut = useMutation({
        mutationFn: () => api.patch(`/users/${id}/deactivate`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', id] }); showToast('User deactivated') }
    })

    const activateMut = useMutation({
        mutationFn: () => api.patch(`/users/${id}/activate`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', id] }); showToast('User activated') }
    })

    const changeRoleMut = useMutation({
        mutationFn: () => api.patch(`/users/${id}/role`, { role: newRole }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', id], }); qc.invalidateQueries({ queryKey: ['user-perms', id] }); showToast('Role updated') }
    })


    if (loadingUser || loadingPerms) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground"><Loader2 className="size-8 animate-spin" /><p className="text-sm font-bold uppercase tracking-widest">Loading permissions...</p></div>

    if (!user) return <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-red-500"><AlertCircle className="size-8" /><p className="text-sm font-bold">User not found</p><Button onClick={() => navigate('/users')}>Go Back</Button></div>

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group">
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" /> BACK TO USERS
            </button>

            <Card className="border-border bg-card shadow-xl rounded-3xl overflow-hidden relative">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* Avatar */}
                        <div className="size-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                            <User className="size-8" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h1 className="text-xl font-black text-foreground">{user.name}</h1>
                                <RoleBadge role={user.role} />
                                <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider',
                                    user.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500')}>
                                    <span className={cn('size-1.5 rounded-full', user.isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                                    {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5 text-blue-400/80"><Mail className="size-3" /> {user.email}</span>
                                {user.phone && <span className="flex items-center gap-1.5"><Phone className="size-3" /> {user.phone}</span>}
                                {user.lastLogin && (
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="size-3" /> Last login {new Date(user.lastLogin).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Deactivate / Activate button */}
                        {!user.isSuperAdmin && (
                            <div className="shrink-0">
                                {user.isActive ? (
                                    <Button variant="outline" size="sm"
                                        onClick={() => setConfirmAction({ type: 'deactivate' })}
                                        disabled={deactivateMut.isPending}
                                        className="rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/10">
                                        {deactivateMut.isPending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <UserX className="size-3.5 mr-1.5" />}
                                        Deactivate
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm"
                                        onClick={() => activateMut.mutate()}
                                        disabled={activateMut.isPending}
                                        className="rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                                        {activateMut.isPending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <UserCheck className="size-3.5 mr-1.5" />}
                                        Activate
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Role Change section ─────────────────────────────────────────── */}
                    {!user.isSuperAdmin && (
                        <div className="mt-5 pt-5 border-t border-border">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <Key className="size-3.5" /> Change Role
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {/* Bug 4 fix: show ALL roles (system + custom) fetched from the API */}
                                {allRoles
                                    .filter(r => r.name !== 'super_admin' && r.isActive)
                                    .map(r => {
                                        const color = getRoleColor(r.name)
                                        const isCurrent = user.role === r.name
                                        const isSelected = newRole === r.name
                                        return (
                                            <button key={r._id} type="button"
                                                onClick={() => setNewRole(r.name as UserRole)}
                                                className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                                                    isSelected ? 'bg-primary/10 border-primary/50 text-foreground' : 'bg-muted/30 border-border hover:border-muted-foreground/40',
                                                    isCurrent ? 'opacity-50 cursor-not-allowed bg-muted/10' : '')}
                                                style={isSelected ? { borderColor: `${color}50`, color } : {}}
                                                disabled={isCurrent}>
                                                {r.name}
                                                {!r.isSystem && <span className="ml-1 text-[9px] opacity-50">(custom)</span>}
                                                {isCurrent && ' ✓'}
                                            </button>
                                        )
                                    })
                                }
                                <Button onClick={() => setConfirmAction({ type: 'change_role' })}
                                    disabled={!newRole || changeRoleMut.isPending}
                                    className="rounded-lg h-8 px-4 text-xs font-bold ml-auto md:ml-2">
                                    {changeRoleMut.isPending ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <ShieldCheck className="size-3 mr-1.5" />}
                                    Apply Change
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
            <div className="flex gap-4 border-b border-border overflow-x-auto no-scrollbar">
                {[
                    { key: 'perms', label: 'Permissions', icon: Shield },
                    { key: 'overrides', label: 'Manual Overrides', icon: ShieldAlert },
                    { key: 'history', label: 'Audit Log', icon: History }
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        className={cn('flex items-center gap-2 px-1 py-3 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap',
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground')}>
                        <tab.icon className="size-3.5" /> {tab.label.toUpperCase()}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'perms' && (
                    <motion.div key="perms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="border-border bg-card/50 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-tighter">
                                    <Shield className="size-4 text-primary" /> Effective Permissions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <PermissionsGrid perms={permsData?.permissions || undefined} />
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {activeTab === 'overrides' && (
                    <motion.div key="overrides" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="border-border bg-card/50 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-tighter">
                                    <ShieldAlert className="size-4 text-amber-500" /> Individual Overrides
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <OverridesTab userId={id!} overrides={permsData?.permissions?.overrides || []} />
                            </CardContent>
                        </Card>
                    </motion.div>
                )}


                {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="border-border bg-card/50 backdrop-blur-sm rounded-2xl">
                            <CardHeader className="pb-3 border-b border-border/50">
                                <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-tighter">
                                    <History className="size-4 text-pink-500" /> Security Audit Log
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {history?.length === 0 ? <p className="text-center py-8 text-xs text-muted-foreground">No recent security events.</p> : history?.map(entry => (
                                        <div key={entry._id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-muted/10">
                                            <div className="size-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0" style={{ borderLeft: `3px solid ${ACTION_COLORS[entry.action] || '#64748B'}` }}>
                                                <Shield className="size-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground uppercase tracking-wider">{entry.action.replace(/_/g, ' ')}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">By {entry.actorName} ({entry.actorRole}) · {new Date(entry.createdAt).toLocaleString()}</p>
                                                {entry.changes && <div className="mt-2 p-2 rounded-lg bg-card/50 border border-border/50 text-[10px] font-mono space-y-1">
                                                    {Object.entries(entry.changes).map(([k, v]) => <div key={k}>{k}: {String(v.from)} → {String(v.to)}</div>)}
                                                </div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog
                open={confirmAction.type === 'deactivate'}
                onOpenChange={(open) => !open && setConfirmAction({ type: null })}
                title="Deactivate User"
                description={`Are you sure you want to deactivate ${user.name}? This will log them out immediately and prevent further access.`}
                onConfirm={async () => {
                    await deactivateMut.mutateAsync()
                    setConfirmAction({ type: null })
                }}
                confirmText="Deactivate"
                variant="destructive"
                isPending={deactivateMut.isPending}
            />

            <ConfirmationDialog
                open={confirmAction.type === 'change_role'}
                onOpenChange={(open) => !open && setConfirmAction({ type: null })}
                title="Change Role"
                description={`Update ${user.name}'s role to "${newRole}"? This will update their base permissions immediately.`}
                onConfirm={async () => {
                    await changeRoleMut.mutateAsync()
                    setConfirmAction({ type: null })
                }}
                confirmText="Change Role"
                variant="warning"
                isPending={changeRoleMut.isPending}
            />

            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed bottom-10 right-10 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-2xl z-50 flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
