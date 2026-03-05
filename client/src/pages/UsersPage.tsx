import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Users, Plus, Search, Mail, Phone, ShieldCheck,
    KeyRound, UserX, UserCheck, Edit2, X, Eye, EyeOff, Loader2,
    CheckCircle2, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole = 'super_admin' | 'sales' | 'design' | 'store' | 'production' | 'qc' | 'dispatch' | 'accountant' | 'client'
type Dept = 'sales' | 'design' | 'store' | 'production' | 'qc' | 'dispatch' | 'accounts' | 'management'

interface AppUser {
    _id: string
    name: string
    email: string
    role: UserRole
    department?: Dept
    phone?: string
    whatsappNumber?: string
    isActive: boolean
    lastLogin?: string
    createdAt: string
}

interface UserFormData {
    name: string
    email: string
    password: string
    role: UserRole | ''
    department: Dept | ''
    phone: string
    whatsappNumber: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const DEPARTMENTS: Dept[] = ['sales', 'design', 'store', 'production', 'qc', 'dispatch', 'accounts', 'management']

const EMPTY_FORM: UserFormData = {
    name: '', email: '', password: '', role: '', department: '', phone: '', whatsappNumber: ''
}

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchUsers = async (): Promise<AppUser[]> => {
    const { data } = await api.get('/users')
    return data.data
}

const createUser = async (body: Omit<UserFormData, 'department'> & { department?: string }) => {
    const { data } = await api.post('/users', body)
    return data.data
}

const updateUser = async ({ id, body }: { id: string; body: Partial<AppUser> }) => {
    const { data } = await api.put(`/users/${id}`, body)
    return data.data
}

const deactivateUser = async (id: string) => {
    const { data } = await api.delete(`/users/${id}`)
    return data
}

const resetPassword = async ({ id, newPassword }: { id: string; newPassword: string }) => {
    const { data } = await api.post(`/users/${id}/reset-password`, { newPassword })
    return data
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
    const cfg = ROLES.find(r => r.value === role)
    if (!cfg) return null
    return (
        <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
            style={{ color: cfg.color, borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}10` }}
        >
            {cfg.label}
        </span>
    )
}

// ── User drawer / modal ───────────────────────────────────────────────────────
function UserDrawer({
    open, onClose, editUser, onSuccess
}: {
    open: boolean
    onClose: () => void
    editUser: AppUser | null
    onSuccess: () => void
}) {
    const qc = useQueryClient()
    const [form, setForm] = useState<UserFormData>(EMPTY_FORM)
    const [showPass, setShowPass] = useState(false)
    const [error, setError] = useState('')

    // Pre-fill when editing
    useState(() => {
        if (editUser) {
            setForm({
                name: editUser.name,
                email: editUser.email,
                password: '',
                role: editUser.role,
                department: editUser.department || '',
                phone: editUser.phone || '',
                whatsappNumber: editUser.whatsappNumber || '',
            })
        } else {
            setForm(EMPTY_FORM)
        }
        setError('')
    })

    const createMut = useMutation({
        mutationFn: createUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onSuccess(); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to create user'),
    })

    const updateMut = useMutation({
        mutationFn: updateUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onSuccess(); onClose() },
        onError: (e: any) => setError(e.response?.data?.message || 'Failed to update user'),
    })

    const isPending = createMut.isPending || updateMut.isPending

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!form.name || !form.email || (!editUser && !form.password) || !form.role) {
            setError('Name, email, role and (for new users) password are required')
            return
        }
        if (editUser) {
            const body: any = { name: form.name, role: form.role, department: form.department || undefined, phone: form.phone || undefined, whatsappNumber: form.whatsappNumber || undefined }
            updateMut.mutate({ id: editUser._id, body })
        } else {
            createMut.mutate({ ...form, department: form.department || undefined })
        }
    }

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

                    {/* Drawer */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                            <div>
                                <h2 className="font-black text-lg text-foreground tracking-tight">
                                    {editUser ? 'Edit User' : 'Add New User'}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {editUser ? 'Update user details and role' : 'Create a new team member account'}
                                </p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={onClose} className="rounded-xl">
                                <X className="size-4" />
                            </Button>
                        </div>

                        {/* Form */}
                        <ScrollArea className="flex-1">
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

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name *</Label>
                                    <Input id="name" placeholder="Rajesh Patel" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="rounded-xl h-11" />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address *</Label>
                                    <Input id="email" type="email" placeholder="rajesh@maruti.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editUser} className="rounded-xl h-11 disabled:opacity-60" />
                                    {editUser && <p className="text-[10px] text-muted-foreground">Email cannot be changed after creation</p>}
                                </div>

                                {/* Password (only for new user) */}
                                {!editUser && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password *</Label>
                                        <div className="relative">
                                            <Input id="password" type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="rounded-xl h-11 pr-10" />
                                            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Role */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role *</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                                            <button
                                                key={r.value}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, role: r.value }))}
                                                className={cn(
                                                    'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold text-left transition-all',
                                                    form.role === r.value
                                                        ? 'border-current'
                                                        : 'border-border hover:border-muted-foreground/40'
                                                )}
                                                style={form.role === r.value ? { color: r.color, backgroundColor: `${r.color}10`, borderColor: `${r.color}40` } : {}}
                                            >
                                                <ShieldCheck className="size-3.5" style={{ color: r.color }} />
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Department */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
                                    <select
                                        value={form.department}
                                        onChange={e => setForm(f => ({ ...f, department: e.target.value as Dept | '' }))}
                                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">— No department —</option>
                                        {DEPARTMENTS.map(d => (
                                            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                                    <Input id="phone" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="rounded-xl h-11" />
                                </div>

                                {/* WhatsApp */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="wa" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp Number</Label>
                                    <Input id="wa" placeholder="+91 98765 43210 (if different)" value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} className="rounded-xl h-11" />
                                </div>
                            </form>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="border-t border-border px-6 py-4 flex gap-3">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Cancel</Button>
                            <Button onClick={handleSubmit as any} disabled={isPending} className="flex-1 rounded-xl h-11 font-bold">
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
function ResetPasswordModal({ user, onClose }: { user: AppUser; onClose: () => void }) {
    const [newPassword, setNewPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const mut = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => setSuccess(true),
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
                    <div className="p-2 rounded-xl bg-amber-500/10">
                        <KeyRound className="size-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-black text-foreground">Reset Password</h3>
                        <p className="text-xs text-muted-foreground">{user.name}</p>
                    </div>
                </div>

                {success ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <CheckCircle2 className="size-10 text-emerald-500" />
                        <p className="text-sm font-bold text-foreground">Password reset successfully</p>
                        <Button onClick={onClose} className="w-full rounded-xl">Done</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <div className="relative">
                            <Input
                                type={showPass ? 'text' : 'password'}
                                placeholder="New password (min 6 chars)"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="rounded-xl h-11 pr-10"
                            />
                            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                            <Button onClick={() => mut.mutate({ id: user._id, newPassword })} disabled={mut.isPending} className="flex-1 rounded-xl">
                                {mut.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                                Reset
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
    const [search, setSearch] = useState('')
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<AppUser | null>(null)
    const [resetTarget, setResetTarget] = useState<AppUser | null>(null)
    const [toast, setToast] = useState<string | null>(null)

    const { data: users = [], isLoading, error: loadError } = useQuery<AppUser[]>({
        queryKey: ['users'],
        queryFn: fetchUsers,
    })

    const deactivateMut = useMutation({
        mutationFn: deactivateUser,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast('User deactivated') },
        onError: (e: any) => showToast(e.response?.data?.message || 'Error'),
    })

    const activateMut = useMutation({
        mutationFn: ({ id }: { id: string }) => updateUser({ id, body: { isActive: true } }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast('User activated') },
        onError: (e: any) => showToast(e.response?.data?.message || 'Error'),
    })

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    )

    const openCreate = () => { setEditTarget(null); setDrawerOpen(true) }
    const openEdit = (u: AppUser) => { setEditTarget(u); setDrawerOpen(true) }

    return (
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <Users className="size-6 text-primary" />
                        </div>
                        User Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {users.length} team member{users.length !== 1 ? 's' : ''} •{' '}
                        {users.filter(u => u.isActive).length} active
                    </p>
                </div>
                <Button onClick={openCreate} className="rounded-xl h-11 px-6 font-bold gap-2">
                    <Plus className="size-4" /> Add User
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                    placeholder="Search users…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl h-10"
                />
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="size-6 animate-spin text-primary" />
                </div>
            ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
                    <AlertCircle className="size-8" />
                    <p className="font-bold text-sm">Failed to load users. Make sure the backend server is running.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-muted rounded-2xl gap-3">
                            <Users className="size-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground font-medium">No users found</p>
                            <Button variant="outline" onClick={openCreate} className="rounded-xl text-xs">+ Add First User</Button>
                        </div>
                    ) : (
                        filtered.map((user, i) => (
                            <motion.div
                                key={user._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                            >
                                <Card className="border-border bg-card hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-foreground text-sm">{user.name}</span>
                                                <RoleBadge role={user.role} />
                                                {!user.isActive && (
                                                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><Mail className="size-3" />{user.email}</span>
                                                {user.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{user.phone}</span>}
                                                {user.department && <span className="capitalize">{user.department}</span>}
                                            </div>
                                        </div>

                                        {/* Status dot */}
                                        <div className={cn('size-2.5 rounded-full shrink-0', user.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button size="icon" variant="ghost" onClick={() => openEdit(user)} title="Edit user" className="size-8 rounded-lg text-muted-foreground hover:text-foreground">
                                                <Edit2 className="size-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => setResetTarget(user)} title="Reset password" className="size-8 rounded-lg text-muted-foreground hover:text-amber-500">
                                                <KeyRound className="size-3.5" />
                                            </Button>
                                            {user.isActive ? (
                                                <Button size="icon" variant="ghost" onClick={() => deactivateMut.mutate(user._id)} title="Deactivate user" className="size-8 rounded-lg text-muted-foreground hover:text-red-500">
                                                    <UserX className="size-3.5" />
                                                </Button>
                                            ) : (
                                                <Button size="icon" variant="ghost" onClick={() => activateMut.mutate({ id: user._id })} title="Activate user" className="size-8 rounded-lg text-muted-foreground hover:text-emerald-500">
                                                    <UserCheck className="size-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            )}

            {/* Add/Edit Drawer */}
            <UserDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                editUser={editTarget}
                onSuccess={() => showToast(editTarget ? 'User updated successfully' : 'User created successfully')}
            />

            {/* Reset Password Modal */}
            {resetTarget && (
                <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
            )}

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
