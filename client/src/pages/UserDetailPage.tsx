import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft, User, ShieldCheck, ShieldX, ShieldAlert, Shield,
    Trash2, Loader2,
    History, Mail, Phone, Plus, Ban
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

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

const ALL_PERMISSIONS: Record<string, string[]> = {
    client:          ['client.create', 'client.view', 'client.edit', 'client.delete', 'client.verify_gst'],
    quotation:       ['quotation.create', 'quotation.view', 'quotation.edit', 'quotation.send', 'quotation.approve', 'quotation.reject', 'quotation.delete'],
    project:         ['project.create', 'project.view', 'project.edit'],
    jobcard:         ['jobcard.create', 'jobcard.view', 'jobcard.edit', 'jobcard.export', 'jobcard.close', 'jobcard.assign', 'jobcard.override_status'],
    designrequest:   ['designrequest.create', 'designrequest.view', 'designrequest.edit', 'designrequest.upload', 'designrequest.signoff', 'designrequest.ready'],
    storeStage:      ['storeStage.view', 'storeStage.edit', 'storeStage.issue'],
    productionStage: ['productionStage.view', 'productionStage.edit'],
    qcStage:         ['qcStage.view', 'qcStage.edit', 'qcStage.pass', 'qcStage.fail'],
    dispatchStage:   ['dispatchStage.view', 'dispatchStage.edit', 'dispatchStage.deliver'],
    invoice:         ['invoice.create', 'invoice.view', 'invoice.edit', 'invoice.send', 'invoice.payment'],
    inventory:       ['inventory.create', 'inventory.view', 'inventory.edit'],
    purchaseOrder:   ['purchaseOrder.create', 'purchaseOrder.view', 'purchaseOrder.edit', 'purchaseOrder.approve'],
    reports:         ['reports.view_financial', 'reports.view_production', 'reports.view_delivery', 'reports.export'],
    user:            ['user.create', 'user.view', 'user.edit', 'user.deactivate', 'user.delete'],
    privilege:       ['privilege.view', 'privilege.grant', 'privilege.deny'],
    settings:        ['settings.view', 'settings.edit', 'settings.company_edit'],
    audit_log:       ['audit_log.view', 'audit_log.export'],
    misc:            ['whatsapp.send_manual', 'gst.verify'],
}

const SYSTEM_ROLE_COLORS: Record<string, string> = {
    super_admin: '#EF4444', sales: '#8B5CF6', design: '#6366F1',
    store: '#F59E0B', production: '#1315E5', qc: '#10B981',
    dispatch: '#8ffb03', accountant: '#EC4899', client: '#64748B',
}
function getRoleColor(name: string) { return SYSTEM_ROLE_COLORS[name] || '#767A8C' }

// ── Components ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const color = getRoleColor(role)
    return (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
            style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}>
            {role}
        </span>
    )
}

