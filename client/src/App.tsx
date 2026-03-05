import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from './context/SocketContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
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

// Quotations
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));

// Projects
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));

// Job Cards
const JobCardsPage = lazy(() => import('./pages/JobCardsPage'));
const JobCardDetailPage = lazy(() => import('./pages/JobCardDetailPage'));

// Invoices
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));

// Inventory
const InventoryPage = lazy(() => import('./pages/InventoryPage'));

// Purchase Orders
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'));

// Users & Roles
const UsersPage = lazy(() => import('./pages/UsersPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));

// Settings
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

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

                {/* Public */}
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

                    {/* Clients */}
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="clients/new" element={<NewClientPage />} />
                    <Route path="clients/:id" element={<ClientDetailPage />} />

                    {/* Quotations */}
                    <Route path="quotations" element={<QuotationsPage />} />
                    <Route path="quotations/new" element={<Stub name="New Quotation" />} />
                    <Route path="quotations/:id" element={<Stub name="Quotation Detail" />} />

                    {/* Projects */}
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/new" element={<Stub name="New Project" />} />
                    <Route path="projects/:id" element={<Stub name="Project Detail" />} />

                    {/* Job Cards */}
                    <Route path="jobcards" element={<JobCardsPage />} />
                    <Route path="jobcards/new" element={<Stub name="New Job Card" />} />
                    <Route path="jobcards/:id" element={<JobCardDetailPage />} />

                    {/* Invoices */}
                    <Route path="invoices" element={<InvoicesPage />} />
                    <Route path="invoices/new" element={<Stub name="New Invoice" />} />
                    <Route path="invoices/:id" element={<Stub name="Invoice Detail" />} />

                    {/* Inventory */}
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="inventory/new" element={<Stub name="New Inventory Item" />} />

                    {/* Purchase Orders */}
                    <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                    <Route path="purchase-orders/new" element={<Stub name="New Purchase Order" />} />
                    <Route path="purchase-orders/:id" element={<Stub name="PO Detail" />} />

                    {/* Users & Roles */}
                    <Route path="users" element={<UsersPage />} />
                    <Route path="roles" element={<RolesPage />} />

                    {/* Settings */}
                    <Route path="settings" element={<SettingsPage />} />

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