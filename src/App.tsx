import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/stores/auth';
import { ToastContainer } from '@/components/Toast';
import { ConfirmDialogProvider } from '@/components/ConfirmDialog';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { InstallPWA } from '@/components/InstallPWA';
import { LicenseGuard } from '@/components/LicenseGuard';
import AppLayout from '@/layouts/AppLayout';

// ── Lazy pages ──────────────────────────────────────────────────────────────
const LandingPage     = lazy(() => import('@/modules/landing/LandingPage'));
const LoginPage       = lazy(() => import('@/modules/auth/LoginPage'));
const RegisterPage    = lazy(() => import('@/modules/auth/RegisterPage'));
const ActivationPage  = lazy(() => import('@/modules/activation/ActivationPage'));
const DashboardPage   = lazy(() => import('@/modules/dashboard/DashboardPage'));
const MembersPage     = lazy(() => import('@/modules/members/MembersPage'));
const MemberDetailPage= lazy(() => import('@/modules/members/MemberDetailPage'));
const CoachesPage     = lazy(() => import('@/modules/coaches/CoachesPage'));
const ProductsPage    = lazy(() => import('@/modules/products/ProductsPage'));
const PackagesPage    = lazy(() => import('@/modules/packages/PackagesPage'));
const BookingsPage    = lazy(() => import('@/modules/bookings/BookingsPage'));
const ProductSalesPage= lazy(() => import('@/modules/payments/ProductSalesPage'));
const MemberPaymentPage=lazy(() => import('@/modules/payments/MemberPaymentPage'));
const CommissionsPage = lazy(() => import('@/modules/commissions/CommissionsPage'));
const ReportsPage     = lazy(() => import('@/modules/reports/ReportsPage'));
const SettingsPage    = lazy(() => import('@/modules/settings/SettingsPage'));
const SuperAdminPage  = lazy(() => import('@/modules/superadmin/SuperAdminPage'));
const LicensesPage    = lazy(() => import('@/modules/superadmin/LicensesPage'));

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
  const { isAuthenticated, user } = useAuthStore();
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
  const { isAuthenticated, user } = useAuthStore();
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
