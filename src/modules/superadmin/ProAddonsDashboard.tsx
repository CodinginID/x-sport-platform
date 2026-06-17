import { useState, useEffect, useCallback } from 'react';
import { createAdminClient } from '@/lib/supabaseAdmin';
import {
  Sparkles, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Users, TrendingUp, XCircle, MessageCircle,
} from 'lucide-react';
import type { PlatformConfig } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudioWithFeatures {
  id: string;
  studio_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  license_key: string;
  is_active: boolean;
  features: Record<string, FeatureStatus> | null;
  created_at: string;
}

interface FeatureStatus {
  status: 'trial' | 'active' | 'trial_expired' | 'pending_payment';
  trial_ends_at?: string;
  activated_at?: string;
  invoice?: string;
  requested_at?: string;
}

type AddonStatus = 'never_tried' | 'trial' | 'trial_expired' | 'active' | 'pending_payment';

interface StudioAddonState {
  studio: StudioWithFeatures;
  proStatus: AddonStatus;
  trialEndsAt?: string;
  daysLeft?: number;
  invoice?: string;
  requestedAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProStatus(features: Record<string, FeatureStatus> | null): AddonStatus {
  if (!features?.pro) return 'never_tried';
  const pro = features.pro;
  if (pro.status === 'active') return 'active';
  if (pro.status === 'pending_payment') return 'pending_payment';
  if (pro.status === 'trial') {
    if (pro.trial_ends_at && new Date(pro.trial_ends_at) > new Date()) return 'trial';
    return 'trial_expired';
  }
  if (pro.status === 'trial_expired') return 'trial_expired';
  return 'never_tried';
}

function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function daysLeft(from: string): number {
  return Math.max(0, daysBetween(from));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso));
}