function PillActionPopup({
    perm, isDenyOverride, isGrantOverride,
    canGrant, canDeny, onAction, onClose,
}: {
    perm: string;
    isDenyOverride: boolean;
    isGrantOverride: boolean;
    canGrant: boolean;
    canDeny: boolean;
    onAction: (action: 'grant' | 'deny' | 'remove') => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    return (
        <motion.div ref={ref} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute z-50 bottom-full left-0 mb-2 bg-card border border-border shadow-2xl rounded-xl p-2 min-w-[160px]">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5 border-b border-border mb-1.5">{perm}</p>
            {(isDenyOverride || isGrantOverride) && (
                <button onClick={() => onAction('remove')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-muted/40 transition-colors"><Trash2 className="size-3" /> Remove override</button>
            )}
            {canGrant && !isGrantOverride && (
                <button onClick={() => onAction('grant')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors"><Plus className="size-3" /> Grant override</button>
            )}
            {canDeny && !isDenyOverride && (
                <button onClick={() => onAction('deny')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"><Ban className="size-3" /> Deny override</button>
            )}
        </motion.div>
    )
}

function PermissionsGrid({
    userId, perms, canGrant, canDeny, onOverrideChange
}: {
    userId: string; perms: UserPermData['permissions'] | undefined; canGrant: boolean; canDeny: boolean; onOverrideChange: () => void;
}) {
    const [pendingChanges, setPendingChanges] = useState<Record<string, 'grant' | 'deny' | 'remove' | null>>({})
    const [openPopup, setOpenPopup] = useState<string | null>(null)
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMsg({ text, type }); setTimeout(() => setToastMsg(null), 2500)
    }

    const rolePerms = useMemo(() => new Set(perms?.roleId?.permissions || []), [perms?.roleId?.permissions])
    const serverOverrides = perms?.overrides || []
    
    const activeOverrides = useMemo(() => {
        const map = new Map<string, 'grant' | 'deny'>()
        serverOverrides.forEach(o => map.set(o.permission, o.type))
        Object.entries(pendingChanges).forEach(([p, type]) => {
            if (type === 'remove') map.delete(p)
            else if (type) map.set(p, type)
        })
        return map
    }, [serverOverrides, pendingChanges])

    const isBaseRole = (p: string) => rolePerms.has(p) || rolePerms.has('*.*') || rolePerms.has('*')

    const handleAction = async (perm: string, action: 'grant' | 'deny' | 'remove') => {
        setOpenPopup(null); setIsUpdating(perm)
        setPendingChanges(prev => ({ ...prev, [perm]: action }))
        try {
            if (action === 'remove') {
                const existing = serverOverrides.find(o => o.permission === perm)
                if (existing) await api.delete(`/privileges/users/${userId}/override/${existing._id}`)
            } else if (action === 'grant') {
                await api.post(`/privileges/users/${userId}/grant`, { permission: perm })
            } else {
                await api.post(`/privileges/users/${userId}/deny`, { permission: perm })
            }
            showToast('Success'); onOverrideChange()
            setTimeout(() => setPendingChanges(prev => { const n = { ...prev }; delete n[perm]; return n }), 800)
        } catch {
            setPendingChanges(prev => { const n = { ...prev }; delete n[perm]; return n })
            showToast('Failed', 'error')
        } finally { setIsUpdating(null) }
    }

    return (
        <div className="space-y-6">
            {(canGrant || canDeny) && (
                <div className="flex gap-4 p-3 rounded-xl bg-muted/20 border border-border/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Grant</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500" /> Deny</span>
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#6366F1]" /> Role</span>
                </div>
            )}
            {Object.entries(ALL_PERMISSIONS).map(([mod, ps]) => (
                <div key={mod} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{mod}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {ps.map(p => {
                            const type = activeOverrides.get(p)
                            const fromRole = isBaseRole(p)
                            const isPending = isUpdating === p
                            let pillClass = 'bg-muted/10 border-border/10 text-muted-foreground/30'
                            let dotColor = 'transparent'
                            if (type === 'deny') { pillClass = 'bg-red-500/10 border-red-500/30 text-red-500 line-through'; dotColor = '#EF4444' }
                            else if (type === 'grant') { pillClass = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold'; dotColor = '#10B981' }
                            else if (fromRole) { pillClass = 'bg-primary/5 border-primary/20 text-foreground'; dotColor = '#6366F1' }

                            return (
                                <div key={p} className="relative">
                                    <button onClick={() => (canGrant || canDeny) && setOpenPopup(p)} disabled={isPending}
                                        className={cn('inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all', pillClass, (canGrant || canDeny) && 'hover:scale-105 cursor-pointer', isPending && 'opacity-50')}>
                                        {isPending ? <Loader2 className="size-3 animate-spin" /> : <div className="size-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
                                        {p.split('.')[1].replace(/_/g, ' ')}
                                    </button>
                                    <AnimatePresence>
                                        {openPopup === p && (
                                            <PillActionPopup perm={p} isDenyOverride={type === 'deny'} isGrantOverride={type === 'grant'}
                                                canGrant={canGrant} canDeny={canDeny} onAction={(a) => handleAction(p, a)} onClose={() => setOpenPopup(null)} />
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
            <AnimatePresence>{toastMsg && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={cn('fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-black shadow-2xl z-100 border text-white', toastMsg.type === 'success' ? 'bg-emerald-500' : 'bg-red-500')}>
                    {toastMsg.text.toUpperCase()}
                </motion.div>
            )}</AnimatePresence>
        </div>
    )
}

function OverridesTab({ userId, overrides, canGrant, canDeny, onRemove }: { userId: string; overrides: Override[]; canGrant: boolean; canDeny: boolean; onRemove: () => void }) {
    const [removing, setRemoving] = useState<string | null>(null)
    const handleRemove = async (o: Override) => {
        try { setRemoving(o._id); await api.delete(`/privileges/users/${userId}/override/${o._id}`); onRemove() }
        catch { alert('Failed to remove') } finally { setRemoving(null) }
    }
    if (overrides.length === 0) return <div className="py-12 text-center text-xs text-muted-foreground uppercase tracking-widest opacity-40">No active overrides</div>
    return (
        <div className="space-y-3">
            {overrides.map(o => (
                <div key={o._id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border group">
                    <div className="flex items-center gap-4">
                        <div className={cn('p-2 rounded-lg', o.type === 'grant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                            {o.type === 'grant' ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
                        </div>
                        <div>
                            <p className="text-xs font-black text-foreground uppercase">{o.permission}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">By {o.grantedBy?.name || 'Admin'} · {new Date(o.grantedAt).toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                    {(canGrant || canDeny) && (
                        <Button onClick={() => handleRemove(o)} disabled={removing === o._id} variant="ghost" size="icon" className="group-hover:opacity-100 opacity-0 transition-opacity text-red-500 hover:bg-red-500/10">
                            {removing === o._id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </Button>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
    const { id } = useParams(); const navigate = useNavigate(); const qc = useQueryClient(); const { hasPermission } = useAuthStore()
    const [activeTab, setActiveTab] = useState<'perms' | 'overrides' | 'history'>('perms')
    
    const { data: user, isLoading: loadingUser } = useQuery<AppUser>({ queryKey: ['user', id], queryFn: () => api.get(`/users/${id}`).then(r => r.data.data) })
    const { data: permsData, isLoading: loadingPerms } = useQuery<UserPermData>({ queryKey: ['user-perms', id], queryFn: () => api.get(`/privileges/users/${id}`).then(r => r.data.data), staleTime: 0 })
    const { data: history } = useQuery<AuditEntry[]>({ queryKey: ['user-history', id], queryFn: () => api.get(`/privileges/users/${id}/history`).then(r => r.data.data) })

    if (loadingUser || loadingPerms) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>
    if (!user) return <div className="p-12 text-center"><p>User not found</p><Button onClick={() => navigate('/users')}>Back</Button></div>

    const overrides = permsData?.permissions?.overrides || []
    const canGrant = hasPermission('privilege.grant')
    const canDeny = hasPermission('privilege.deny')

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"><ArrowLeft className="size-3" /> Back to users</button>
            <Card className="rounded-3xl shadow-xl border-border bg-card overflow-hidden">
                <CardContent className="p-8 flex items-center gap-6">
                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><User className="size-8" /></div>
                    <div>
                        <div className="flex items-center gap-3 mb-1"><h1 className="text-xl font-black text-foreground">{user.name}</h1><RoleBadge role={user.role} /></div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-4"><span className="flex items-center gap-1.5"><Mail className="size-3" /> {user.email}</span> {user.phone && <span className="flex items-center gap-1.5"><Phone className="size-3" /> {user.phone}</span>}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-6 border-b border-border">
                {[{ id: 'perms', label: 'Permissions', icon: Shield }, { id: 'overrides', label: `Overrides (${overrides.length})`, icon: ShieldAlert }, { id: 'history', label: 'Audit Log', icon: History }].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={cn('flex items-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all', activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                        <t.icon className="size-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'perms' && (
                    <motion.div key="perms" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="rounded-2xl border-border bg-card/50"><CardContent className="p-6"><PermissionsGrid userId={id!} perms={permsData?.permissions || undefined} canGrant={canGrant} canDeny={canDeny} onOverrideChange={() => qc.invalidateQueries({ queryKey: ['user-perms', id] })} /></CardContent></Card>
                    </motion.div>
                )}
                {activeTab === 'overrides' && (
                    <motion.div key="overrides" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <OverridesTab userId={id!} overrides={overrides} canGrant={canGrant} canDeny={canDeny} onRemove={() => qc.invalidateQueries({ queryKey: ['user-perms', id] })} />
                    </motion.div>
                )}
                {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="space-y-3">
                            {history?.map(h => (
                                <div key={h._id} className="p-4 rounded-xl border border-border bg-card/50 flex gap-4">
                                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><History className="size-4 opacity-40" /></div>
                                    <div><p className="text-xs font-black uppercase tracking-tight">{h.action.replace(/_/g, ' ')}</p><p className="text-[10px] text-muted-foreground">By {h.actorName} · {new Date(h.createdAt).toLocaleString('en-GB')}</p></div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
