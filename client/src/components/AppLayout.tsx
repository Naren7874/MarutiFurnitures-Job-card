import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, Folder, ClipboardList,
    Receipt, Package, ShoppingCart, Settings, LogOut, Bell,
    ChevronLeft, ChevronRight, Building2, Check,
    ShieldCheck, BarChart3
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NotificationSheet from './NotificationSheet';

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
    { label: 'Reports', icon: BarChart3, path: '/reports', permission: 'report.view' },
    { label: 'Users', icon: Users, path: '/users', permission: 'user.view' },
    { label: 'Roles', icon: ShieldCheck, path: '/roles', permission: 'privilege.view' },
    { label: 'Settings', icon: Settings, path: '/settings', permission: 'settings.view' },
    { label: 'Company Profile', icon: Building2, path: '/company-profile', permission: 'settings.view' },
];


// ── Components ────────────────────────────────────────────────────────────────


const renderLogo = (c: any, className = "size-7") => {
    if (c?.logo) {
        return <img src={c.logo} alt={c.name} className={cn(className, "object-contain shrink-0")} />;
    }
    return <Building2 className={cn(className, "text-primary shrink-0")} />;
};

function CompanySwitcher() {
    const { user, company, allCompanies, switchCompany } = useAuthStore();
    const queryClient = useQueryClient();
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
            <div className="flex items-center px-5 py-2 rounded-full bg-muted/40 border border-border">
                <span className="text-foreground text-sm font-black tracking-tight uppercase truncate max-w-[180px]">{company?.name ?? 'Loading…'}</span>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={cn(
                    "flex items-center px-6 py-2.5 rounded-full border transition-all duration-300",
                    open 
                        ? "bg-primary/5 border-primary/30 shadow-xl shadow-primary/5" 
                        : "bg-card border-border hover:border-primary/20 hover:bg-muted/50 hover:shadow-lg"
                )}
            >
                <span className="text-foreground text-sm font-black tracking-tight uppercase">{company?.name ?? 'Select Company'}</span>
            </button>

            {open && (
                <div className="absolute left-0 mt-4 w-80 bg-card/90 backdrop-blur-2xl border border-border/60 rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.35)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-6 grid grid-cols-2 gap-4">
                        {allCompanies.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => { 
                                    switchCompany(c); 
                                    setOpen(false); 
                                    queryClient.invalidateQueries();
                                }}
                                className={cn(
                                    "aspect-square rounded-[2.5rem] transition-all duration-500 group/item relative overflow-visible border-4",
                                    company?.id === c.id 
                                        ? "border-primary bg-card shadow-[0_20px_40px_rgba(var(--primary),0.15)] scale-[1.02]" 
                                        : "border-transparent bg-card shadow-sm hover:border-border/40 hover:shadow-xl hover:scale-[1.05]"
                                )}
                            >
                                {/* White Logo Square */}
                                <div className="absolute inset-0 flex items-center justify-center p-6 bg-card rounded-[2.2rem]">
                                    {renderLogo(c, "size-full object-contain")}
                                </div>

                                {/* Active Badge - Primary Circle with Checkmark */}
                                {company?.id === c.id && (
                                    <div className="absolute -top-3 -right-3 size-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_4px_12px_rgba(var(--primary),0.4)] z-30 animate-in zoom-in-50 duration-500 ring-4 ring-card">
                                        <Check size={12} strokeWidth={4} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function AppLayout() {
    const { user, company, logout, hasPermission, updateUser, updateCompanies } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const { unreadCount, setSheetOpen } = useNotificationStore();
    const navigate = useNavigate();

    // Sync profile & companies from backend to store to ensure permissions/logos are fresh
    const { data: meContent } = useMe() as any;
    useEffect(() => {
        if (meContent?.user) {
            updateUser(meContent.user);
        }
        if (meContent?.allCompanies) {
            updateCompanies(meContent.allCompanies);
        }
    }, [meContent, updateUser, updateCompanies]);

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
                <div className={cn('flex items-center gap-3 px-4 py-3.5 border-b border-border', sidebarCollapsed && 'justify-center px-0')}>
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-card shadow-sm flex items-center justify-center shrink-0 overflow-hidden border border-border/50 p-1">
                        {renderLogo(company, "size-full object-contain scale-[1.35] transition-transform duration-500")}
                    </div>
                    {!sidebarCollapsed && (
                        <div className="overflow-hidden">
                            <p className="text-foreground text-sm font-black uppercase tracking-tight truncate leading-tight">
                                {company?.name || "Maruti Furniture"}
                            </p>
                            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 truncate">
                                Job Card System
                            </p>
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

            {/* Notification Sheet (slide-over from right) */}
            <NotificationSheet />
        </div>
    );
}