function statusConfig(status: AddonStatus) {
  switch (status) {
    case 'never_tried':
      return { label: 'Belum Coba', color: 'text-zen-ink/30', bg: 'bg-zen-ink/5', icon: XCircle };
    case 'trial':
      return { label: 'Trial Aktif', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock };
    case 'trial_expired':
      return { label: 'Trial Habis', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle };
    case 'pending_payment':
      return { label: 'Menunggu Konfirmasi', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock };
    case 'active':
      return { label: 'Aktif', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
  }
}

function buyWaLink(wa: string, studio: string, licenseKey: string, label: string, price: number) {
  const text = `Halo Admin, saya dari studio "${studio}" (lisensi ${licenseKey.slice(0, 8).toUpperCase()}) ingin membeli add-on: ${label}.\n\nSaya lampirkan bukti transfer. Terima kasih.`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ProAddonsDashboardProps {
  adminClient: ReturnType<typeof createAdminClient>;
  config: PlatformConfig | null;
  toast: { add: (msg: string, variant: 'success' | 'error' | 'info') => void };
}

export function ProAddonsDashboard({ adminClient, config, toast }: ProAddonsDashboardProps) {
  const [studios, setStudios] = useState<StudioAddonState[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | AddonStatus>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await adminClient
        .from('licenses')
        .select('id, studio_name, owner_email, owner_phone, license_key, is_active, features, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: StudioAddonState[] = (data || []).map((row: any) => {
        const status = getProStatus(row.features);
        const pro = row.features?.pro;
        return {
          studio: row as StudioWithFeatures,
          proStatus: status,
          trialEndsAt: pro?.trial_ends_at,
          daysLeft: pro?.trial_ends_at ? daysLeft(pro.trial_ends_at) : undefined,
          invoice: pro?.invoice,
          requestedAt: pro?.requested_at,
        };
      });

      setStudios(items);
    } catch (err: any) {
      toast.add('Gagal memuat: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [adminClient, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: auto-refresh ketika ada update license (misalnya pending_payment baru masuk)
  useEffect(() => {
    const ch = adminClient.channel('admin-licenses-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'licenses' },
        () => { fetchData(); })
      .subscribe();
    return () => { adminClient.removeChannel(ch); };
  }, [adminClient, fetchData]);

  // Activate Pro for a studio
  const handleActivate = async (studioId: string) => {
    setActionLoading(studioId);
    try {
      // Get current features
      const studio = studios.find(s => s.studio.id === studioId);
      if (!studio) return;

      const currentFeatures = studio.studio.features || {};
      const updatedFeatures = {
        ...currentFeatures,
        pro: {
          ...currentFeatures.pro,   // preserve trial_ends_at, invoice, etc.
          status: 'active',
          activated_at: new Date().toISOString(),
        },
      };

      const { error } = await adminClient
        .from('licenses')
        .update({ features: updatedFeatures })
        .eq('id', studioId);

      if (error) throw error;

      toast.add(`Pro diaktifkan untuk ${studio.studio.studio_name || 'studio'}`, 'success');
      await fetchData();
    } catch (err: any) {
      toast.add('Gagal aktivasi: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const totalActive = studios.filter(s => s.proStatus === 'active').length;
  const totalTrial = studios.filter(s => s.proStatus === 'trial').length;
  const totalExpired = studios.filter(s => s.proStatus === 'trial_expired').length;
  const totalNever = studios.filter(s => s.proStatus === 'never_tried').length;
  const totalPendingPayment = studios.filter(s => s.proStatus === 'pending_payment').length;
  const pendingPaymentStudios = studios.filter(s => s.proStatus === 'pending_payment');

  // Filtered list
  const filtered = filter === 'all' ? studios : studios.filter(s => s.proStatus === filter);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-zen-brand animate-pulse" />
          <h2 className="text-sm font-bold">Monitoring Add-on Pro</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-zen-ink/5" />
              <div className="flex-1 h-4 bg-zen-ink/5 rounded" />
              <div className="w-20 h-6 bg-zen-ink/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-zen-brand" />
          <h2 className="text-sm font-bold">Monitoring Add-on Pro</h2>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-zen-ink/10 text-xs font-bold text-zen-ink/60 hover:text-zen-brand hover:border-zen-brand/30 transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-green-500" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Aktif</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalActive}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Trial</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalTrial}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-500" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Trial Habis</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{totalExpired}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-zen-ink/20" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Belum Coba</p>
          </div>
          <p className="text-2xl font-bold text-zen-ink/40">{totalNever}</p>
        </div>
        <div className={`glass-card rounded-2xl p-4 ${totalPendingPayment > 0 ? 'border border-orange-200 bg-orange-50/60' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className={totalPendingPayment > 0 ? 'text-orange-500 animate-pulse' : 'text-zen-ink/20'} />
            <p className={`text-[9px] uppercase tracking-widest font-bold ${totalPendingPayment > 0 ? 'text-orange-600/80' : 'text-zen-ink/40'}`}>Menunggu Konfirmasi</p>
          </div>
          <p className={`text-2xl font-bold ${totalPendingPayment > 0 ? 'text-orange-600' : 'text-zen-ink/40'}`}>{totalPendingPayment}</p>
        </div>
      </div>

      {/* Revenue estimate */}
      <div className="glass-card rounded-2xl p-4 bg-gradient-to-r from-zen-brand/5 to-green-50 border-zen-brand/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-brand mb-1">Potensi Pendapatan</p>
            <p className="text-xl font-bold text-zen-ink">
              Rp {((totalTrial + totalExpired + totalNever) * (config?.feature_prices?.pro ?? 0)).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] text-zen-ink/40">
              {totalTrial + totalExpired + totalNever} studio belum mengaktifkan Pro
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zen-brand/10 flex items-center justify-center">
            <TrendingUp size={20} className="text-zen-brand" />
          </div>
        </div>
      </div>

      {/* Priority: Studio yang sudah transfer, menunggu konfirmasi */}
      {pendingPaymentStudios.length > 0 && (
        <div className="rounded-3xl border-2 border-orange-200 bg-orange-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">
              {pendingPaymentStudios.length} Studio Menunggu Konfirmasi Pembayaran
            </p>
          </div>
          <div className="space-y-2">
            {pendingPaymentStudios.map(({ studio, invoice, requestedAt }) => (
              <div key={studio.id} className="bg-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zen-ink truncate">{studio.studio_name || '—'}</p>
                  <p className="text-[10px] text-zen-ink/40 truncate">{studio.owner_email}</p>
                  {invoice && (
                    <p className="text-[10px] font-mono font-bold text-orange-600 mt-1">{invoice}</p>
                  )}
                  {requestedAt && (
                    <p className="text-[10px] text-zen-ink/30">Diminta: {formatDate(requestedAt)}</p>
                  )}
                </div>
                <button
                  onClick={() => handleActivate(studio.id)}
                  disabled={actionLoading === studio.id}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-zen-brand text-white text-[10px] font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  {actionLoading === studio.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  Aktifkan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { key: 'all' as const, label: 'Semua', count: studios.length },
          { key: 'pending_payment' as const, label: 'Menunggu Konfirmasi', count: totalPendingPayment },
          { key: 'trial' as const, label: 'Trial', count: totalTrial },
          { key: 'trial_expired' as const, label: 'Trial Habis', count: totalExpired },
          { key: 'never_tried' as const, label: 'Belum Coba', count: totalNever },
          { key: 'active' as const, label: 'Aktif', count: totalActive },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              filter === key
                ? 'bg-zen-brand text-white'
                : 'bg-white border border-zen-ink/10 text-zen-ink/40 hover:text-zen-ink'
            }`}>
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Studio list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-zen-ink/40">Tidak ada studio dengan status ini</div>
        ) : (
          filtered.map(({ studio, proStatus, daysLeft, invoice }) => {
            const cfg = statusConfig(proStatus);
            const Icon = cfg.icon;
            const isProcessing = actionLoading === studio.id;

            return (
              <div key={studio.id} className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow">
                {/* Studio info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-zen-ink truncate">{studio.studio_name || '—'}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                      <Icon size={10} /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zen-ink/40">
                    <span>{studio.owner_email || '—'}</span>
                    {studio.owner_phone && <span>· {studio.owner_phone}</span>}
                  </div>
                  {proStatus === 'trial' && daysLeft !== undefined && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1">
                      Sisa trial: {daysLeft} hari
                    </p>
                  )}
                  {proStatus === 'trial_expired' && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      Trial berakhir {studio.features?.pro?.trial_ends_at ? formatDate(studio.features.pro.trial_ends_at) : '—'}
                    </p>
                  )}
                  {proStatus === 'pending_payment' && invoice && (
                    <p className="text-[10px] font-mono font-bold text-orange-600 mt-1">{invoice}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {proStatus !== 'active' && config?.admin_wa && (
                    <a
                      href={buyWaLink(config.admin_wa, studio.studio_name || '-', studio.license_key, 'Pro', config.feature_prices?.pro ?? 0)}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-bold hover:bg-green-500/20 transition-colors"
                    >
                      <MessageCircle size={12} /> WA
                    </a>
                  )}
                  {proStatus !== 'active' && (
                    <button
                      onClick={() => handleActivate(studio.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zen-brand text-white text-[10px] font-bold hover:bg-zen-brand/90 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      {isProcessing ? '...' : 'Aktifkan'}
                    </button>
                  )}
                  {proStatus === 'active' && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                      <CheckCircle2 size={12} /> Pro Aktif
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
