import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, PublicRoute, PermissionRoute, ArchitectRoute } from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import ArchitectLayout from './components/ArchitectLayout';
import { ThemeProvider } from './components/theme-provider';
// useAuthStore imported by ArchitectLayout directly — not needed here

// ── Lazy page imports (code splitting) ────────────────────────────────────────

// Architect Portal
const ArchitectDashboardPage  = lazy(() => import('./pages/architect/ArchitectDashboardPage'));
const ArchitectQuotationsPage = lazy(() => import('./pages/architect/ArchitectQuotationsPage'));
const ArchitectQuotationDetailPage = lazy(() => import('./pages/architect/ArchitectQuotationDetailPage'));
const ArchitectProjectsPage = lazy(() => import('./pages/architect/ArchitectProjectsPage'));
const ArchitectProjectDetailPage = lazy(() => import('./pages/architect/ArchitectProjectDetailPage'));
const ArchitectJobCardsPage = lazy(() => import('./pages/architect/ArchitectJobCardsPage'));
const ArchitectJobCardDetailPage = lazy(() => import('./pages/architect/ArchitectJobCardDetailPage'));
const ArchitectClientsPage    = lazy(() => import('./pages/architect/ArchitectClientsPage'));

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

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
const NewJobCardPage = lazy(() => import('./pages/NewJobCardPage'));

// Invoices
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const InvoiceDetailPage = lazy(() => import('./pages/InvoiceDetailPage'));
const NewInvoicePage = lazy(() => import('./pages/NewInvoicePage'));
const EditInvoicePage = lazy(() => import('./pages/EditInvoicePage'));

// Quotations (edit)
const QuotationEditPage = lazy(() => import('./pages/QuotationEditPage'));

// Notifications
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Reports
const ReportsPage = lazy(() => import('./pages/ReportsPage'));

// Public (no auth)


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
                    <Route path="jobcards/new" element={<NewJobCardPage />} />
                    <Route path="jobcards/:id" element={<JobCardDetailPage />} />

                    {/* Invoices — requires invoice.view */}
                    <Route element={<PermissionRoute permission="invoice.view" />}>
                      <Route path="invoices" element={<InvoicesPage />} />
                      <Route path="invoices/new" element={<NewInvoicePage />} />
                      <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                      <Route path="invoices/:id/edit" element={<EditInvoicePage />} />
                    </Route>


                    {/* Reports — requires reports.view_financial or reports.view_production */}
                    <Route element={<PermissionRoute permission={['reports.view_financial', 'reports.view_production']} />}>
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

                {/* ── Architect Portal ─────────────────────────── */}
                {/* ArchitectRoute ensures ONLY architect-role users can access /architect/* */}
                <Route element={<ArchitectRoute />}>
                  <Route path="/architect" element={<ArchitectLayout />}>
                    <Route index element={<ArchitectDashboardPage />} />
                    <Route path="quotations" element={<ArchitectQuotationsPage />} />
                    <Route path="quotations/:id" element={<ArchitectQuotationDetailPage />} />
                    <Route path="projects" element={<ArchitectProjectsPage />} />
                    <Route path="projects/:id" element={<ArchitectProjectDetailPage />} />
                    <Route path="jobcards" element={<ArchitectJobCardsPage />} />
                    <Route path="jobcards/:id" element={<ArchitectJobCardDetailPage />} />
                    <Route path="clients" element={<ArchitectClientsPage />} />
                  </Route>
                </Route>

              </Routes>
            </Suspense>
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>
  );
}