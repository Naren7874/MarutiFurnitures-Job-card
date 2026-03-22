/**
 * Permission-gated navigation items.
 * Each item declares the `permission` required to see it in the sidebar.
 * `null` = visible to ALL authenticated users.
 *
 * Matches role_based_views.md sidebar spec exactly.
 */
import {
    LayoutGrid,
    ClipboardList,
    Users,
    Package,
    Banknote,
    BarChart3,
    UserCog,
    ShieldCheck,
    Settings,
    FileText,
    FolderOpen,
    ShoppingCart,
    Bell,
} from 'lucide-react';

export interface NavItem {
    title: string;
    url: string;
    icon: React.ElementType;
    /** Permission key required to show this item. null = always visible. */
    permission: string | null;
}

export const ALL_NAV_ITEMS: NavItem[] = [
    // ── Visible to all authenticated users ──────────────────────────────
    { title: 'Dashboard',         url: '/',                  icon: LayoutGrid,   permission: null },
    { title: 'Notifications',     url: '/notifications',     icon: Bell,         permission: null },

    // ── Client & Sales stack ─────────────────────────────────────────────
    { title: 'Clients',           url: '/clients',           icon: Users,        permission: 'client.view' },
    { title: 'Quotations',        url: '/quotations',        icon: FileText,     permission: 'quotation.view' },

    // ── Operations stack ─────────────────────────────────────────────────
    { title: 'Projects',          url: '/projects',          icon: FolderOpen,   permission: 'project.view' },
    { title: 'Job Cards',         url: '/jobcards',          icon: ClipboardList,permission: 'jobcard.view' },

    // ── Finance & Supply stack ─────────────────────────────────────────
    { title: 'Proforma Invoices', url: '/invoices',          icon: Banknote,     permission: 'invoice.view' },
    { title: 'Inventory',         url: '/inventory',         icon: Package,      permission: 'inventory.view' },
    { title: 'Purchase Orders',   url: '/purchase-orders',   icon: ShoppingCart, permission: 'purchaseOrder.view' },

    // ── Analytics ───────────────────────────────────────────────────────
    { title: 'Reports',           url: '/reports',           icon: BarChart3,    permission: 'reports.view_financial' },

    // ── Admin-only ──────────────────────────────────────────────────────
    { title: 'Users',             url: '/users',             icon: UserCog,      permission: 'user.view' },
    { title: 'Roles & Permissions',url: '/roles',            icon: ShieldCheck,  permission: 'privilege.view' },
    { title: 'Settings',          url: '/settings',          icon: Settings,     permission: 'settings.view' },
];
