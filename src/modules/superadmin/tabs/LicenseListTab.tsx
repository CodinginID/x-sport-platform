import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check, Copy, X, Loader2, CheckCircle2, XCircle,
  Clock, Phone, KeyRound, Building2,
  Search, Wifi, WifiOff, Calendar, ChevronDown, ChevronUp,
  CircleDot, HardDrive, Package, ShieldOff, ShieldCheck, LogOut, RotateCcw,
  Sparkles,
} from 'lucide-react';
import { FEATURES, FEATURE_KEYS } from '@/config/features';
import { featureState } from '@/lib/featureState';
import {
  getLicenseState, daysUntil, timeAgo, formatDate, SESSION_CONFIG,
} from '../types';
import type { LicenseRow, SessionRow } from '../types';

// ─── License Key Modal ────────────────────────────────────────────────────────

export function LicenseKeyModal({ licenseKey, studioName, onClose }: {
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

export function ConfirmSheet({ title, message, variant, onConfirm, onCancel }: {
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
              const status = getSessionStatusInternal(s.last_used_at, s.expires_at);
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

// Local copy of session status used only inside the drawer (per-session granularity).
function getSessionStatusInternal(lastUsed: string | null, sessionExpires: string | null) {
  if (!lastUsed || !sessionExpires) return 'none' as const;
  if (new Date(sessionExpires) < new Date()) return 'idle' as const;
  const minAgo = (Date.now() - new Date(lastUsed).getTime()) / 60_000;
  if (minAgo < 30) return 'online' as const;
  if (minAgo < 60 * 24) return 'today' as const;
  if (minAgo < 60 * 24 * 7) return 'recent' as const;
  return 'idle' as const;
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
                const { state: featState, trialDaysLeft } = featureState(row.features, key, new Date().toISOString());
                const stateLabel = featState === 'active' ? 'Aktif'
                  : featState === 'trial' ? `Trial — sisa ${trialDaysLeft} hari`
                  : featState === 'trial_expired' ? 'Trial habis'
                  : 'Terkunci';
                const stateColor = featState === 'active' ? 'text-green-600'
                  : featState === 'trial' ? 'text-zen-brand'
                  : featState === 'trial_expired' ? 'text-amber-600'
                  : 'text-zen-ink/40';
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zen-ink truncate">{FEATURES[key].label}</p>
                      <p className={`text-[11px] font-bold ${stateColor}`}>{stateLabel}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {featState !== 'active' && (
                        <button onClick={() => onActivateFeature(key)}
                          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-[11px] font-bold hover:bg-green-600">
                          Aktifkan
                        </button>
                      )}
                      {(featState === 'active' || featState === 'trial') && (
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

// ─── License List Tab ─────────────────────────────────────────────────────────

export interface LicenseListTabProps {
  rows: LicenseRow[];
  sessions: SessionRow[];
  loading: boolean;
  licensesCount: number;
  actionLoading: string | null;
  copiedId: string | null;
  onApprove: (row: LicenseRow) => void;
  onReject: (row: LicenseRow) => void;
  onDisable: (row: LicenseRow) => void;
  onEnable: (row: LicenseRow) => void;
  onForceLogout: (row: LicenseRow) => void;
  onResetActivation: (row: LicenseRow) => void;
  onCopyKey: (row: LicenseRow) => void;
  onActivateFeature: (row: LicenseRow, key: string) => void;
  onRevokeFeature: (row: LicenseRow, key: string) => void;
}

export default function LicenseListTab({
  rows, sessions, loading, licensesCount, actionLoading, copiedId,
  onApprove, onReject, onDisable, onEnable, onForceLogout, onResetActivation,
  onCopyKey, onActivateFeature, onRevokeFeature,
}: LicenseListTabProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'online'>('all');
  const [search, setSearch] = useState('');
  const [sessionDrawer, setSessionDrawer] = useState<LicenseRow | null>(null);

  const pendingCount = rows.filter(r => r.state === 'pending').length;
  const activeCount = rows.filter(r => r.state === 'active').length;
  const onlineCount = rows.filter(r => r.sessionStatus === 'online').length;
  const todayCount = rows.filter(r => r.sessionStatus === 'today').length;

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

  return (
    <div className="space-y-5">
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
            ['all',    `Semua (${licensesCount})`],
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
              onApprove={() => onApprove(row)}
              onReject={() => onReject(row)}
              onDisable={() => onDisable(row)}
              onEnable={() => onEnable(row)}
              onForceLogout={() => onForceLogout(row)}
              onResetActivation={() => onResetActivation(row)}
              onCopyKey={() => onCopyKey(row)}
              onShowSessions={() => setSessionDrawer(row)}
              onActivateFeature={(key) => onActivateFeature(row, key)}
              onRevokeFeature={(key) => onRevokeFeature(row, key)}
              isProcessing={actionLoading === row.id}
              copiedId={copiedId}
            />
          ))
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 text-center text-[10px] text-zen-ink/30 border-t border-zen-ink/5">
            Menampilkan {filtered.length} dari {licensesCount} lisensi
          </div>
        )}
      </div>

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
