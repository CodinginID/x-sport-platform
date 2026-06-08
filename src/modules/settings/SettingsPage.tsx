import { useState } from 'react';
import { useLanguageStore } from '@/stores/language';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { useStaff } from '@/hooks/useStaff';
import { hashPassword } from '@/utils';
import { supabase } from '@/lib/supabase';
import { BackupSection } from './BackupSection';
import { StudioSection } from './StudioSection';
import { LicenseSection } from './LicenseSection';
import { PrinterSection } from './PrinterSection';
import { StaffSection } from './StaffSection';
import {
  ChevronRight, ChevronLeft, User, Building2, Printer, Globe,
  Users, ShieldCheck, HardDrive, Info, Eye, EyeOff, Loader2, Check,
} from 'lucide-react';

type SectionKey = 'account' | 'studio' | 'printer' | 'language' | 'staff' | 'license' | 'backup' | 'about';

// ─── Menu Item ────────────────────────────────────────────────────────────────

function MenuItem({
  icon: Icon, iconBg, label, subtitle, onClick, last = false,
}: {
  icon: React.ElementType; iconBg: string; label: string;
  subtitle?: string; onClick: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-zen-bg/60 active:bg-zen-bg transition-colors text-left ${!last ? 'border-b border-zen-ink/5' : ''}`}
    >
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{label}</p>
        {subtitle && <p className="text-[11px] text-zen-ink/40 truncate mt-0.5">{subtitle}</p>}
      </div>
      <ChevronRight size={16} className="text-zen-ink/25 shrink-0" />
    </button>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-2xl border border-zen-ink/10 flex items-center justify-center text-zen-ink/50 hover:bg-zen-bg transition-colors shrink-0"
      >
        <ChevronLeft size={18} />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

// ─── Account Section ──────────────────────────────────────────────────────────

function AccountSection() {
  const { user, studioId } = useAuthStore();
  const [editName, setEditName] = useState(false);
  const [editPw, setEditPw] = useState(false);
  const [name, setName] = useState(user?.full_name ?? '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const saveName = async () => {
    if (!name.trim() || !user) return;
    setSaving(true); setError('');
    // Update in users table (staff/owner after activation)
    if (studioId) {
      await supabase.from('users').update({ full_name: name.trim() })
        .eq('studio_id', studioId).eq('email', user.email);
    }
    // Update in license_users table (owner before activation)
    await supabase.from('license_users').update({ full_name: name.trim() }).eq('email', user.email);
    setSaving(false); setEditName(false);
    setMsg('Nama berhasil diubah');
    setTimeout(() => setMsg(''), 3000);
  };

  const savePassword = async () => {
    if (!newPw || !user) return;
    if (newPw.length < 6) { setError('Password minimal 6 karakter'); return; }
    setSaving(true); setError('');
    const hash = await hashPassword(newPw);
    if (studioId) {
      await supabase.from('users').update({ password_hash: hash })
        .eq('studio_id', studioId).eq('email', user.email);
    }
    await supabase.from('license_users').update({ password_hash: hash }).eq('email', user.email);
    setSaving(false); setEditPw(false); setOldPw(''); setNewPw('');
    setMsg('Password berhasil diubah');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-3">
      {/* Avatar + info */}
      <div className="bg-white rounded-3xl px-6 py-5 flex items-center gap-4 border border-zen-ink/5">
        <div className="w-14 h-14 rounded-3xl bg-zen-brand/10 flex items-center justify-center text-zen-brand font-bold text-xl shrink-0">
          {(user?.full_name ?? 'U')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate">{user?.full_name}</p>
          <p className="text-xs text-zen-ink/50 truncate mt-0.5">{user?.email}</p>
          <span className={`inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full mt-1 ${user?.role === 'owner' ? 'bg-zen-brand/10 text-zen-brand' : 'bg-zen-ink/5 text-zen-ink/50'}`}>
            {user?.role === 'owner' ? 'Owner' : 'Staff'}
          </span>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-xs font-bold text-green-700">
          <Check size={13} /> {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs font-bold text-red-600">{error}</div>
      )}

      {/* Edit name */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        <button
          onClick={() => { setEditName(v => !v); setEditPw(false); setError(''); }}
          className="w-full flex items-center justify-between px-5 py-4 text-left border-b border-zen-ink/5"
        >
          <div>
            <p className="text-sm font-bold">Nama Lengkap</p>
            <p className="text-[11px] text-zen-ink/40 mt-0.5">{user?.full_name}</p>
          </div>
          <span className="text-[10px] font-bold text-zen-brand">{editName ? 'Batal' : 'Ubah'}</span>
        </button>
        {editName && (
          <div className="px-5 py-4 space-y-3 bg-zen-bg/40 animate-page-in">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="Nama lengkap"
              className="w-full bg-white border border-zen-ink/10 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zen-brand/20"
            />
            <button
              onClick={saveName}
              disabled={saving || !name.trim()}
              className="w-full py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan Nama'}
            </button>
          </div>
        )}

        {/* Edit password */}
        <button
          onClick={() => { setEditPw(v => !v); setEditName(false); setError(''); }}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-bold">Password</p>
            <p className="text-[11px] text-zen-ink/40 mt-0.5">••••••••</p>
          </div>
          <span className="text-[10px] font-bold text-zen-brand">{editPw ? 'Batal' : 'Ubah'}</span>
        </button>
        {editPw && (
          <div className="px-5 pb-4 space-y-3 bg-zen-bg/40 animate-page-in">
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                autoFocus
                placeholder="Password baru (min. 6 karakter)"
                className="w-full bg-white border border-zen-ink/10 rounded-2xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 ring-zen-brand/20"
              />
              <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/30">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={savePassword}
              disabled={saving || !newPw}
              className="w-full py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Language Section ─────────────────────────────────────────────────────────

function LanguageSection() {
  const { lang, setLang } = useLanguageStore();
  return (
    <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
      {[
        { code: 'id' as const, flag: '🇮🇩', label: 'Bahasa Indonesia' },
        { code: 'en' as const, flag: '🇬🇧', label: 'English' },
      ].map(({ code, flag, label }, i, arr) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zen-bg/60 transition-colors ${i < arr.length - 1 ? 'border-b border-zen-ink/5' : ''}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{flag}</span>
            <span className="text-sm font-bold">{label}</span>
          </div>
          {lang === code && <Check size={16} className="text-zen-brand" />}
        </button>
      ))}
    </div>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  const rows = [
    { label: 'Versi', value: 'v1.0.0' },
    { label: 'Platform', value: 'PWA' },
    { label: 'Database', value: 'Supabase (PostgreSQL)' },
    { label: 'Build', value: '2026.06' },
  ];
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {rows.map(({ label, value }, i) => (
          <div key={label} className={`flex items-center justify-between px-5 py-4 ${i < rows.length - 1 ? 'border-b border-zen-ink/5' : ''}`}>
            <span className="text-sm text-zen-ink/50">{label}</span>
            <span className="text-sm font-bold">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-zen-ink/30 px-4">
        X-Sport Platform · Dibuat oleh CodinginID
      </p>
    </div>
  );
}

// ─── Section renderer ─────────────────────────────────────────────────────────

const SECTION_TITLES: Record<SectionKey, string> = {
  account:  'Akun',
  studio:   'Studio',
  printer:  'Printer Struk',
  language: 'Bahasa',
  staff:    'Manajemen Staff',
  license:  'Lisensi',
  backup:   'Backup & Restore',
  about:    'Tentang Aplikasi',
};

function SectionContent({ section }: { section: SectionKey }) {
  switch (section) {
    case 'account':  return <AccountSection />;
    case 'studio':   return <StudioSection />;
    case 'printer':  return <PrinterSection />;
    case 'language': return <LanguageSection />;
    case 'staff':    return <StaffSection />;
    case 'license':  return <LicenseSection />;
    case 'backup':   return <BackupSection />;
    case 'about':    return <AboutSection />;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<SectionKey | null>(null);
  const { user, licenseInfo } = useAuthStore();
  const { lang } = useLanguageStore();
  const { t } = useTranslation();
  const { data: staffList } = useStaff();

  // ── Section view ──
  if (active) {
    return (
      <div className="max-w-lg mx-auto animate-page-in">
        <SectionHeader title={SECTION_TITLES[active]} onBack={() => setActive(null)} />
        <SectionContent section={active} />
      </div>
    );
  }

  // ── Main menu ──
  const licenseStatus = !licenseInfo?.activated_at ? 'Demo'
    : new Date(licenseInfo.expires_at) < new Date() ? 'Expired'
    : 'Aktif';

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-page-in">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      {/* Profile preview */}
      <div
        onClick={() => setActive('account')}
        className="bg-white rounded-3xl px-5 py-4 flex items-center gap-4 border border-zen-ink/5 cursor-pointer hover:bg-zen-bg/40 active:bg-zen-bg transition-colors"
      >
        <div className="w-12 h-12 rounded-2xl bg-zen-brand/10 flex items-center justify-center text-zen-brand font-bold text-lg shrink-0">
          {(user?.full_name ?? 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{user?.full_name}</p>
          <p className="text-[11px] text-zen-ink/40 truncate">{user?.email}</p>
        </div>
        <ChevronRight size={16} className="text-zen-ink/25 shrink-0" />
      </div>

      {/* Group 1: Umum */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        <MenuItem icon={Building2} iconBg="bg-blue-100 text-blue-600"  label="Studio"       subtitle={licenseInfo?.studio_name ?? '—'} onClick={() => setActive('studio')}   />
        <MenuItem icon={Printer}   iconBg="bg-purple-100 text-purple-600" label="Printer Struk"  onClick={() => setActive('printer')}  />
        <MenuItem icon={Globe}     iconBg="bg-green-100 text-green-600"  label="Bahasa"       subtitle={lang === 'id' ? 'Indonesia' : 'English'} onClick={() => setActive('language')} last />
      </div>

      {/* Group 2: Owner only */}
      {user?.role === 'owner' && (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          <MenuItem icon={Users}      iconBg="bg-amber-100 text-amber-600"  label="Manajemen Staff" subtitle={`${staffList?.length ?? 0} akun`}    onClick={() => setActive('staff')}   />
          <MenuItem icon={ShieldCheck} iconBg="bg-zen-brand/10 text-zen-brand" label="Lisensi"      subtitle={licenseStatus}                        onClick={() => setActive('license')} last />
        </div>
      )}

      {/* Group 3: Data */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        <MenuItem icon={HardDrive} iconBg="bg-orange-100 text-orange-500" label="Backup & Restore" onClick={() => setActive('backup')} />
        <MenuItem icon={Info}      iconBg="bg-zen-ink/8 text-zen-ink/50"  label="Tentang Aplikasi" onClick={() => setActive('about')}  last />
      </div>
    </div>
  );
}
