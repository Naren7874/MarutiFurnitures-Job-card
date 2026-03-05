import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, Folder, ClipboardList,
    Receipt, Package, ShoppingCart, Settings, LogOut, Bell,
    ChevronLeft, ChevronRight, Building2, ChevronDown, Check,
    ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { cn } from '../lib/utils';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Nav Items by role ─────────────────────────────────────────────────────────

const ALL_NAV = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/', permission: '' },
    { label: 'Clients', icon: Users, path: '/clients', permission: 'client.view' },
    { label: 'Quotations', icon: FileText, path: '/quotations', permission: 'quotation.view' },
    { label: 'Projects', icon: Folder, path: '/projects', permission: 'project.view' },
    { label: 'Job Cards', icon: ClipboardList, path: '/jobcards', permission: 'jobcard.view' },
    { label: 'Invoices', icon: Receipt, path: '/invoices', permission: 'invoice.view' },
    { label: 'Inventory', icon: Package, path: '/inventory', permission: 'inventory.view' },
    { label: 'Purchase Orders', icon: ShoppingCart, path: '/purchase-orders', permission: 'purchaseOrder.view' },
    { label: 'Users', icon: Users, path: '/users', permission: 'user.view' },
    { label: 'Roles', icon: ShieldCheck, path: '/roles', permission: 'role.manage' },
    { label: 'Settings', icon: Settings, path: '/settings', permission: '' },
];


// ── Components ────────────────────────────────────────────────────────────────


function CompanySwitcher() {
    const { user, company, allCompanies, switchCompany } = useAuthStore();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Only super admin with multiple companies gets the switcher
    if (!user?.isSuperAdmin || allCompanies.length <= 1) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <Building2 size={14} className="text-primary" />
                <span className="text-foreground text-sm font-medium">{company?.name ?? 'Loading…'}</span>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition group"
            >
                <Building2 size={14} className="text-primary" />
                <span className="text-foreground text-sm font-medium max-w-[140px] truncate">{company?.name ?? 'Select Company'}</span>
                <ChevronDown size={13} className={cn('text-muted-foreground/40 transition-transform ml-0.5', open && 'rotate-180')} />
            </button>

            {open && (
                <div className="absolute left-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest">Switch Company</p>
                    </div>
                    {allCompanies.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => { switchCompany(c); setOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition text-left"
                        >
                            <div>
                                <p className="text-foreground text-sm font-medium">{c.name}</p>
                                {c.gstin && <p className="text-muted-foreground/60 text-[10px]">{c.gstin}</p>}
                            </div>
                            {company?.id === c.id && <Check size={14} className="text-primary" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function AppLayout() {
    const { user, logout } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { unreadCount, setSheetOpen } = useNotificationStore();
    const { hasPermission } = useAuthStore();
    const navigate = useNavigate();

    const nav = ALL_NAV.filter((item) => !item.permission || hasPermission(item.permission));

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">

            {/* ── Sidebar ──────────────────────────────────────────────────────── */}
            <aside className={cn(
                'flex flex-col bg-sidebar border-r border-border transition-all duration-300 shrink-0',
                sidebarCollapsed ? 'w-[62px]' : 'w-[220px]'
            )}>

                {/* Logo */}
                <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-border', sidebarCollapsed && 'justify-center px-0')}>
                    <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-orange-600 flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-primary-foreground" />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-foreground text-sm font-semibold leading-tight truncate">Maruti Furniture</p>
                            <p className="text-muted-foreground text-[10px] truncate">Job Card System</p>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {nav.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                sidebarCollapsed && 'justify-center px-0 w-10 mx-auto',
                                isActive
                                    ? 'bg-primary/15 text-primary border border-primary/20'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            )}
                            title={sidebarCollapsed ? item.label : undefined}
                        >
                            <item.icon size={16} className="shrink-0" />
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* User + Collapse */}
                <div className="border-t border-border p-3 space-y-2">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-2 px-1">
                            <Avatar className="size-7 rounded-sm border border-border">
                                <AvatarImage src={user?.profilePhoto} />
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                    {user?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden flex-1">
                                <p className="text-foreground text-xs font-medium truncate">{user?.name}</p>
                                <p className="text-muted-foreground text-[10px] truncate capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-1">
                        <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 text-xs font-bold transition" title="Logout">
                            <LogOut size={14} />
                            {!sidebarCollapsed && 'Logout'}
                        </button>
                        <button onClick={toggleSidebar} className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition">
                            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ─────────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top bar */}
                <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
                    {/* LEFT: Company Switcher */}
                    <CompanySwitcher />

                    {/* RIGHT: Tools */}
                    <div className="flex items-center gap-2">
                        <AnimatedThemeToggler />

                        <div className="h-4 w-px bg-border mx-1" />

                        <button
                            onClick={() => setSheetOpen(true)}
                            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border">
                            <Avatar className="size-8 border border-border">
                                <AvatarImage src={user?.profilePhoto} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                                    {user?.name?.charAt(0) || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-foreground/70 text-sm hidden sm:block truncate max-w-[120px] font-medium">{user?.name}</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto bg-background/50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

