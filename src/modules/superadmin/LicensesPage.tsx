import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, X, AlertTriangle, LayoutDashboard, ListChecks, Settings } from 'lucide-react';
import type { FeatureEntry } from '@/types';
import {
  getLicenseState, daysUntil, getSessionStatus,
} from './types';
import type { License, LicenseRow, SessionRow } from './types';
import SuperDashboardTab from './tabs/SuperDashboardTab';
import LicenseListTab, { LicenseKeyModal, ConfirmSheet } from './tabs/LicenseListTab';
import SettingsTab from './tabs/SettingsTab';

type Tab = 'dashboard' | 'licenses' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'licenses',  label: 'Lisensi',   icon: <ListChecks size={14} /> },
  { id: 'settings',  label: 'Pengaturan',icon: <Settings size={14} /> },
];

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedLicense, setApprovedLicense] = useState<License | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: React.ReactNode; variant: 'danger' | 'warning'; onConfirm: () => void;
  }>({ open: false, title: '', message: '', variant: 'warning', onConfirm: () => {} });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [licRes, sessRes] = await Promise.all([
      supabase
        .from('licenses')
        .select('id, license_key, studio_name, owner_email, owner_phone, plan, created_at, expires_at, activated_at, is_active, disabled_at, storage_quota_mb, storage_used_mb, features')
        .order('is_active', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase
        .from('sessions')
        .select('studio_id, last_used_at, expires_at, user_email, user_full_name')
        .order('last_used_at', { ascending: false }),
    ]);
    if (licRes.error) setError('Gagal memuat lisensi: ' + licRes.error.message);
    else setLicenses((licRes.data as License[]) ?? []);
    if (!sessRes.error) setSessions((sessRes.data as SessionRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build rows with session data
  const rows: LicenseRow[] = licenses.map(lic => {
    const mySessions = sessions.filter(s => s.studio_id === lic.id);
    // Pick the most recently used session
    const latest = mySessions.sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime())[0];
    const status = getSessionStatus(latest?.last_used_at ?? null, latest?.expires_at ?? null);
    return {
      ...lic,
      sessionStatus: status,
      sessionLastUsed: latest?.last_used_at ?? null,
      sessionUser: latest?.user_full_name ?? latest?.user_email ?? null,
      sessionCount: mySessions.length,
      state: getLicenseState(lic),
    };
  });

  const writeFeature = async (lic: LicenseRow, key: string, entry: FeatureEntry | null) => {
    const cur: Record<string, FeatureEntry> = (lic.features && typeof lic.features === 'object') ? { ...lic.features } : {};
    if (entry === null) delete cur[key];
    else cur[key] = entry;
    const { error: updErr } = await supabase.from('licenses').update({ features: cur }).eq('id', lic.id);
    if (updErr) { setError('Gagal ubah fitur: ' + updErr.message); return; }
    await fetchAll();
  };
  const handleActivateFeature = (lic: LicenseRow, key: string) => writeFeature(lic, key, { status: 'active' });
  // Cabut: bukan hapus entry — simpan jejak trial_used agar studio tidak bisa trial gratis lagi (harus bayar).
  const handleRevokeFeature = (lic: LicenseRow, key: string) => {
    const prev = lic.features?.[key];
    writeFeature(lic, key, { status: 'trial', trial_ends_at: '2000-01-01T00:00:00Z', trial_used: prev?.trial_used ?? true });
  };

  const handleApprove = (lic: LicenseRow) => {
    setConfirm({
      open: true,
      title: 'Setujui Lisensi?',
      message: `Aktifkan lisensi untuk "${lic.studio_name || lic.owner_email}"?`,
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(lic.id);
        const { error: updateErr } = await supabase.from('licenses').update({ is_active: true }).eq('id', lic.id);
        if (updateErr) { setError('Gagal approve: ' + updateErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
        setApprovedLicense({ ...lic, is_active: true });
      },
    });
  };

  const handleReject = (lic: LicenseRow) => {
    setConfirm({
      open: true,
      title: 'Tolak & Hapus?',
      message: `Hapus pendaftaran "${lic.studio_name || lic.owner_email}"? Tidak bisa dibatalkan.`,
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(lic.id);
        const { error: delErr } = await supabase.from('licenses').delete().eq('id', lic.id);
        if (delErr) { setError('Gagal hapus: ' + delErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
      },
    });
  };

  const handleDisable = (lic: LicenseRow) => {
    const hasSession = lic.sessionCount > 0;
    setConfirm({
      open: true,
      title: 'Nonaktifkan Lisensi?',
      message: `Lisensi "${lic.studio_name || lic.owner_email}" akan dinonaktifkan.${hasSession ? ' Studio yang sedang login akan otomatis logout.' : ''} Owner tidak bisa login sampai diaktifkan kembali.`,
      variant: 'danger',
      onConfirm: async () => {
        setActionLoading(lic.id);
        // Hapus semua sesi aktif untuk studio ini
        await supabase.from('sessions').delete().eq('studio_id', lic.id);
        // Set is_active=false dan catat disabled_at
        const { error: updErr } = await supabase.from('licenses')
          .update({ is_active: false, disabled_at: new Date().toISOString() })
          .eq('id', lic.id);
        if (updErr) { setError('Gagal nonaktifkan: ' + updErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
      },
    });
  };

  const handleEnable = (lic: LicenseRow) => {
    setConfirm({
      open: true,
      title: 'Aktifkan Kembali?',
      message: `Aktifkan lisensi "${lic.studio_name || lic.owner_email}"? Owner akan bisa login kembali.`,
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(lic.id);
        const { error: updErr } = await supabase.from('licenses')
          .update({ is_active: true, disabled_at: null })
          .eq('id', lic.id);
        if (updErr) { setError('Gagal aktifkan: ' + updErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
      },
    });
  };

  const handleForceLogout = (lic: LicenseRow) => {
    setConfirm({
      open: true,
      title: 'Paksa Logout Semua Perangkat?',
      message: `Semua sesi aktif "${lic.studio_name || lic.owner_email}" akan dihapus. Perangkat yang sedang dipakai akan otomatis logout. Lisensi tetap aktif — owner bisa login kembali kapan saja.`,
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(lic.id);
        const { error: delErr } = await supabase.from('sessions').delete().eq('studio_id', lic.id);
        if (delErr) { setError('Gagal logout: ' + delErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
      },
    });
  };

  const handleResetActivation = (lic: LicenseRow) => {
    const studioLabel = lic.studio_name || lic.owner_email;
    setConfirm({
      open: true,
      title: 'Reset Aktivasi?',
      message: (
        <div className="space-y-3">
          <p>Reset aktivasi untuk <span className="font-semibold text-zen-ink">{studioLabel}</span>. Tindakan ini akan:</p>
          <ul className="space-y-2">
            {[
              'Hapus semua sesi aktif (otomatis logout)',
              'Hapus akun staff dari tabel users dan license_users',
              'Kembalikan lisensi ke status belum diaktivasi',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs bg-amber-50 text-amber-700 rounded-xl px-3 py-2 leading-relaxed">
            Lisensi tetap aktif & approved. Owner harus aktivasi ulang dari halaman Lisensi.
          </p>
        </div>
      ),
      variant: 'warning',
      onConfirm: async () => {
        setActionLoading(lic.id);
        // 1. Hapus semua sesi
        await supabase.from('sessions').delete().eq('studio_id', lic.id);
        // 2. Hapus semua user dari tabel users
        await supabase.from('users').delete().eq('studio_id', lic.id);
        // 3. Hapus akun staff dari license_users (owner tetap agar bisa login kembali)
        await supabase.from('license_users').delete().eq('license_id', lic.id).eq('role', 'staff');
        // 4. Reset status aktivasi di licenses
        const { error: updErr } = await supabase.from('licenses')
          .update({ activated_at: null, device_fingerprint: null, last_validated_at: null })
          .eq('id', lic.id);
        if (updErr) { setError('Gagal reset: ' + updErr.message); setActionLoading(null); return; }
        await fetchAll();
        setActionLoading(null);
      },
    });
  };

  const handleCopyKey = (row: LicenseRow) => {
    navigator.clipboard.writeText(row.license_key);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId(id => id === row.id ? null : id), 2000);
  };

  return (
    <div className="space-y-5 pb-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Lisensi</h1>
          <p className="text-xs text-zen-ink/40 mt-0.5">{loading ? '...' : `${licenses.length} studio terdaftar`}</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="w-10 h-10 rounded-2xl border border-zen-ink/10 flex items-center justify-center text-zen-ink/50 hover:bg-zen-bg transition-colors disabled:opacity-40">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={15} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-zen-bg rounded-2xl p-1 max-w-md">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-xl transition-all ${tab === t.id ? 'bg-white text-zen-ink shadow-sm' : 'text-zen-ink/40'}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Active tab ── */}
      {tab === 'dashboard' && <SuperDashboardTab rows={rows} loading={loading} />}
      {tab === 'licenses' && (
        <LicenseListTab
          rows={rows}
          sessions={sessions}
          loading={loading}
          licensesCount={licenses.length}
          actionLoading={actionLoading}
          copiedId={copiedId}
          onApprove={handleApprove}
          onReject={handleReject}
          onDisable={handleDisable}
          onEnable={handleEnable}
          onForceLogout={handleForceLogout}
          onResetActivation={handleResetActivation}
          onCopyKey={handleCopyKey}
          onActivateFeature={handleActivateFeature}
          onRevokeFeature={handleRevokeFeature}
        />
      )}
      {tab === 'settings' && <SettingsTab />}

      {/* ── Modals ── */}
      {confirm.open && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.message}
          variant={confirm.variant}
          onConfirm={() => { setConfirm(p => ({ ...p, open: false })); confirm.onConfirm(); }}
          onCancel={() => setConfirm(p => ({ ...p, open: false }))}
        />
      )}
      {approvedLicense && (
        <LicenseKeyModal
          licenseKey={approvedLicense.license_key}
          studioName={approvedLicense.studio_name}
          onClose={() => setApprovedLicense(null)}
        />
      )}
    </div>
  );
}
