import { useState, useEffect, useCallback } from 'react';
import { createAdminClient } from '@/lib/supabaseAdmin';
import {
  Sparkles, Settings2, Plus, Trash2, Save, RefreshCw,
  Eye, EyeOff, Copy, Check, Pencil, X,
  TrendingUp, Users, Clock, CheckCircle2,
} from 'lucide-react';
import type { PlatformConfig, FeatureCatalogEntry } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeatureUsage {
  total_studios: number;
  never_tried: number;
  trial: number;
  trial_expired: number;
  active: number;
}

interface FeatureCatalogManagerProps {
  adminClient: ReturnType<typeof createAdminClient>;
  config: PlatformConfig | null;
  onConfigChange: (cfg: PlatformConfig) => void;
  toast: { add: (msg: string, variant: 'success' | 'error' | 'info') => void };
}

// ─── Default feature template ─────────────────────────────────────────────────

const DEFAULT_FEATURE_TEMPLATE: Omit<FeatureCatalogEntry, 'sort_order'> = {
  label: '',
  description: '',
  trial_days: 3,
  price: 0,
  is_publish: false,
  details: [''],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeUsage(
  features: Record<string, any> | null,
  featureKey: string
): FeatureUsage {
  const usage: FeatureUsage = {
    total_studios: 0,
    never_tried: 0,
    trial: 0,
    trial_expired: 0,
    active: 0,
  };

  if (!features) return usage;
  usage.total_studios = 1;

  const entry = features[featureKey];
  if (!entry) {
    usage.never_tried = 1;
    return usage;
  }

  if (entry.status === 'active') {
    usage.active = 1;
  } else if (entry.status === 'trial') {
    if (entry.trial_ends_at && new Date(entry.trial_ends_at) > new Date()) {
      usage.trial = 1;
    } else {
      usage.trial_expired = 1;
    }
  } else {
    usage.never_tried = 1;
  }

  return usage;
}

// ─── Inline Editor for a single feature ───────────────────────────────────────

function FeatureEditor({
  featureKey,
  entry,
  usage,
  onChange,
  onDelete,
  onToggle,
}: {
  featureKey: string;
  entry: FeatureCatalogEntry;
  usage: FeatureUsage;
  onChange: (updates: Partial<FeatureCatalogEntry>) => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard?.writeText(featureKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-3xl border transition-all ${entry.is_publish ? 'border-zen-brand/20 bg-white' : 'border-zen-ink/10 bg-zen-bg/50'}`}>
      {/* Header row */}
      <div className="px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Toggle publish */}
          <button
            onClick={onToggle}
            className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${entry.is_publish ? 'bg-zen-brand' : 'bg-zen-ink/20'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${entry.is_publish ? 'left-4' : 'left-0.5'}`} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-bold truncate ${entry.is_publish ? 'text-zen-ink' : 'text-zen-ink/40'}`}>
                {entry.label || featureKey || '(tanpa nama)'}
              </p>
              <button onClick={handleCopyKey} className="flex items-center gap-1 text-[9px] font-bold text-zen-ink/30 hover:text-zen-brand transition-colors">
                {copied ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                <span className="font-mono">{featureKey}</span>
              </button>
            </div>
            <p className="text-[10px] text-zen-ink/30 truncate">{entry.description || 'Belum ada deskripsi'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Usage badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-600">
              <CheckCircle2 size={9} /> {usage.active}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-600">
              <Clock size={9} /> {usage.trial}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-zen-ink/5 text-zen-ink/30">
              <Users size={9} /> {usage.never_tried}
            </span>
          </div>

          {/* Price */}
          <p className="text-sm font-bold text-zen-brand">
            Rp {entry.price.toLocaleString('id-ID')}
          </p>

          {/* Expand/collapse */}
          <button onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-ink/10 flex items-center justify-center transition-colors">
            <Pencil size={14} className="text-zen-ink/40" />
          </button>

          {/* Delete */}
          <button onClick={onDelete}
            className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-zen-ink/5 px-5 py-5 space-y-4">
          {/* Label */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Nama Fitur</p>
            <input
              value={entry.label}
              onChange={e => onChange({ label: e.target.value })}
              placeholder="Contoh: Pro"
              className="w-full px-4 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Deskripsi</p>
            <textarea
              value={entry.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="Deskripsi singkat fitur ini..."
              rows={2}
              className="w-full px-4 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand transition-colors resize-none"
            />
          </div>

          {/* Price + Trial Days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Harga (Rp)</p>
              <input
                type="number"
                value={entry.price}
                onChange={e => onChange({ price: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand transition-colors"
              />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Trial (hari)</p>
              <input
                type="number"
                value={entry.trial_days}
                onChange={e => onChange({ trial_days: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand transition-colors"
              />
            </div>
          </div>

          {/* Sort order */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-1">Urutan Tampil</p>
            <input
              type="number"
              value={entry.sort_order}
              onChange={e => onChange({ sort_order: parseInt(e.target.value) || 0 })}
              className="w-24 px-4 py-2.5 text-sm bg-zen-bg border border-zen-ink/10 rounded-2xl outline-none focus:border-zen-brand transition-colors"
            />
          </div>

          {/* Details list */}
          <div>
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-2">Benefit Details</p>
            <div className="space-y-2">
              {entry.details.map((detail, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-zen-ink/20 w-5 shrink-0">{i + 1}.</span>
                  <input
                    value={detail}
                    onChange={e => {
                      const next = [...entry.details];
                      next[i] = e.target.value;
                      onChange({ details: next });
                    }}
                    placeholder="Benefit ke-{i + 1}"
                    className="flex-1 px-3 py-2 text-xs bg-zen-bg border border-zen-ink/10 rounded-xl outline-none focus:border-zen-brand transition-colors"
                  />
                  <button onClick={() => {
                    const next = entry.details.filter((_, j) => j !== i);
                    onChange({ details: next });
                  }} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                    <X size={12} className="text-red-400" />
                  </button>
                </div>
              ))}
              <button onClick={() => onChange({ details: [...entry.details, ''] })}
                className="flex items-center gap-1.5 text-[10px] font-bold text-zen-brand hover:underline">
                <Plus size={12} /> Tambah benefit
              </button>
            </div>
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${entry.is_publish ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            {entry.is_publish ? (
              <>
                <Eye size={13} className="text-green-600" />
                <p className="text-[10px] text-green-700 font-bold">Tampil di halaman Add-ons</p>
              </>
            ) : (
              <>
                <EyeOff size={13} className="text-amber-600" />
                <p className="text-[10px] text-amber-700 font-bold">Tersembunyi — user tidak bisa melihat</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FeatureCatalogManager({ adminClient, config, onConfigChange, toast }: FeatureCatalogManagerProps) {
  const [catalog, setCatalog] = useState<Record<string, FeatureCatalogEntry>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<Record<string, FeatureUsage>>({});

  // Load feature catalog from config
  useEffect(() => {
    if (config?.feature_catalog) {
      setCatalog(config.feature_catalog);
    } else {
      // Default: seed with 'pro' if empty
      setCatalog({
        pro: {
          label: 'Pro',
          description: 'Buka semua tampilan premium: dashboard grafik, jadwal cantik, laporan, dan UI yang lebih mulus.',
          trial_days: 3,
          price: config?.feature_prices?.pro ?? 299000,
          is_publish: true,
          sort_order: 1,
          details: [
            'Dashboard grafik & insight: tren pendapatan, kehadiran, jam tersibuk, okupansi',
            'Jadwal sesi tampilan premium: cari slot kosong lebih cepat',
            'Dropdown & loading yang lebih mulus saat memuat data',
            'Laporan dengan grafik + export PDF/Excel',
          ],
        },
      });
    }
  }, [config]);

  // Fetch usage stats
  const fetchUsage = useCallback(async () => {
    try {
      const { data, error } = await adminClient
        .from('licenses')
        .select('id, features');

      if (error) throw error;

      const usage: Record<string, FeatureUsage> = {};
      for (const key of Object.keys(catalog)) {
        usage[key] = { total_studios: 0, never_tried: 0, trial: 0, trial_expired: 0, active: 0 };
      }

      for (const row of data || []) {
        for (const key of Object.keys(catalog)) {
          const u = computeUsage(row.features, key);
          usage[key].total_studios += u.total_studios;
          usage[key].never_tried += u.never_tried;
          usage[key].trial += u.trial;
          usage[key].trial_expired += u.trial_expired;
          usage[key].active += u.active;
        }
      }

      setUsageData(usage);
    } catch (err: any) {
      console.error('Gagal memuat usage:', err);
    }
  }, [adminClient, catalog]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  // Add new feature
  const handleAdd = () => {
    const key = `feature_${Date.now()}`;
    setCatalog(prev => ({
      ...prev,
      [key]: {
        ...DEFAULT_FEATURE_TEMPLATE,
        sort_order: Object.keys(prev).length + 1,
      },
    }));
  };

  // Delete feature
  const handleDelete = (key: string) => {
    setCatalog(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Toggle publish
  const handleToggle = (key: string) => {
    setCatalog(prev => ({
      ...prev,
      [key]: { ...prev[key], is_publish: !prev[key].is_publish },
    }));
  };

  // Update feature
  const handleChange = (key: string, updates: Partial<FeatureCatalogEntry>) => {
    setCatalog(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  // Save to DB
  const handleSave = async () => {
    setSaving(true);
    try {
      // Update feature_prices from catalog
      const featurePrices: Record<string, number> = {};
      for (const [key, entry] of Object.entries(catalog)) {
        featurePrices[key] = entry.price;
      }

      const { error } = await adminClient
        .from('platform_config')
        .update({ feature_catalog: catalog, feature_prices: featurePrices })
        .eq('id', 1);

      if (error) throw error;

      // Update local config
      if (config) {
        onConfigChange({
          ...config,
          feature_catalog: catalog,
          feature_prices: featurePrices,
        });
      }

      toast.add('Katalog fitur disimpan', 'success');
      await fetchUsage();
    } catch (err: any) {
      toast.add('Gagal menyimpan: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sort by sort_order
  const sortedEntries = Object.entries(catalog).sort((a, b) => a[1].sort_order - b[1].sort_order);

  // Stats
  const totalPublished = Object.values(catalog).filter(e => e.is_publish).length;
  const totalHidden = Object.values(catalog).filter(e => !e.is_publish).length;
  const totalActiveAll = Object.values(usageData).reduce((s, u) => s + u.active, 0);
  const totalTrialAll = Object.values(usageData).reduce((s, u) => s + u.trial, 0);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-zen-brand animate-pulse" />
          <h2 className="text-sm font-bold">Pengelola Katalog Fitur</h2>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-6 rounded-full bg-zen-ink/5" />
              <div className="flex-1 h-4 bg-zen-ink/5 rounded" />
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
          <Settings2 size={18} className="text-zen-brand" />
          <h2 className="text-sm font-bold">Pengelola Katalog Fitur</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-zen-brand text-white text-xs font-bold hover:bg-zen-brand/90 active:scale-[0.98] transition-all disabled:opacity-50">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? 'Menyimpan...' : 'Simpan Katalog'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-zen-brand" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Dipublikasi</p>
          </div>
          <p className="text-2xl font-bold text-zen-brand">{totalPublished}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <EyeOff size={14} className="text-zen-ink/20" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Tersembunyi</p>
          </div>
          <p className="text-2xl font-bold text-zen-ink/40">{totalHidden}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-green-500" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Total Aktif</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalActiveAll}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-blue-500" />
            <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/40">Total Trial</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalTrialAll}</p>
        </div>
      </div>

      {/* Feature list */}
      <div className="space-y-3">
        {sortedEntries.length === 0 ? (
          <div className="text-center py-12 text-sm text-zen-ink/40">
            Belum ada fitur. Klik "Tambah Fitur" untuk mulai.
          </div>
        ) : (
          sortedEntries.map(([key, entry]) => (
            <FeatureEditor
              key={key}
              featureKey={key}
              entry={entry}
              usage={usageData[key] ?? { total_studios: 0, never_tried: 0, trial: 0, trial_expired: 0, active: 0 }}
              onChange={(updates) => handleChange(key, updates)}
              onDelete={() => handleDelete(key)}
              onToggle={() => handleToggle(key)}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <button onClick={handleAdd}
        className="w-full py-4 rounded-3xl border-2 border-dashed border-zen-ink/10 text-zen-ink/30 text-sm font-bold hover:border-zen-brand/30 hover:text-zen-brand transition-colors flex items-center justify-center gap-2">
        <Plus size={16} /> Tambah Fitur Baru
      </button>

      {/* Legend */}
      <div className="glass-card rounded-2xl p-4 bg-zen-bg/40">
        <p className="text-[9px] uppercase tracking-widest font-bold text-zen-ink/30 mb-2">Cara Penggunaan</p>
        <ol className="text-[10px] text-zen-ink/50 space-y-1 list-decimal list-inside">
          <li>Klik tombol di samping nama fitur untuk mengedit detail</li>
          <li>Toggle switch untuk mengatur tampil/tersembunyi di halaman Add-ons</li>
          <li>Isi harga, trial days, dan benefit details</li>
          <li>Klik "Simpan Katalog" untuk menyimpan ke database</li>
          <li>Fitur yang <strong>is_publish = false</strong> tidak akan tampil di halaman Add-ons user</li>
        </ol>
      </div>
    </div>
  );
}
