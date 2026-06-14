import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/utils';
import {
  RefreshCw, Check, Copy, X, Loader2, CheckCircle2, XCircle,
  Clock, AlertTriangle, Mail, Phone, KeyRound, Building2,
  Search, Wifi, WifiOff, Calendar, ChevronDown, ChevronUp,
  CircleDot, HardDrive, Package, ShieldOff, ShieldCheck, LogOut, RotateCcw,
  Users, Eye, EyeOff, Info, Sparkles,
} from 'lucide-react';
import { FEATURES, FEATURE_KEYS } from '@/config/features';
import { featureState } from '@/lib/featureState';
import type { FeatureEntry } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface License {
  id: string;
  license_key: string;
  studio_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  plan: string | null;
  created_at: string;
  expires_at: string;
  activated_at: string | null;
  is_active: boolean;
  disabled_at: string | null;
  storage_quota_mb: number;
  storage_used_mb: number;
  features?: Record<string, FeatureEntry>;
}

// 3 distinct states for a license:
// 'pending'  — is_active=false, disabled_at=null  → waiting for admin approval
// 'active'   — is_active=true                     → approved and in use
// 'disabled' — is_active=false, disabled_at!=null → manually disabled by superadmin
type LicenseState = 'pending' | 'active' | 'disabled';

function getLicenseState(lic: License): LicenseState {
  if (lic.is_active) return 'active';
  if (lic.disabled_at) return 'disabled';
  return 'pending';
}

interface SessionRow {
  studio_id: string;
  last_used_at: string;
  expires_at: string;
  user_email: string;
  user_full_name: string;
}

type SessionStatus = 'online' | 'today' | 'recent' | 'idle' | 'none';

