import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/** Redirects to /login if not authenticated */
export const ProtectedRoute = () => {
    const { isLoggedIn } = useAuthStore();
    return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

/** Redirects logged-in users away from /login */
export const PublicRoute = () => {
    const { isLoggedIn } = useAuthStore();
    return isLoggedIn ? <Navigate to="/" replace /> : <Outlet />;
};

/**
 * Route-level permission guard.
 * Wrap a <Route> with this as the element to redirect to / if user lacks the permission.
 * Usage: <Route element={<PermissionRoute permission="invoice.view" />}>
 *          <Route path="invoices" element={<InvoicesPage />} />
 *        </Route>
 */
export const PermissionRoute = ({ permission }: { permission: string }) => {
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

