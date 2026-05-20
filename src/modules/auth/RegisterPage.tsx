import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { registerStudio, type RegisterData } from '@/services/register';
import { Building2, User, Lock, Eye, EyeOff, CheckCircle2, ChevronRight, ChevronLeft, Copy, Check } from 'lucide-react';

const STEPS = [
  { icon: Building2, label: 'Studio' },
  { icon: User, label: 'Pemilik' },
  { icon: Lock, label: 'Keamanan' },
];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegisterData>({ studioName: '', studioAddress: '', ownerEmail: '', ownerPhone: '', ownerName: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ licenseKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (field: keyof RegisterData, value: string) => setForm(f => ({ ...f, [field]: value }));

  const validateStep = (): boolean => {
    setError('');
    if (step === 0) {
      if (!form.studioName) { setError('Nama studio wajib diisi'); return false; }
    } else if (step === 1) {
      if (!form.ownerName) { setError('Nama pemilik wajib diisi'); return false; }
      if (!form.ownerEmail) { setError('Email wajib diisi'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) { setError('Format email tidak valid'); return false; }
    } else if (step === 2) {
      if (form.password.length < 6) { setError('Password minimal 6 karakter'); return false; }
      if (form.password !== confirmPassword) { setError('Password tidak cocok'); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const prev = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    const res = await registerStudio(form);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setResult({ licenseKey: res.licenseKey });
  };

  const copyKey = () => {
    if (result) { navigator.clipboard.writeText(result.licenseKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // Success screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zen-bg p-6">
        <div className="max-w-md w-full">
          <div className="glass-card rounded-[48px] p-10 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_0.5s_ease-in-out]">
              <CheckCircle2 className="text-green-500" size={40} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Registrasi Berhasil! 🎉</h1>
            <p className="text-zen-ink/50 text-sm mb-8">Simpan license key Anda dengan aman</p>

            <div className="bg-zen-bg rounded-3xl p-6 mb-6 relative group cursor-pointer" onClick={copyKey}>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3">License Key</p>
              <p className="text-2xl font-mono font-bold tracking-[0.15em] text-zen-brand">{result.licenseKey}</p>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-zen-ink/40" />}
              </div>
            </div>

            <div className="bg-amber-50/80 rounded-2xl p-5 mb-8 text-left border border-amber-100">
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong className="block mb-1">⏳ Menunggu Persetujuan Admin</strong>
                Lisensi Anda akan diaktifkan dalam 1x24 jam. Kami akan menghubungi via <strong>{form.ownerEmail}</strong>
              </p>
            </div>

            <Link to="/login">
              <Button variant="primary" size="lg" className="w-full">Kembali ke Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zen-bg p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tighter text-zen-ink inline-block mb-4 hover:opacity-70 transition-opacity">
            X<span className="text-zen-brand italic">Sport</span>
          </Link>
          <h1 className="text-xl font-bold">Daftar Studio Baru</h1>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  i < step ? 'bg-green-500 text-white scale-90' :
                  i === step ? 'bg-zen-brand text-white scale-110 shadow-lg shadow-zen-brand/30' :
                  'bg-zen-ink/5 text-zen-ink/30'
                }`}>
                  {i < step ? <Check size={18} /> : <s.icon size={18} />}
                </div>
                <span className={`text-[9px] uppercase tracking-widest font-bold mt-2 transition-colors ${
                  i === step ? 'text-zen-brand' : 'text-zen-ink/30'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 mb-5 rounded-full transition-colors duration-300 ${i < step ? 'bg-green-500' : 'bg-zen-ink/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="glass-card rounded-[40px] p-8 overflow-hidden">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl mb-6 animate-[shake_0.3s_ease-in-out]">
              {error}
            </div>
          )}

          {/* Step content with slide animation */}
          <div className="min-h-[220px]">
            {step === 0 && (
              <div className="space-y-5 animate-page-in">
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-1">Informasi Studio</h2>
                  <p className="text-xs text-zen-ink/50">Ceritakan tentang studio Anda</p>
                </div>
                <Input label="Nama Studio" placeholder="Contoh: Zenith Pilates Studio" value={form.studioName} onChange={e => update('studioName', e.target.value)} required />
                <Input label="Alamat (opsional)" placeholder="Jl. Sudirman No. 10, Jakarta" value={form.studioAddress} onChange={e => update('studioAddress', e.target.value)} />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5 animate-page-in">
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-1">Data Pemilik</h2>
                  <p className="text-xs text-zen-ink/50">Informasi kontak untuk akun Anda</p>
                </div>
                <Input label="Nama Lengkap" placeholder="Budi Santoso" value={form.ownerName} onChange={e => update('ownerName', e.target.value)} required />
                <Input label="Email" type="email" placeholder="budi@gmail.com" value={form.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} required />
                <Input label="No. HP (opsional)" type="tel" placeholder="081234567890" value={form.ownerPhone} onChange={e => update('ownerPhone', e.target.value)} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-page-in">
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-1">Buat Password</h2>
                  <p className="text-xs text-zen-ink/50">Password untuk login ke aplikasi</p>
                </div>
                <div className="relative">
                  <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="Minimal 6 karakter" value={form.password} onChange={e => update('password', e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-8 text-zen-ink/40 hover:text-zen-ink transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Input label="Konfirmasi Password" type={showPassword ? 'text' : 'password'} placeholder="Ketik ulang password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                {form.password && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        form.password.length >= i * 3 ? (form.password.length >= 10 ? 'bg-green-400' : form.password.length >= 6 ? 'bg-amber-400' : 'bg-red-400') : 'bg-zen-ink/10'
                      }`} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="ghost" size="lg" onClick={prev} className="flex items-center gap-1">
                <ChevronLeft size={16} /> Kembali
              </Button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <Button variant="primary" size="lg" onClick={next} className="flex items-center gap-1">
                Lanjut <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={handleSubmit} disabled={loading} className="flex items-center gap-1">
                {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
              </Button>
            )}
          </div>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-zen-ink/50 mt-6">
          Sudah punya akun? <Link to="/login" className="text-zen-brand font-bold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
