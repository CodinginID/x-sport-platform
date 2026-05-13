import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { Button, Input } from '@/components/ui';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@studio.com');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password, rememberMe);
    setLoading(false);
    if (ok) navigate('/dashboard');
    else setError(t('login.error'));
  };

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

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input label={t('login.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <div className="relative">
              <Input label={t('login.password')} type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
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

          <div className="mt-12 p-6 bg-zen-bg rounded-3xl border border-zen-brand/5">
            <p className="text-[10px] uppercase tracking-widest opacity-30 font-bold mb-2">Demo Login</p>
            <p className="text-xs font-mono opacity-60">{t('login.demo')}</p>
          </div>
        </div>

        <div className="hidden md:block relative bg-zen-brand/5">
          <img src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=1200" alt="Studio" className="absolute inset-0 w-full h-full object-cover grayscale-[20%]" />
          <div className="absolute inset-0 bg-zen-brand/30 mix-blend-multiply" />
        </div>
      </div>
    </div>
  );
}
