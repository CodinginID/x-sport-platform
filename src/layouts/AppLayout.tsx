import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { cn } from '@/utils';
import {
  LayoutDashboard, Users, UserCheck, Package, ShoppingBag,
  Calendar, CreditCard, PieChart, DollarSign, LogOut, MoreHorizontal, Settings, ShieldCheck,
} from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  useSessionTimeout();
  const isOwner = user?.role === 'owner';

  const allNavItems = [
    { label: t('nav.dashboard'), icon: LayoutDashboard, path: '/dashboard', roles: ['owner', 'staff'] },
    { label: t('nav.members'), icon: Users, path: '/members', roles: ['owner', 'staff'] },
    { label: t('nav.coaches'), icon: UserCheck, path: '/coaches', roles: ['owner', 'staff'] },
    { label: t('nav.products'), icon: ShoppingBag, path: '/products', roles: ['owner', 'staff'] },
    { label: t('nav.packages'), icon: Package, path: '/packages', roles: ['owner', 'staff'] },
    { label: t('nav.bookings'), icon: Calendar, path: '/bookings', roles: ['owner', 'staff'] },
    { label: t('nav.sales'), icon: CreditCard, path: '/sales', roles: ['owner', 'staff'] },
    { label: t('nav.payments'), icon: CreditCard, path: '/payments', roles: ['owner', 'staff'] },
    { label: t('nav.commissions'), icon: DollarSign, path: '/commissions', roles: ['owner'] },
    { label: t('nav.reports'), icon: PieChart, path: '/reports', roles: ['owner'] },
    { label: t('nav.settings'), icon: Settings, path: '/settings', roles: ['owner', 'staff'] },
    { label: 'Manajemen Lisensi', icon: ShieldCheck, path: '/licenses', roles: ['superadmin'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role || 'staff'));
  const primaryNav = navItems.slice(0, 4);
  const secondaryNav = navItems.slice(4);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-zen-bg font-sans">
      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-zen-brand focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 z-50 h-full w-[240px] bg-white/80 backdrop-blur-xl border-r border-white/20 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zen-brand/5">
          <span className="text-xl font-bold tracking-tighter">X<span className="text-zen-brand italic">Sport</span></span>
        </div>
        <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-4 min-h-[44px] rounded-2xl text-xs uppercase tracking-widest font-bold transition-all mb-1',
                  active ? 'bg-zen-brand text-white shadow-lg shadow-zen-brand/20' : 'text-zen-ink/50 hover:bg-zen-brand/5 hover:text-zen-ink'
                )}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zen-brand/5 p-4 space-y-3">
          {user && (
            <div className="text-xs uppercase tracking-widest font-bold opacity-60 truncate">
              {user.full_name} • {isOwner ? 'Owner' : 'Staff'}
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-500 min-h-[44px] w-full transition-colors">
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" role="main" className="lg:ml-[240px] pt-4 lg:pt-8 pb-24 lg:pb-8 px-4 lg:px-6">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav role="navigation" aria-label="Bottom navigation" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/90 backdrop-blur-xl border-t border-zen-brand/5 pwa-bottom-safe">
        <div className="h-16 px-2 flex items-center justify-around">
          {primaryNav.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}
                aria-current={active ? 'page' : undefined}
                className={cn('flex flex-col items-center justify-center min-h-[44px] min-w-[48px] rounded-xl transition-all', active ? 'text-zen-brand' : 'text-zen-ink/40')}>
                <item.icon size={20} />
                <span className={cn('text-[10px] mt-0.5 font-bold', active ? 'text-zen-brand' : 'text-zen-ink/30')}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)}
            className={cn('flex flex-col items-center justify-center min-h-[44px] min-w-[48px] rounded-xl transition-all', moreOpen ? 'text-zen-brand' : 'text-zen-ink/40')}>
            <MoreHorizontal size={20} />
            <span className="text-[10px] mt-0.5 font-bold text-zen-ink/30">{t('nav.more')}</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-zen-ink/20 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden animate-slide-up">
            <div className="bg-white rounded-t-[32px] shadow-2xl px-6 pt-4 pb-8 pwa-bottom-safe">
              <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto mb-6" />
              <div className="grid grid-cols-4 gap-4 mb-6">
                {secondaryNav.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMoreOpen(false)}
                      className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-h-[72px] justify-center', active ? 'bg-zen-brand/10 text-zen-brand' : 'text-zen-ink/60 hover:bg-zen-bg')}>
                      <item.icon size={22} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="border-t border-zen-brand/5 pt-4 flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest font-bold text-zen-ink/60">{user?.full_name} • {isOwner ? 'Owner' : 'Staff'}</div>
                <button onClick={() => { handleLogout(); setMoreOpen(false); }}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-red-400 min-h-[44px]">
                  <LogOut size={14} /> {t('nav.logout')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
