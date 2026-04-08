import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const isArchitectRole = (role?: string | null) => {
    if (!role) return false;
    const lower = role.toLowerCase();
    return lower.includes('architect') || lower === 'project_designer' || lower === 'project designer';
};

/** Redirects to /login if not authenticated.
 *  Redirects architects away from non-architect routes → /architect */
export const ProtectedRoute = () => {
    const { isLoggedIn, user } = useAuthStore();
    const { pathname } = useLocation();

    if (!isLoggedIn) return <Navigate to="/login" replace />;

    // Architects must stay inside /architect/*
    if (isArchitectRole(user?.role) && !pathname.startsWith('/architect')) {
        return <Navigate to="/architect" replace />;
    }

    return <Outlet />;
};

/** Redirects logged-in users away from /login */
export const PublicRoute = () => {
    const { isLoggedIn, user } = useAuthStore();
    if (!isLoggedIn) return <Outlet />;
    // Architects go directly to their portal
    return <Navigate to={isArchitectRole(user?.role) ? '/architect' : '/'} replace />;
};

/** Guards architect-only routes — redirects non-architects away */
export const ArchitectRoute = () => {
    const { isLoggedIn, user } = useAuthStore();
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (!isArchitectRole(user?.role)) return <Navigate to="/" replace />;
    return <Outlet />;
};

/**
 * Route-level permission guard.
 * Wrap a <Route> with this as the element to redirect to / if user lacks the permission.
 */
export const PermissionRoute = ({ permission }: { permission: string | string[] }) => {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    if (!hasPermission(permission)) {
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
};

/** Renders children only if user has the required permission */
export const RequirePermission = ({ permission, children }: { permission: string; children: React.ReactNode }) => {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    if (!hasPermission(permission)) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
                <p>You don't have permission to view this section.</p>
            </div>
        );
    }
    return <>{children}</>;
};

/** Renders children only if user has the required role */
export const RequireRole = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => {
    const user = useAuthStore((s) => s.user);
    if (!user || !roles.includes(user.role)) return null;
    return <>{children}</>;
};
