import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, PublicRoute, PermissionRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { ThemeProvider } from './components/theme-provider';


// ── Query Client ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Lazy page imports (code splitting) ────────────────────────────────────────

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/dashboard'));

// Clients
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'));
const NewClientPage = lazy(() => import('./pages/NewClientPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));

// Quotations
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const NewQuotationPage = lazy(() => import('./pages/NewQuotationPage'));
const QuotationDetailPage = lazy(() => import('./pages/QuotationDetailPage'));

// Projects
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));

// Job Cards
const JobCardsPage = lazy(() => import('./pages/JobCardsPage'));
const JobCardDetailPage = lazy(() => import('./pages/JobCardDetailPage'));

// Invoices
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'));

// Inventory
const InventoryPage = lazy(() => import('./pages/InventoryPage'));

// Purchase Orders
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));
const PurchaseOrderDetailPage = lazy(() => import('./pages/PurchaseOrderDetailPage'));
const NewPurchaseOrderPage = lazy(() => import('./pages/NewPurchaseOrderPage'));

// Quotations (edit)
const QuotationEditPage = lazy(() => import('./pages/QuotationEditPage'));

// Notifications
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Reports
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

// Public (no auth)
const ClientSignoffPage = lazy(() => import('./pages/ClientSignoffPage'));

// Users & Roles
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const UserDetailPage = lazy(() => import('./pages/UserDetailPage'));

// Settings
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'));

// ── Loading fallback ──────────────────────────────────────────────────────────

const PageLoader = () => (
  <div className="flex h-96 items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const Stub = ({ name }: { name: string }) => (
  <div className="p-8 text-muted-foreground/30 text-center font-bold italic">{name} — coming soon</div>
);

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="maruti-theme">
        <BrowserRouter>
          <SocketProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>

                {/* Public — incl. client sign-off */}
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                </Route>

                {/* Public sign-off page (no auth needed) */}
                <Route path="/signoff/:token" element={<ClientSignoffPage />} />

                {/* Protected */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>

                    {/* Dashboard */}
                    <Route index element={<DashboardPage />} />

                    {/* Clients — requires client.view */}
                    <Route element={<PermissionRoute permission="client.view" />}>
                      <Route path="clients" element={<ClientsPage />} />
                      <Route path="clients/new" element={<NewClientPage />} />
                      <Route path="clients/:id" element={<ClientDetailPage />} />
                      <Route path="clients/:id/edit" element={<EditClientPage />} />
                    </Route>

                    {/* Quotations — requires quotation.view */}
                    <Route element={<PermissionRoute permission="quotation.view" />}>
                      <Route path="quotations" element={<QuotationsPage />} />
                      <Route path="quotations/:id" element={<QuotationDetailPage />} />
                    </Route>
                    {/* Quotation edit — requires quotation.edit (sales only) */}
                    <Route element={<PermissionRoute permission="quotation.edit" />}>
                      <Route path="quotations/:id/edit" element={<QuotationEditPage />} />
                    </Route>
                    {/* Quotation create — requires quotation.create */}
                    <Route element={<PermissionRoute permission="quotation.create" />}>
                      <Route path="quotations/new" element={<NewQuotationPage />} />
                    </Route>

                    {/* Projects — requires project.view */}
                    <Route element={<PermissionRoute permission="project.view" />}>
                      <Route path="projects" element={<ProjectsPage />} />
                      <Route path="projects/new" element={<Stub name="New Project" />} />
                      <Route path="projects/:id" element={<ProjectDetailPage />} />
                    </Route>

                    {/* Job Cards — requires jobcard.view (all roles get this) */}
                    <Route path="jobcards" element={<JobCardsPage />} />
                    <Route path="jobcards/new" element={<Stub name="New Job Card" />} />
                    <Route path="jobcards/:id" element={<JobCardDetailPage />} />

                    {/* Invoices — requires invoice.view */}
                    <Route element={<PermissionRoute permission="invoice.view" />}>
                      <Route path="invoices" element={<InvoicesPage />} />
                      <Route path="invoices/new" element={<NewInvoicePage />} />
                      <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                    </Route>

                    {/* Inventory — requires inventory.view */}
                    <Route element={<PermissionRoute permission="inventory.view" />}>
                      <Route path="inventory" element={<InventoryPage />} />
                      <Route path="inventory/new" element={<Stub name="New Inventory Item" />} />
                    </Route>

                    {/* Purchase Orders — requires purchaseOrder.view */}
                    <Route element={<PermissionRoute permission="purchaseOrder.view" />}>
                      <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                      <Route path="purchase-orders/new" element={<NewPurchaseOrderPage />} />
                      <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                    </Route>

                    {/* Reports — requires reports.view_financial or reports.view_production */}
                    <Route element={<PermissionRoute permission="report.view" />}>
                      <Route path="reports" element={<ReportsPage />} />
                    </Route>

                    {/* Notifications — all logged-in users */}
                    <Route path="notifications" element={<NotificationsPage />} />

                    {/* Users & Roles — super_admin / user.view */}
                    <Route element={<PermissionRoute permission="user.view" />}>
                      <Route path="users" element={<UsersPage />} />
                      <Route path="users/:id" element={<UserDetailPage />} />
                    </Route>
                    <Route element={<PermissionRoute permission="privilege.view" />}>
                      <Route path="roles" element={<RolesPage />} />
                    </Route>

                    {/* Settings — all logged-in users (filtered by role inside component) */}
                    <Route path="settings" element={<SettingsPage />} />
                    
                    <Route element={<PermissionRoute permission="settings.view" />}>
                      <Route path="company-profile" element={<CompanyProfilePage />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<div className="p-8 text-muted-foreground/30 text-center font-bold italic">Page not found</div>} />
                  </Route>
                </Route>

              </Routes>
            </Suspense>
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}