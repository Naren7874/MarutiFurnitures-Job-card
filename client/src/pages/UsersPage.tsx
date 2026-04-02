import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Users, Plus, Search, Mail, Phone, ShieldCheck,
    KeyRound, UserX, UserCheck, Edit2, X, Eye, EyeOff, Loader2,
    CheckCircle2, AlertCircle, Building2, Filter, MoreVertical, Shield, Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = string

interface AppUser {
    _id: string
    firstName: string
    middleName?: string
    lastName: string
    name: string
    email: string
    role: UserRole
    phone?: string
    whatsappNumber?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
    firmName?: string
    factoryName?: string
    factoryLocation?: string
}

interface UserFormData {
    firstName: string
    middleName: string
    lastName: string
    email: string
    password: string
    role: UserRole | ''
    phone: string
    whatsappNumber: string
    firmName: string
    factoryName: string
    factoryLocation: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_ROLES: Record<string, { label: string; color: string; bg: string }> = {
    'super_admin': { label: 'Super Admin', color: '#EF4444', bg: '#EF444415' },
    'sales': { label: 'Sales', color: '#8B5CF6', bg: '#8B5CF615' },
    'design': { label: 'Design', color: '#6366F1', bg: '#6366F115' },
    'store': { label: 'Store', color: '#F59E0B', bg: '#F59E0B15' },
    'production': { label: 'Production', color: '#1315E5', bg: '#1315E515' },
    'qc': { label: 'Quality Control', color: '#10B981', bg: '#10B98115' },
    'dispatch': { label: 'Dispatch', color: '#8ffb03', bg: '#8ffb0315' },
    'accountant': { label: 'Accountant', color: '#EC4899', bg: '#EC489915' },
    'architect': { label: 'Architecture', color: '#06B6D4', bg: '#06B6D415' },
    'Architecture': { label: 'Architecture', color: '#06B6D4', bg: '#06B6D415' },
    'project_designer': { label: 'Project Designer', color: '#F97316', bg: '#F9731615' },
    'Project Designer': { label: 'Project Designer', color: '#F97316', bg: '#F9731615' },
    'factory_manager': { label: 'Factory Manager', color: '#64748B', bg: '#64748B15' },
    'Factory Manager': { label: 'Factory Manager', color: '#64748B', bg: '#64748B15' },
}
const getRoleCfg = (role: string) => SYSTEM_ROLES[role] || { label: role, color: '#64748B', bg: '#64748B15' };

const IS_ARCHITECT = (role: string | undefined) => ['architect', 'Architecture', 'Project Designer', 'project_designer'].some(r => r.toLowerCase() === role?.toLowerCase());
const IS_FACTORY_MGR = (role: string | undefined) => ['factory_manager', 'Factory Manager'].some(r => r.toLowerCase() === role?.toLowerCase());




const EMPTY_FORM: UserFormData = {
    firstName: '', middleName: '', lastName: '', email: '', password: '', role: '', phone: '', whatsappNumber: '',
    firmName: '', factoryName: '', factoryLocation: ''
}

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchUsers = async (): Promise<AppUser[]> => {
    const { data } = await api.get('/users')
    return data.data
}

const createUser = async (body: UserFormData) => {
    const { data } = await api.post('/users', body)
    return data.data
}

const updateUser = async ({ id, body }: { id: string; body: Partial<AppUser> }) => {
    const { data } = await api.put(`/users/${id}`, body)
    return data.data
}

const deactivateUser = async (id: string) => {
    const { data } = await api.patch(`/users/${id}/deactivate`)
    return data
}

const resetPassword = async ({ id, newPassword }: { id: string; newPassword: string }) => {
    const { data } = await api.post(`/users/${id}/reset-password`, { newPassword })
    return data
}

const deleteUser = async (id: string) => {
    const { data } = await api.delete(`/users/${id}`)
    return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function timeAgo(dateStr?: string) {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
    const cfg = getRoleCfg(role)
    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-widest border"
            style={{ color: cfg.color, borderColor: `${cfg.color}40`, backgroundColor: cfg.bg }}
        >
            {cfg.label}
        </span>
    )
}

// ── User drawer / modal ───────────────────────────────────────────────────────
function UserDrawer({
    open, onClose, editUser, onSuccess, roles = []
}: {
    open: boolean
    onClose: () => void
    editUser: AppUser | null
    onSuccess: (msg: string) => void
    roles: any[]
}) {
    const qc = useQueryClient()
    const [form, setForm] = useState<UserFormData>(EMPTY_FORM)
    const [error, setError] = useState('')

    // Pre-fill when editing — re-runs whenever drawer opens or target user changes
    useEffect(() => {
        if (editUser) {
            setForm({
                firstName: editUser.firstName,
                middleName: editUser.middleName || '',
                lastName: editUser.lastName,
                email: editUser.email,
                password: '',
                role: editUser.role,
                phone: editUser.phone || '',
                whatsappNumber: editUser.whatsappNumber || '',
                firmName: editUser.firmName || '',
                factoryName: editUser.factoryName || '',
                factoryLocation: editUser.factoryLocation || '',
            })
        } else {
            setForm(EMPTY_FORM)
        }
        setError('')
    }, [open, editUser])

    const createMut = useMutation({
        mutationFn: createUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onSuccess('User created successfully'); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to create user'),
    })

    const updateMut = useMutation({
        mutationFn: updateUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onSuccess('User updated successfully'); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to update user'),
    })

    const isPending = createMut.isPending || updateMut.isPending

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        setError('')
        if (!form.firstName || !form.lastName || !form.email || !form.role) {
            setError('First name, last name, email, and role are required')
            return
        }
        if (editUser) {
            const body: any = {
                firstName: form.firstName,
                middleName: form.middleName,
                lastName: form.lastName,
                role: form.role,
                phone: form.phone || undefined,
                whatsappNumber: form.whatsappNumber || undefined,
                firmName: form.firmName || undefined,
                factoryName: form.factoryName || undefined,
                factoryLocation: form.factoryLocation || undefined,
            }
            updateMut.mutate({ id: editUser._id, body })
        } else {
            createMut.mutate(form)
        }
    }

