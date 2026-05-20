import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/stores/auth';
import { ToastContainer } from '@/components/Toast';
import { ConfirmDialogProvider } from '@/components/ConfirmDialog';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { InstallPWA } from '@/components/InstallPWA';
import { LicenseGuard } from '@/components/LicenseGuard';
import AppLayout from '@/layouts/AppLayout';

const LandingPage = lazy(() => import('@/modules/landing/LandingPage'));
const LoginPage = lazy(() => import('@/modules/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/modules/auth/RegisterPage'));
const ActivationPage = lazy(() => import('@/modules/activation/ActivationPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/DashboardPage'));
const MembersPage = lazy(() => import('@/modules/members/MembersPage'));
const MemberDetailPage = lazy(() => import('@/modules/members/MemberDetailPage'));
const CoachesPage = lazy(() => import('@/modules/coaches/CoachesPage'));
const ProductsPage = lazy(() => import('@/modules/products/ProductsPage'));
const PackagesPage = lazy(() => import('@/modules/packages/PackagesPage'));
const BookingsPage = lazy(() => import('@/modules/bookings/BookingsPage'));
const ProductSalesPage = lazy(() => import('@/modules/payments/ProductSalesPage'));
const MemberPaymentPage = lazy(() => import('@/modules/payments/MemberPaymentPage'));
const CommissionsPage = lazy(() => import('@/modules/commissions/CommissionsPage'));
const ReportsPage = lazy(() => import('@/modules/reports/ReportsPage'));
const SettingsPage = lazy(() => import('@/modules/settings/SettingsPage'));
const SuperAdminPage = lazy(() => import('@/modules/superadmin/SuperAdminPage'));
const LicensesPage = lazy(() => import('@/modules/superadmin/LicensesPage'));

function ProtectedRoute({ children, ownerOnly, superadminOnly, skipLicenseGuard }: { children: React.ReactNode; ownerOnly?: boolean; superadminOnly?: boolean; skipLicenseGuard?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (ownerOnly && user?.role !== 'owner') return <Navigate to="/dashboard" replace />;
  if (superadminOnly && user?.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  if (skipLicenseGuard || user?.role === 'superadmin') return <AppLayout>{children}</AppLayout>;
  return <AppLayout><LicenseGuard>{children}</LicenseGuard></AppLayout>;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-zen-brand/20 border-t-zen-brand rounded-full animate-spin" /></div>}>
      <div className="animate-page-in">
        {children}
      </div>
    </Suspense>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route path="/activation" element={<ProtectedRoute ownerOnly skipLicenseGuard><PageTransition><ActivationPage /></PageTransition></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><PageTransition><MembersPage /></PageTransition></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute><PageTransition><MemberDetailPage /></PageTransition></ProtectedRoute>} />
        <Route path="/coaches" element={<ProtectedRoute><PageTransition><CoachesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><PageTransition><ProductsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/packages" element={<ProtectedRoute><PageTransition><PackagesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><PageTransition><BookingsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><PageTransition><ProductSalesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PageTransition><MemberPaymentPage /></PageTransition></ProtectedRoute>} />
        <Route path="/commissions" element={<ProtectedRoute ownerOnly><PageTransition><CommissionsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute ownerOnly><PageTransition><ReportsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/licenses" element={<ProtectedRoute superadminOnly><PageTransition><LicensesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/superadmin" element={<PageTransition><SuperAdminPage /></PageTransition>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <ToastContainer />
      <ConfirmDialogProvider />
      <OfflineIndicator />
      <InstallPWA />
    </BrowserRouter>
  );
}
