import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, LogOut, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '../lib/utils';
import { PanelLeft } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/architect' },
  { label: 'Quotations', icon: FileText, path: '/architect/quotations' },
  { label: 'Clients', icon: Users, path: '/architect/clients' },
];

export default function ArchitectLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-sidebar border-r border-border transition-all duration-300 shrink-0',
        collapsed ? 'w-[62px]' : 'w-[220px]'
      )}>
        {/* Brand */}
        <div className={cn('flex items-center gap-3 px-4 py-3.5 border-b border-border', collapsed && 'justify-center px-0')}>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="size-5 text-primary" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-foreground text-sm font-black uppercase tracking-tight truncate leading-tight">Architect</p>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-60 truncate">Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/architect'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                collapsed && 'justify-center px-0 w-10 mx-auto',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-border p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-1">
              <Avatar className="size-7 rounded-sm border border-border">
                <AvatarImage src={user?.profilePhoto} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1">
                <p className="text-foreground text-xs font-medium truncate">{user?.name}</p>
                <p className="text-muted-foreground text-[10px] truncate">Architect</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 text-xs font-bold transition"
            title="Logout"
          >
            <LogOut size={14} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="size-10 flex items-center justify-center rounded-xl bg-muted/40 border border-border text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30 transition-all duration-300"
          >
            <PanelLeft size={18} className={cn('transition-all duration-500', !collapsed ? 'text-primary' : 'opacity-70')} />
          </button>

          <div className="flex items-center gap-2">
            <AnimatedThemeToggler />
            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-border">
              <Avatar className="size-8 border border-border">
                <AvatarImage src={user?.profilePhoto} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold uppercase">
                  {user?.name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground/70 text-sm hidden sm:block truncate max-w-[120px] font-medium">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
