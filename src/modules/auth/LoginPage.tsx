import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button, Input } from '@/components/ui';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { db } from '@/database/db';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userFound, setUserFound] = useState<{ full_name: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;

    // Check superadmin email from env
    const adminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL as string | undefined;
    if (adminEmail) {
      const match = email.trim() === adminEmail || email.trim() === adminEmail.split('@')[0];
      if (match) { setUserFound({ full_name: 'Super Admin' }); return; }
    }

    setLoading(true);
    let user = await db.users.where('email').equals(email.trim()).first();
    if (!user) {
      const allUsers = await db.users.toArray();
      user = allUsers.find(u => u.email.split('@')[0] === email.trim());
    }
    setLoading(false);

    if (!user) { setError('Akun tidak ditemukan'); return; }
    setUserFound({ full_name: user.full_name });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email.trim(), password, rememberMe);
    setLoading(false);
    if (!ok) { setError('Password salah'); return; }
    const role = useAuthStore.getState().user?.role;
    navigate(role === 'superadmin' ? '/licenses' : '/dashboard');
  };

  const resetToEmail = () => { setUserFound(null); setPassword(''); setError(''); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zen-bg p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 glass-card rounded-[48px] overflow-hidden">
        <div className="p-12 md:p-16 flex flex-col justify-center bg-white">
          <header className="mb-12">
            <Link to="/" className="text-4xl font-bold tracking-tighter text-zen-ink mb-2 block hover:opacity-70 transition-opacity">
              X<span className="text-zen-brand italic">Sport</span> Platform
            </Link>
            <p className="text-zen-ink/50 font-medium italic">{t('login.subtitle')}</p>
          </header>

          {error && <div className="bg-red-50 text-red-600 text-xs font-bold uppercase tracking-widest p-4 rounded-2xl mb-6">{error}</div>}

          {!userFound ? (
            /* Step 1: Email/username */
            <form onSubmit={handleCheckEmail} className="space-y-6 animate-page-in">
              <Input label={t('login.email')} type="text" placeholder="Email atau username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Mencari...' : 'Lanjut'}
              </Button>
            </form>
          ) : (
            /* Step 2: Password */
            <form onSubmit={handleLogin} className="space-y-6 animate-page-in">
              <div className="flex items-center gap-3 p-4 bg-zen-bg rounded-2xl">
                <button type="button" onClick={resetToEmail} className="text-zen-ink/40 hover:text-zen-ink transition-colors">
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <p className="text-sm font-bold">{userFound.full_name}</p>
                  <p className="text-xs text-zen-ink/50">{email}</p>
                </div>
              </div>
              <div className="relative">
                <Input label={t('login.password')} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-8 text-zen-ink/40 hover:text-zen-ink transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded" />
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{t('login.remember')}</span>
              </label>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t('login.loading') : t('login.submit')}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-zen-ink/50 mt-8">
            Belum punya akun? <Link to="/register" className="text-zen-brand font-bold">Daftar Studio</Link>
          </p>
        </div>

        <div className="hidden md:block relative bg-zen-brand/5">
          <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=1200" alt="Studio" className="absolute inset-0 w-full h-full object-cover grayscale-[20%]" />
          <div className="absolute inset-0 bg-zen-brand/30 mix-blend-multiply" />
        </div>
      </div>
    </div>
  );
}
