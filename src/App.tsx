import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/layouts/AppLayout';
import LandingPage from '@/modules/landing/LandingPage';
import LoginPage from '@/modules/auth/LoginPage';
import DashboardPage from '@/modules/dashboard/DashboardPage';
import MembersPage from '@/modules/members/MembersPage';
import MemberDetailPage from '@/modules/members/MemberDetailPage';
import CoachesPage from '@/modules/coaches/CoachesPage';
import ProductsPage from '@/modules/products/ProductsPage';
import PackagesPage from '@/modules/packages/PackagesPage';
import BookingsPage from '@/modules/bookings/BookingsPage';
import ProductSalesPage from '@/modules/payments/ProductSalesPage';
import MemberPaymentPage from '@/modules/payments/MemberPaymentPage';
import CommissionsPage from '@/modules/commissions/CommissionsPage';
import ReportsPage from '@/modules/reports/ReportsPage';
import SettingsPage from '@/modules/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><PageTransition><MembersPage /></PageTransition></ProtectedRoute>} />
        <Route path="/members/:id" element={<ProtectedRoute><PageTransition><MemberDetailPage /></PageTransition></ProtectedRoute>} />
        <Route path="/coaches" element={<ProtectedRoute><PageTransition><CoachesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><PageTransition><ProductsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/packages" element={<ProtectedRoute><PageTransition><PackagesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/bookings" element={<ProtectedRoute><PageTransition><BookingsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><PageTransition><ProductSalesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PageTransition><MemberPaymentPage /></PageTransition></ProtectedRoute>} />
        <Route path="/commissions" element={<ProtectedRoute><PageTransition><CommissionsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><PageTransition><ReportsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