interface LicenseRow extends License {
  sessionStatus: SessionStatus;
  sessionLastUsed: string | null;
  sessionUser: string | null;
  sessionCount: number;
  state: LicenseState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function getSessionStatus(lastUsed: string | null, sessionExpires: string | null): SessionStatus {
  if (!lastUsed || !sessionExpires) return 'none';
  if (new Date(sessionExpires) < new Date()) return 'idle';
  const minAgo = (Date.now() - new Date(lastUsed).getTime()) / 60_000;
  if (minAgo < 30) return 'online';
  if (minAgo < 60 * 24) return 'today';
  if (minAgo < 60 * 24 * 7) return 'recent';
  return 'idle';
}

const SESSION_CONFIG: Record<SessionStatus, { label: string; dot: string; text: string }> = {
  online: { label: 'Online',        dot: 'bg-green-500 animate-pulse', text: 'text-green-600' },
  today:  { label: 'Aktif hari ini',dot: 'bg-amber-400',               text: 'text-amber-600' },
  recent: { label: 'Aktif minggu ini', dot: 'bg-blue-400',             text: 'text-blue-600'  },
  idle:   { label: 'Tidak aktif',   dot: 'bg-zen-ink/20',              text: 'text-zen-ink/40' },
  none:   { label: 'Belum login',   dot: 'bg-zen-ink/10',              text: 'text-zen-ink/30' },
};

// ─── License Key Modal ────────────────────────────────────────────────────────

function LicenseKeyModal({ licenseKey, studioName, onClose }: {
  licenseKey: string; studioName: string | null; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(licenseKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[32px] rounded-t-[32px] p-8 space-y-6 animate-slide-up sm:animate-page-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-2 mb-2" />
        <div className="text-center">
          <div className="w-16 h-16 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">Lisensi Disetujui</p>
          <h2 className="text-lg font-bold">{studioName || 'Studio'}</h2>
        </div>
        <button onClick={copy} className="w-full bg-zen-bg rounded-2xl p-5 relative group active:scale-[0.98] transition-transform cursor-pointer text-left">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-2">License Key</p>
          <p className="text-lg font-mono font-bold tracking-[0.1em] text-zen-brand break-all pr-8">{licenseKey}</p>
          <div className="absolute top-4 right-4 text-zen-ink/30">
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </div>
        </button>
        <p className="text-xs text-center text-zen-ink/40">Tap untuk menyalin, lalu kirim ke studio owner.</p>
        <button onClick={onClose} className="w-full py-4 bg-zen-brand text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-transform min-h-[52px]">
          Selesai
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── Confirm Sheet ────────────────────────────────────────────────────────────

function ConfirmSheet({ title, message, variant, onConfirm, onCancel }: {
  title: string; message: React.ReactNode; variant: 'danger' | 'warning'; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={onCancel}>
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[24px] rounded-t-[24px] p-6 space-y-4 animate-slide-up sm:animate-page-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden" />
        <h2 className="text-base font-bold pt-1">{title}</h2>
        <div className="text-sm text-zen-ink/60 leading-relaxed">{message}</div>
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={onConfirm} className={`w-full py-4 text-sm font-bold rounded-2xl text-white min-h-[52px] active:scale-[0.98] transition-transform ${variant === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`}>
            {variant === 'danger' ? 'Ya, Hapus' : 'Ya, Setujui'}
          </button>
          <button onClick={onCancel} className="w-full py-4 text-sm font-bold rounded-2xl border border-zen-ink/10 text-zen-ink/60 min-h-[52px] active:scale-[0.98] transition-transform">
            Batal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Session Detail Drawer ────────────────────────────────────────────────────

function SessionDrawer({ license, sessions, onClose }: {
  license: LicenseRow; sessions: SessionRow[]; onClose: () => void;
}) {
  const mySessions = sessions
    .filter(s => s.studio_id === license.id)
    .sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime());

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-5 max-h-[80vh] overflow-y-auto animate-slide-up sm:animate-page-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-1" />
        <div>
          <h2 className="text-base font-bold">{license.studio_name || 'Studio'}</h2>
          <p className="text-xs text-zen-ink/40 mt-0.5">Riwayat sesi aktif</p>
        </div>

        {mySessions.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff size={28} className="text-zen-ink/20 mx-auto mb-2" />
            <p className="text-sm text-zen-ink/40">Tidak ada sesi aktif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySessions.map((s, i) => {
              const status = getSessionStatus(s.last_used_at, s.expires_at);
              const cfg = SESSION_CONFIG[status];
              const expired = new Date(s.expires_at) < new Date();
              return (
                <div key={i} className={`rounded-2xl p-4 border ${expired ? 'bg-zen-bg border-zen-ink/5 opacity-50' : 'bg-white border-zen-ink/10'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${cfg.text}`}>
                        {expired ? 'Kedaluwarsa' : cfg.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-zen-ink/40">{timeAgo(s.last_used_at)}</span>
                  </div>
                  <p className="text-sm font-bold truncate">{s.user_full_name}</p>
                  <p className="text-xs text-zen-ink/50 truncate">{s.user_email}</p>
                  <p className="text-[10px] text-zen-ink/30 mt-1">
                    Berakhir: {formatDate(s.expires_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onClose} className="w-full py-3.5 border border-zen-ink/10 text-zen-ink/60 text-sm font-bold rounded-2xl min-h-[48px]">
          Tutup
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── License Row (table row) ──────────────────────────────────────────────────

function LicenseTableRow({ row, onApprove, onReject, onDisable, onEnable, onForceLogout, onResetActivation, onCopyKey, onShowSessions, onActivateFeature, onRevokeFeature, isProcessing, copiedId }: {
  row: LicenseRow;
  onApprove: () => void;
  onReject: () => void;
  onDisable: () => void;
  onEnable: () => void;
  onForceLogout: () => void;
  onResetActivation: () => void;
  onCopyKey: () => void;
  onShowSessions: () => void;
  onActivateFeature: (key: string) => void;
  onRevokeFeature: (key: string) => void;
  isProcessing: boolean;
  copiedId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const state = getLicenseState(row);
  const days = daysUntil(row.expires_at);
  const cfg = SESSION_CONFIG[row.sessionStatus];
  const isCopied = copiedId === row.id;
  const pct = row.storage_quota_mb ? Math.min(100, Math.round((row.storage_used_mb / row.storage_quota_mb) * 100)) : 0;

  const rowBg =
    state === 'pending'  ? 'bg-amber-50/60' :
    state === 'disabled' ? 'bg-red-50/40'   : '';

  return (
    <>
      {/* ─ Main row ─ */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 border-b border-zen-ink/5 transition-colors cursor-pointer hover:bg-zen-bg/60 ${rowBg}`}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status icon */}
        <div className="shrink-0 w-8 flex justify-center">
          {state === 'pending'  && <Clock    size={15} className="text-amber-500" />}
          {state === 'disabled' && <ShieldOff size={15} className="text-red-400" />}
          {state === 'active'   && <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />}
        </div>

        {/* Studio */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-bold truncate ${state === 'disabled' ? 'text-zen-ink/40 line-through' : ''}`}>
              {row.studio_name || <span className="italic font-normal text-zen-ink/30">Tanpa nama</span>}
            </p>
            {state === 'disabled' && (
              <span className="shrink-0 text-[9px] uppercase tracking-widest font-bold text-red-400 bg-red-100 px-1.5 py-0.5 rounded-full">
                Dinonaktifkan
              </span>
            )}
          </div>
          <p className="text-[11px] text-zen-ink/40 truncate">{row.owner_email}</p>
        </div>

        {/* Plan badge */}
        <div className="hidden sm:block shrink-0">
          <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${state === 'disabled' ? 'text-zen-ink/30 bg-zen-ink/5' : 'text-zen-brand bg-zen-brand/10'}`}>
            {row.plan || 'basic'}
          </span>
        </div>

        {/* Session status */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 w-28">
          {state === 'pending' && <span className="text-[11px] text-amber-500 font-bold">Menunggu</span>}
          {state === 'disabled' && <span className="text-[11px] text-red-400 font-bold">Nonaktif</span>}
          {state === 'active' && (
            <>
              <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className={`text-[11px] font-bold ${cfg.text}`}>{cfg.label}</span>
            </>
          )}
        </div>

        {/* Expiry */}
        <div className="hidden lg:block shrink-0 w-24 text-right">
          {state === 'pending' ? (
            <span className="text-[11px] text-amber-500 font-bold">—</span>
          ) : (
            <span className={`text-[11px] font-bold ${days < 0 ? 'text-red-500' : days <= 30 ? 'text-amber-500' : 'text-zen-ink/40'}`}>
              {days < 0 ? 'Expired' : `${days}h lagi`}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-zen-ink/30">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* ─ Expanded detail ─ */}
      {expanded && (
        <div className={`px-4 pb-4 pt-2 border-b border-zen-ink/5 space-y-4 ${
          state === 'pending'  ? 'bg-amber-50/30' :
          state === 'disabled' ? 'bg-red-50/20'   : 'bg-zen-bg/40'
        }`}>

          {/* Disabled banner */}
          {state === 'disabled' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2.5">
              <ShieldOff size={13} className="text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-red-700">Lisensi dinonaktifkan oleh admin</p>
                <p className="text-[10px] text-red-500 mt-0.5">Dinonaktifkan: {formatDate(row.disabled_at!)}</p>
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {row.owner_phone && (
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                <Phone size={12} className="text-zen-ink/30 shrink-0" />
                <span className="text-[11px] text-zen-ink/60 font-mono">{row.owner_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-zen-ink/30 shrink-0" />
              <span className="text-[11px] text-zen-ink/50">Daftar: {formatDate(row.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-1 col-span-2">
              <Package size={12} className="text-zen-ink/30 shrink-0" />
              <span className="text-[11px] text-zen-ink/50">
                {row.activated_at ? `Aktivasi: ${formatDate(row.activated_at)}` : 'Belum aktivasi perangkat'}
              </span>
            </div>
            {state === 'active' && row.storage_quota_mb > 0 && (
              <div className="col-span-2 flex items-center gap-2">
                <HardDrive size={12} className="text-zen-ink/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-zen-ink/40">Storage</span>
                    <span className="text-[10px] text-zen-ink/40">{pct}%</span>
                  </div>
                  <div className="h-1 bg-zen-ink/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-zen-brand'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Session info */}
          {state === 'active' && row.sessionStatus !== 'none' && (
            <button
              onClick={e => { e.stopPropagation(); onShowSessions(); }}
              className="flex items-center gap-2 text-[11px] text-zen-ink/50 hover:text-zen-brand transition-colors"
            >
              <Wifi size={12} />
              Terakhir: <strong>{row.sessionUser}</strong> · {row.sessionLastUsed ? timeAgo(row.sessionLastUsed) : '—'}
              <span className="text-zen-brand underline ml-0.5">({row.sessionCount} sesi)</span>
            </button>
          )}
          {state === 'active' && row.sessionStatus === 'none' && (
            <div className="flex items-center gap-2 text-[11px] text-zen-ink/30">
              <WifiOff size={12} /> Belum pernah login
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Copy key — active & disabled */}
            {state !== 'pending' && (
              <button onClick={e => { e.stopPropagation(); onCopyKey(); }} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zen-ink/10 rounded-2xl text-[11px] font-bold text-zen-ink/60 hover:border-zen-brand/30 hover:text-zen-brand transition-colors min-h-[40px]">
                <KeyRound size={12} />
                {isCopied ? <><Check size={12} className="text-green-500" /> Disalin!</> : <><Copy size={12} /> Salin Key</>}
              </button>
            )}

            {/* Lihat sesi — active only */}
            {state === 'active' && row.sessionCount > 0 && (
              <button onClick={e => { e.stopPropagation(); onShowSessions(); }} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zen-ink/10 rounded-2xl text-[11px] font-bold text-zen-ink/60 hover:border-zen-brand/30 hover:text-zen-brand transition-colors min-h-[40px]">
                <CircleDot size={12} /> Lihat Sesi
              </button>
            )}

            {/* Paksa Logout — active only, only when session exists */}
            {state === 'active' && row.sessionCount > 0 && (
              <button onClick={e => { e.stopPropagation(); onForceLogout(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 text-amber-600 bg-amber-50 text-[11px] font-bold rounded-2xl hover:bg-amber-100 transition-colors min-h-[40px] disabled:opacity-40">
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />} Paksa Logout
              </button>
            )}

            {/* Reset Aktivasi — active only, only when already activated */}
            {state === 'active' && row.activated_at && (
              <button onClick={e => { e.stopPropagation(); onResetActivation(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 bg-blue-50 text-[11px] font-bold rounded-2xl hover:bg-blue-100 transition-colors min-h-[40px] disabled:opacity-40">
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reset Aktivasi
              </button>
            )}

            {/* Nonaktifkan — active only */}
            {state === 'active' && (
              <button onClick={e => { e.stopPropagation(); onDisable(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 bg-red-50 text-[11px] font-bold rounded-2xl hover:bg-red-100 transition-colors min-h-[40px] disabled:opacity-40">
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />} Nonaktifkan
              </button>
            )}

            {/* Aktifkan Kembali — disabled only */}
            {state === 'disabled' && (
              <>
                <button onClick={e => { e.stopPropagation(); onEnable(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white text-[11px] font-bold rounded-2xl hover:bg-green-600 transition-colors min-h-[40px] disabled:opacity-40">
                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Aktifkan Kembali
                </button>
                <button onClick={e => { e.stopPropagation(); onReject(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 text-[11px] font-bold rounded-2xl hover:bg-red-50 transition-colors min-h-[40px] disabled:opacity-40">
                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Hapus
                </button>
              </>
            )}

            {/* Approve / Tolak — pending only */}
            {state === 'pending' && (
              <>
                <button onClick={e => { e.stopPropagation(); onReject(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 text-[11px] font-bold rounded-2xl hover:bg-red-50 transition-colors min-h-[40px] disabled:opacity-40">
                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Tolak
                </button>
                <button onClick={e => { e.stopPropagation(); onApprove(); }} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white text-[11px] font-bold rounded-2xl hover:bg-green-600 transition-colors min-h-[40px] disabled:opacity-40">
                  {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                </button>
              </>
            )}
          </div>

          {/* Add-on / Fitur Premium — toggle per fitur */}
          <div className="mt-3 border-t border-zen-ink/5 pt-3" onClick={e => e.stopPropagation()}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2 flex items-center gap-1.5">
              <Sparkles size={11} /> Add-on / Fitur Premium
            </p>
            <div className="space-y-2">
              {FEATURE_KEYS.map((key) => {
                const { state, trialDaysLeft } = featureState(row.features, key, new Date().toISOString());
                const stateLabel = state === 'active' ? 'Aktif'
                  : state === 'trial' ? `Trial — sisa ${trialDaysLeft} hari`
                  : state === 'trial_expired' ? 'Trial habis'
                  : 'Terkunci';
                const stateColor = state === 'active' ? 'text-green-600'
                  : state === 'trial' ? 'text-zen-brand'
                  : state === 'trial_expired' ? 'text-amber-600'
                  : 'text-zen-ink/40';
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zen-ink truncate">{FEATURES[key].label}</p>
                      <p className={`text-[11px] font-bold ${stateColor}`}>{stateLabel}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {state !== 'active' && (
                        <button onClick={() => onActivateFeature(key)}
                          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[11px] font-bold hover:bg-green-600">
                          Aktifkan
                        </button>
                      )}
                      {(state === 'active' || state === 'trial') && (
                        <button onClick={() => onRevokeFeature(key)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 text-red-500 text-[11px] font-bold hover:bg-red-100">
                          Cabut
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zen-ink/5">
      <div className="w-8 flex justify-center"><div className="w-2.5 h-2.5 rounded-full bg-zen-ink/8 animate-pulse" /></div>
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-36 bg-zen-ink/8 rounded-xl animate-pulse" />
        <div className="h-2.5 w-24 bg-zen-ink/5 rounded-xl animate-pulse" />
      </div>
      <div className="hidden sm:block w-14 h-5 bg-zen-ink/5 rounded-full animate-pulse" />
      <div className="hidden md:block w-24 h-3 bg-zen-ink/5 rounded-xl animate-pulse" />
      <div className="hidden lg:block w-16 h-3 bg-zen-ink/5 rounded-xl animate-pulse" />
      <div className="w-4 h-4 bg-zen-ink/5 rounded animate-pulse" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedLicense, setApprovedLicense] = useState<License | null>(null);
  const [sessionDrawer, setSessionDrawer] = useState<LicenseRow | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'online'>('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  // Stats
  const pendingCount  = rows.filter(r => r.state === 'pending').length;
  const activeCount   = rows.filter(r => r.state === 'active').length;
  const disabledCount = rows.filter(r => r.state === 'disabled').length;
  const onlineCount   = rows.filter(r => r.sessionStatus === 'online').length;
  const todayCount    = rows.filter(r => r.sessionStatus === 'today').length;
  const expiringSoon  = rows.filter(r => r.state === 'active' && daysUntil(r.expires_at) <= 30 && daysUntil(r.expires_at) >= 0).length;
  const expiredCount  = rows.filter(r => r.state === 'active' && daysUntil(r.expires_at) < 0).length;

  // Filter + search
  const filtered = rows.filter(r => {
    if (filter === 'pending') { if (r.state !== 'pending') return false; }
    else if (filter === 'active') { if (r.state !== 'active') return false; }
    else if (filter === 'online') { if (r.sessionStatus !== 'online' && r.sessionStatus !== 'today') return false; }
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.studio_name ?? '').toLowerCase().includes(q) ||
        (r.owner_email ?? '').toLowerCase().includes(q) ||
        r.license_key.toLowerCase().includes(q)
      );
    }
    return true;
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
  const handleRevokeFeature = (lic: LicenseRow, key: string) => writeFeature(lic, key, null);

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

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total',         val: licenses.length,  color: 'bg-white border-zen-ink/5',           text: 'text-zen-ink'     },
          { label: 'Menunggu',      val: pendingCount,      color: 'bg-amber-50 border-amber-100',        text: 'text-amber-500'   },
          { label: 'Aktif',         val: activeCount,       color: 'bg-green-50 border-green-100',        text: 'text-green-500'   },
          { label: '● Online',      val: onlineCount,       color: 'bg-emerald-50 border-emerald-100',    text: 'text-emerald-600' },
          { label: 'Dinonaktifkan', val: disabledCount,     color: disabledCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-zen-ink/5', text: disabledCount > 0 ? 'text-red-500' : 'text-zen-ink' },
          { label: 'Mau Expired',   val: expiringSoon,      color: expiringSoon > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-zen-ink/5', text: expiringSoon > 0 ? 'text-orange-500' : 'text-zen-ink' },
        ].map(({ label, val, color, text }) => (
          <div key={label} className={`rounded-2xl p-3 border ${color} text-center`}>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1">{label}</p>
            <p className={`text-xl font-bold ${text}`}>{loading ? '—' : val}</p>
          </div>
        ))}
      </div>

      {/* ── Pending alert ── */}
      {!loading && pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Clock size={15} className="text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">{pendingCount} pendaftaran baru menunggu persetujuan</p>
          <button onClick={() => setFilter('pending')} className="ml-auto text-[10px] font-bold text-amber-700 underline whitespace-nowrap">Lihat</button>
        </div>
      )}

      {/* ── Filter + Search ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Filter tabs */}
        <div className="flex gap-1 bg-zen-bg rounded-2xl p-1 flex-1 sm:max-w-xs">
          {([
            ['all',    `Semua (${licenses.length})`],
            ['pending',`Menunggu (${pendingCount})`],
            ['active', `Aktif (${activeCount})`],
            ['online', `Online (${onlineCount + todayCount})`],
          ] as const).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-2 text-[9px] uppercase tracking-widest font-bold rounded-xl transition-all ${filter === f ? 'bg-white text-zen-ink shadow-sm' : 'text-zen-ink/40'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari studio, email, license key..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-zen-ink/8 rounded-2xl text-sm text-zen-ink placeholder:text-zen-ink/30 outline-none focus:ring-2 ring-zen-brand/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-ink/30 hover:text-zen-ink">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Table / List ── */}
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">

        {/* Table header — desktop only */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-zen-bg/60 border-b border-zen-ink/5 text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">
          <div className="w-8" />
          <div className="flex-1">Studio / Owner</div>
          <div className="hidden sm:block w-16">Plan</div>
          <div className="hidden md:block w-28">Sesi</div>
          <div className="hidden lg:block w-24 text-right">Expiry</div>
          <div className="w-4" />
        </div>

        {/* Rows */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={28} className="text-zen-ink/20 mx-auto mb-3" />
            <p className="text-sm text-zen-ink/40">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Tidak ada data'}
            </p>
          </div>
        ) : (
          filtered.map(row => (
            <LicenseTableRow
              key={row.id}
              row={row}
              onApprove={() => handleApprove(row)}
              onReject={() => handleReject(row)}
              onDisable={() => handleDisable(row)}
              onEnable={() => handleEnable(row)}
              onForceLogout={() => handleForceLogout(row)}
              onResetActivation={() => handleResetActivation(row)}
              onCopyKey={() => handleCopyKey(row)}
              onShowSessions={() => setSessionDrawer(row)}
              onActivateFeature={(key) => handleActivateFeature(row, key)}
              onRevokeFeature={(key) => handleRevokeFeature(row, key)}
              isProcessing={actionLoading === row.id}
              copiedId={copiedId}
            />
          ))
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 text-center text-[10px] text-zen-ink/30 border-t border-zen-ink/5">
            Menampilkan {filtered.length} dari {licenses.length} lisensi
          </div>
        )}
      </div>

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
      {sessionDrawer && (
        <SessionDrawer
          license={sessionDrawer}
          sessions={sessions}
          onClose={() => setSessionDrawer(null)}
        />
      )}
    </div>
  );
}
