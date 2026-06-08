import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { lazyWithReload } from '@/utils/lazyWithReload';
import { useAuthStore } from '@/stores/auth';
import { ToastContainer } from '@/components/Toast';
import { ConfirmDialogProvider } from '@/components/ConfirmDialog';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { InstallPWA } from '@/components/InstallPWA';
import { LicenseGuard } from '@/components/LicenseGuard';
import AppLayout from '@/layouts/AppLayout';

// ── Lazy pages ──────────────────────────────────────────────────────────────
const LandingPage     = lazyWithReload(() => import('@/modules/landing/LandingPage'));
const LoginPage       = lazyWithReload(() => import('@/modules/auth/LoginPage'));
const RegisterPage    = lazyWithReload(() => import('@/modules/auth/RegisterPage'));
const ActivationPage  = lazyWithReload(() => import('@/modules/activation/ActivationPage'));
const DashboardPage   = lazyWithReload(() => import('@/modules/dashboard/DashboardPage'));
const MembersPage     = lazyWithReload(() => import('@/modules/members/MembersPage'));
const MemberDetailPage= lazyWithReload(() => import('@/modules/members/MemberDetailPage'));
const CoachesPage     = lazyWithReload(() => import('@/modules/coaches/CoachesPage'));
const ProductsPage    = lazyWithReload(() => import('@/modules/products/ProductsPage'));
const PackagesPage    = lazyWithReload(() => import('@/modules/packages/PackagesPage'));
const BookingsPage    = lazyWithReload(() => import('@/modules/bookings/BookingsPage'));
const ProductSalesPage= lazyWithReload(() => import('@/modules/payments/ProductSalesPage'));
const MemberPaymentPage=lazyWithReload(() => import('@/modules/payments/MemberPaymentPage'));
const CommissionsPage = lazyWithReload(() => import('@/modules/commissions/CommissionsPage'));
const ReportsPage     = lazyWithReload(() => import('@/modules/reports/ReportsPage'));
const SettingsPage    = lazyWithReload(() => import('@/modules/settings/SettingsPage'));
const SuperAdminPage  = lazyWithReload(() => import('@/modules/superadmin/SuperAdminPage'));
const LicensesPage    = lazyWithReload(() => import('@/modules/superadmin/LicensesPage'));

// ── Suspense spinner ─────────────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-7 h-7 border-[3px] border-zen-brand/20 border-t-zen-brand rounded-full animate-spin" />
    </div>
  );
}

// ── Animated page content (keyed per-path for enter animation) ───────────────
// Only this inner div re-mounts on navigation — AppLayout/sidebar stay mounted.
function AnimatedContent() {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<PageSpinner />}>
      <div key={pathname} className="animate-page-in">
        <Outlet />
      </div>
    </Suspense>
  );
}

// ── Layout route guards ───────────────────────────────────────────────────────

// All authenticated users — AppLayout mounts ONCE for all child routes
function ProtectedLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'superadmin') {
    return <AppLayout><AnimatedContent /></AppLayout>;
  }
  return <AppLayout><LicenseGuard><AnimatedContent /></LicenseGuard></AppLayout>;
}

// Owner-only sub-guard (lightweight — just checks role, no layout re-mount)
function OwnerGuard() {
  const { user } = useAuthStore();
  if (user?.role !== 'owner') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Superadmin-only sub-guard
function SuperadminGuard() {
  const { user } = useAuthStore();
  if (user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Activation skips LicenseGuard — separate layout so owner can reach it even unlicensed
function ActivationLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'owner') return <Navigate to="/dashboard" replace />;
  return (
    <AppLayout>
      <Suspense fallback={<PageSpinner />}>
        <div className="animate-page-in"><Outlet /></div>
      </Suspense>
    </AppLayout>
  );
}

// ── Public page wrapper (Suspense only) ──────────────────────────────────────
function PublicPage({ element }: { element: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <div className="animate-page-in">{element}</div>
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const validateSession = useAuthStore(s => s.validateSession);
  useEffect(() => { validateSession(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<PublicPage element={<LandingPage />} />} />
        <Route path="/login"    element={<PublicPage element={<LoginPage />} />} />
        <Route path="/register" element={<PublicPage element={<RegisterPage />} />} />
        <Route path="/superadmin" element={<PublicPage element={<SuperAdminPage />} />} />

        {/* Activation — owner-only, no license gate */}
        <Route element={<ActivationLayout />}>
          <Route path="/activation" element={<ActivationPage />} />
        </Route>

        {/* Protected — AppLayout mounts ONCE, only content swaps */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/members"    element={<MembersPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/coaches"    element={<CoachesPage />} />
          <Route path="/products"   element={<ProductsPage />} />
          <Route path="/packages"   element={<PackagesPage />} />
          <Route path="/bookings"   element={<BookingsPage />} />
          <Route path="/sales"      element={<ProductSalesPage />} />
          <Route path="/payments"   element={<MemberPaymentPage />} />
          <Route path="/settings"   element={<SettingsPage />} />

          {/* Owner-only */}
          <Route element={<OwnerGuard />}>
            <Route path="/commissions" element={<CommissionsPage />} />
            <Route path="/reports"     element={<ReportsPage />} />
          </Route>

          {/* Superadmin-only */}
          <Route element={<SuperadminGuard />}>
            <Route path="/licenses" element={<LicensesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />
      <ConfirmDialogProvider />
      <OfflineIndicator />
      <InstallPWA />
    </BrowserRouter>
  );
}