    const selectedRoleCfg = getRoleCfg(form.role)

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                    {/* Drawer — h-screen ensures ScrollArea works */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col h-screen"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
                            <div className="flex items-center gap-3">
                                {editUser && (
                                    <Avatar className="size-9">
                                        <AvatarFallback
                                            className="text-sm font-black"
                                            style={{
                                                backgroundColor: selectedRoleCfg.bg,
                                                color: selectedRoleCfg.color,
                                            }}
                                        >
                                            {getInitials(editUser.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div>
                                    <h2 className="font-black text-lg text-foreground tracking-tight">
                                        {editUser ? 'Edit User' : 'Add New User'}
                                    </h2>
                                    <p className="text-[13px] text-muted-foreground mt-0.5">
                                        {editUser ? `Updating ${editUser.name}` : 'Create a new team member account'}
                                    </p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose} className="rounded-xl shrink-0">
                                <X className="size-4" />
                            </Button>
                        </div>

                        {/* Scrollable form */}
                        <ScrollArea className="flex-1 min-h-0">
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                                        >
                                            <AlertCircle className="size-4 shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Name Section */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="firstName" className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                                            First Name *
                                        </Label>
                                        <Input
                                            id="firstName"
                                            placeholder="e.g. Rajesh"
                                            value={form.firstName}
                                            onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                            className="rounded-xl h-11"
                                            autoFocus={!editUser}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lastName" className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                                            Last Name *
                                        </Label>
                                        <Input
                                            id="lastName"
                                            placeholder="e.g. Patel"
                                            value={form.lastName}
                                            onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                            className="rounded-xl h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="middleName" className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Middle Name <span className="text-muted-foreground/50 lowercase font-normal">(optional)</span>
                                    </Label>
                                    <Input
                                        id="middleName"
                                        placeholder="e.g. Kumar"
                                        value={form.middleName}
                                        onChange={e => setForm(f => ({ ...f, middleName: e.target.value }))}
                                        className="rounded-xl h-11"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Email Address *
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="rajesh@maruti.com"
                                            value={form.email}
                                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                            disabled={!!editUser}
                                            className="rounded-xl h-11 pl-9 disabled:opacity-60"
                                        />
                                    </div>
                                    {editUser && (
                                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 tracking-wide">
                                            <ShieldCheck className="size-3.5" />
                                            Email cannot be changed after creation
                                        </p>
                                    )}
                                </div>
                                <Separator />

                                {/* Role */}
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Role *
                                    {form.role && (
                                        <span className="ml-2 normal-case font-normal text-foreground" style={{ color: selectedRoleCfg.color }}>
                                            — {selectedRoleCfg.label}
                                        </span>
                                    )}
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {roles.filter(r => r.name !== 'super_admin').map(r => {
                                        const cfg = getRoleCfg(r.name);
                                        return (
                                            <button
                                                key={r._id}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, role: r.name }))}
                                                className={cn(
                                                    'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold text-left transition-all',
                                                    form.role === r.name
                                                        ? 'border-current shadow-sm scale-[1.01]'
                                                        : 'border-border hover:border-muted-foreground/40 bg-transparent'
                                                )}
                                                style={form.role === r.name
                                                    ? { color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}50` }
                                                    : {}
                                                }
                                            >
                                                <div
                                                    className="size-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: cfg.color }}
                                                />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Conditional Fields Based on Role */}
                                <AnimatePresence>
                                    {IS_ARCHITECT(form.role) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden space-y-5 pt-2"
                                        >
                                            <Separator />
                                            <div className="space-y-1.5">
                                                <Label htmlFor="firmName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    Firm Name *
                                                </Label>
                                                <Input
                                                    id="firmName"
                                                    placeholder="e.g. Dreamscape Architecture"
                                                    value={form.firmName}
                                                    onChange={e => setForm(f => ({ ...f, firmName: e.target.value }))}
                                                    className="rounded-xl h-11 border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {IS_FACTORY_MGR(form.role) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden space-y-5 pt-2"
                                        >
                                            <Separator />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="factoryName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                        Factory Name *
                                                    </Label>
                                                    <Input
                                                        id="factoryName"
                                                        placeholder="e.g. Maruti Workshop"
                                                        value={form.factoryName}
                                                        onChange={e => setForm(f => ({ ...f, factoryName: e.target.value }))}
                                                        className="rounded-xl h-11 border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="factoryLocation" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                        Location *
                                                    </Label>
                                                    <Input
                                                        id="factoryLocation"
                                                        placeholder="e.g. Vadodara"
                                                        value={form.factoryLocation}
                                                        onChange={e => setForm(f => ({ ...f, factoryLocation: e.target.value }))}
                                                        className="rounded-xl h-11 border-primary/20 bg-primary/5 focus:bg-background transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Separator />

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            placeholder="+91 98765 43210"
                                            value={form.phone}
                                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            className="rounded-xl h-11 pl-9"
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="wa" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        WhatsApp Number
                                        <span className="ml-1 text-muted-foreground/50 font-normal normal-case">(if different)</span>
                                    </Label>
                                    <div className="relative">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                        </svg>
                                        <Input
                                            id="wa"
                                            placeholder="+91 98765 43210"
                                            value={form.whatsappNumber}
                                            onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))}
                                            className="rounded-xl h-11 pl-9"
                                        />
                                    </div>
                                </div>
                            </form>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="border-t border-border px-6 py-4 flex gap-3 shrink-0 bg-card">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Cancel</Button>
                            <Button
                                onClick={() => handleSubmit()}
                                disabled={isPending}
                                className="flex-1 rounded-xl h-11 font-bold"
                            >
                                {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                                {editUser ? 'Save Changes' : 'Create User'}
                            </Button>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// ── Password Reset Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onSuccess }: {
    user: AppUser; onClose: () => void; onSuccess: (msg: string) => void
}) {
    const [newPassword, setNewPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const mut = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => { setSuccess(true); setTimeout(() => { onClose(); onSuccess('Password reset successfully') }, 1200) },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to reset password'),
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                        <KeyRound className="size-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-foreground">Reset Password</h3>
                        <p className="text-xs text-muted-foreground">{user.name}</p>
                    </div>
                </div>

                {success ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="p-3 rounded-full bg-emerald-500/10">
                            <CheckCircle2 className="size-8 text-emerald-500" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Password reset successfully</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                <AlertCircle className="size-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {/* Visually hidden field to catch browser autofill */}
                        <input type="text" name="username" autoComplete="email" style={{ display: 'none' }} aria-hidden="true" value={user.email} readOnly />

                        <div className="relative">
                            <Input
                                type={showPass ? 'text' : 'password'}
                                placeholder="New password (min 6 chars)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && mut.mutate({ id: user._id, newPassword })}
                                className="rounded-xl h-11 pr-10"
                                autoComplete="new-password"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                onClick={() => mut.mutate({ id: user._id, newPassword })}
                                disabled={mut.isPending || newPassword.length < 6}
                                className="flex-1 rounded-xl font-bold"
                            >
                                {mut.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                                Reset Password
                            </Button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
    const qc = useQueryClient()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<AppUser | null>(null)
    const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const { hasPermission } = useAuthStore()

    const canCreate = hasPermission('user.create')
    const canEdit = hasPermission('user.edit')
    const canDeactivate = hasPermission('user.deactivate')
    const canDelete = hasPermission('user.delete')
    const canManagePrivs = hasPermission('privilege.view')

    const { data: users = [], isLoading, error: loadError } = useQuery<AppUser[]>({
        queryKey: ['users'],
        queryFn: fetchUsers,
    })

    const { data: roles = [] } = useQuery<any[]>({
        queryKey: ['roles'],
        queryFn: () => api.get('/privileges/roles').then(r => r.data.data),
    })

    const deactivateMut = useMutation({
        mutationFn: deactivateUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast('User deactivated') },
        onError: (e: any) => showToast(e.response?.data?.message || 'Error', 'error'),
    })

    const activateMut = useMutation({
        mutationFn: ({ id }: { id: string }) => api.patch(`/users/${id}/activate`).then(r => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast('User activated') },
        onError: (e: any) => showToast(e.response?.data?.message || 'Error', 'error'),
    })

    const deleteMut = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            showToast('User permanently deleted');
            setDeleteTarget(null);
        },
        onError: (e: any) => showToast(e.response?.data?.message || 'Error deleting user', 'error'),
    })

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const filtered = users.filter(u => {
        const matchesSearch = !search ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        const matchesRole = roleFilter === 'all' || u.role === roleFilter
        return matchesSearch && matchesRole
    })



    const openCreate = () => { setEditTarget(null); setDrawerOpen(true) }
    const openEdit = (u: AppUser) => { setEditTarget(u); setDrawerOpen(true) }

    return (
        <TooltipProvider>
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black  text-foreground mb-3 leading-none truncate">User Management</h1>
                        <div className="flex items-center gap-3.5">
                            <span className="text-[13px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
                                {filtered.length} {roleFilter !== 'all' ? `${getRoleCfg(roleFilter).label} Members` : 'Team Members'}
                                {roleFilter !== 'all' && <span className="text-muted-foreground/40"> / {users.length} Total</span>}
                            </span>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500/80">
                                {filtered.filter(u => u.isActive).length} Authorized
                            </span>
                            {filtered.filter(u => !u.isActive).length > 0 && (
                                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    {filtered.filter(u => !u.isActive).length} Restricted
                                </span>
                            )}
                        </div>
                    </div>
                    {canCreate && (
                        <Button onClick={openCreate} className="rounded-xl h-11 px-6 font-bold gap-2 shrink-0">
                            <Plus className="size-4" /> Add User
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-9 rounded-xl h-10 w-64"
                            autoComplete="disabled"
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

                    {/* Role filter chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter className="size-3.5 text-muted-foreground shrink-0" />
                        <button
                            onClick={() => { setRoleFilter('all'); setSearch('') }}
                            className={cn(
                                'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all',
                                roleFilter === 'all'
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground/60 hover:border-muted-foreground hover:bg-muted/50'
                            )}
                        >
                            Overview
                        </button>
                        {roles.filter(r => users.some(u => u.role === r.name)).map(r => {
                            const cfg = getRoleCfg(r.name);
                            const isActive = roleFilter === r.name;
                            return (
                                <button
                                    key={r._id}
                                    onClick={() => setRoleFilter(isActive ? 'all' : r.name)}
                                    className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all"
                                    style={isActive
                                        ? { color: cfg.color, backgroundColor: cfg.bg, borderColor: `${cfg.color}40` }
                                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                                    }
                                >
                                    {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="border-border">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Skeleton className="size-12 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-3 w-56" />
                                    </div>
                                    <div className="flex gap-1">
                                        {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="size-8 rounded-lg" />)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
                        <AlertCircle className="size-8" />
                        <p className="font-bold text-sm">Failed to load users. Make sure the backend server is running.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted rounded-2xl gap-3">
                        <Users className="size-10 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground font-medium">
                            {search || roleFilter !== 'all' ? 'No users matching your filters' : 'No users yet'}
                        </p>
                        {canCreate && !search && roleFilter === 'all' && (
                            <Button variant="outline" onClick={openCreate} className="rounded-xl text-xs">
                                + Add First User
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filtered.map((user, i) => {
                            const roleCfg = getRoleCfg(user.role)
                            return (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <Card className={cn(
                                        'border-border bg-card hover:shadow-sm transition-all group cursor-pointer relative overflow-hidden',
                                        !user.isActive && 'opacity-60'
                                    )}
                                        onClick={() => navigate(`/users/${user._id}`)}
                                    >
                                        {/* Accent left bar */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 w-0.5 transition-all"
                                            style={{ backgroundColor: roleCfg.color, opacity: user.isActive ? 1 : 0.3 }}
                                        />

                                        <CardContent className="p-4 pl-5 flex items-center gap-4">
                                            {/* Avatar */}
                                            <Avatar className="size-11 shrink-0">
                                                <AvatarFallback
                                                    className="text-sm font-black"
                                                    style={{ backgroundColor: roleCfg.bg, color: roleCfg.color }}
                                                >
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-foreground text-[15px] tracking-tight">{user.name}</span>
                                                    <RoleBadge role={user.role} />
                                                    {IS_ARCHITECT(user.role) && user.firmName && (
                                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 tracking-wide">
                                                            <Building2 size={11} />
                                                            {user.firmName}
                                                        </span>
                                                    )}
                                                    {IS_FACTORY_MGR(user.role) && user.factoryName && (
                                                        <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-md flex items-center gap-1.5 tracking-wide">
                                                            <Building2 size={11} />
                                                            {user.factoryName} {user.factoryLocation && `(${user.factoryLocation})`}
                                                        </span>
                                                    )}
                                                    {!user.isActive && (
                                                        <Badge variant="secondary" className="text-[11px] uppercase tracking-widest font-black">Inactive</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 mt-1.5 text-[13px] text-muted-foreground flex-wrap tracking-wide">
                                                    <span className="flex items-center gap-1.5">
                                                        <Mail className="size-3.5" />
                                                        {user.email}
                                                    </span>
                                                    {user.phone && (
                                                        <span className="flex items-center gap-1.5">
                                                            <Phone className="size-3.5" />
                                                            {user.phone}
                                                        </span>
                                                    )}
                                                    {user.lastLogin && (
                                                        <span className="text-muted-foreground/50 text-[11px] font-bold uppercase tracking-wider ml-auto">
                                                            Last Login: {timeAgo(user.lastLogin)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status dot */}
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <div className={cn(
                                                        'size-2.5 rounded-full shrink-0',
                                                        user.isActive ? 'bg-emerald-500 shadow shadow-emerald-500/50' : 'bg-muted-foreground/30'
                                                    )} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{user.isActive ? 'Active' : 'Inactive'}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-8 rounded-lg">
                                                            <MoreVertical className="size-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
                                                        {canManagePrivs && (
                                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/users/${user._id}`) }} className="rounded-lg gap-2 cursor-pointer">
                                                                <Shield className="size-3.5 text-primary" />
                                                                <span>View Permissions</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEdit && (
                                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(user) }} className="rounded-lg gap-2 cursor-pointer">
                                                                <Edit2 className="size-3.5" />
                                                                <span>Edit Details</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEdit && (
                                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); setResetTarget(user) }} className="rounded-lg gap-2 cursor-pointer">
                                                                <KeyRound className="size-3.5 text-amber-500" />
                                                                <span>Reset Password</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        {(canEdit || canDeactivate) && <DropdownMenuSeparator />}
                                                        {user.isActive ? (
                                                            canDeactivate && (
                                                                <DropdownMenuItem
                                                                    onClick={e => { e.stopPropagation(); deactivateMut.mutate(user._id) }}
                                                                    className="rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500"
                                                                >
                                                                    <UserX className="size-3.5" />
                                                                    <span>Deactivate User</span>
                                                                </DropdownMenuItem>
                                                            )
                                                        ) : (
                                                            canDeactivate && (
                                                                <DropdownMenuItem
                                                                    onClick={e => { e.stopPropagation(); activateMut.mutate({ id: user._id }) }}
                                                                    className="rounded-lg gap-2 cursor-pointer text-emerald-500 focus:text-emerald-500"
                                                                >
                                                                    <UserCheck className="size-3.5" />
                                                                    <span>Activate User</span>
                                                                </DropdownMenuItem>
                                                            )
                                                        )}
                                                        {canDelete && user.role !== 'super_admin' && <DropdownMenuSeparator />}
                                                        {canDelete && user.role !== 'super_admin' && (
                                                            <DropdownMenuItem
                                                                onClick={e => { e.stopPropagation(); setDeleteTarget(user) }}
                                                                className="rounded-lg gap-2 cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/5"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                                <span>Delete User</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })}
                    </div>
                )}

                {/* Add/Edit Drawer */}
                <UserDrawer
                    open={drawerOpen}
                    onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
                    editUser={editTarget}
                    onSuccess={showToast}
                    roles={roles}
                />

                {/* Reset Password Modal */}
                {resetTarget && (
                    <ResetPasswordModal
                        user={resetTarget}
                        onClose={() => setResetTarget(null)}
                        onSuccess={showToast}
                    />
                )}

                {/* Delete Confirmation */}
                <ConfirmationDialog
                    open={!!deleteTarget}
                    onOpenChange={(open) => !open && setDeleteTarget(null)}
                    title="Delete User Permanently?"
                    description={`Are you sure you want to delete ${deleteTarget?.name}? This will permanently remove their account and all associated permissions across ALL companies. This action cannot be undone.`}
                    confirmText="Delete Permanently"
                    variant="destructive"
                    isPending={deleteMut.isPending}
                    onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget._id) }}
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
