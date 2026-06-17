import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FEATURES, FEATURE_KEYS } from '@/config/features';

// ─── Pengaturan Add-on (harga, WA admin, rekening) — bisa diubah tanpa ngoprek kode ──
export default function AddonConfigPanel() {
  const [cfg, setCfg] = useState<{ admin_wa: string; bank_name: string; bank_account_number: string; bank_account_holder: string; feature_prices: Record<string, number> } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_config').select('*').eq('id', 1).maybeSingle();
      setCfg({
        admin_wa: data?.admin_wa ?? '', bank_name: data?.bank_name ?? '',
        bank_account_number: data?.bank_account_number ?? '', bank_account_holder: data?.bank_account_holder ?? '',
        feature_prices: data?.feature_prices ?? {},
      });
    })();
  }, []);

  if (!cfg) return null;
  const set = (k: keyof typeof cfg, v: string) => setCfg({ ...cfg, [k]: v });
  const setPrice = (key: string, v: number) => setCfg({ ...cfg, feature_prices: { ...cfg.feature_prices, [key]: v } });

  const save = async () => {
    setSaving(true); setMsg('');
    const { error } = await supabase.from('platform_config').update({
      admin_wa: cfg.admin_wa, bank_name: cfg.bank_name,
      bank_account_number: cfg.bank_account_number, bank_account_holder: cfg.bank_account_holder,
      feature_prices: cfg.feature_prices, updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setSaving(false);
    setMsg(error ? 'Gagal simpan: ' + error.message : 'Tersimpan ✓');
    setTimeout(() => setMsg(''), 3000);
  };

  const inputCls = 'w-full px-4 py-3 bg-white border border-zen-ink/10 rounded-2xl text-sm outline-none focus:border-zen-brand';
  return (
    <div className="glass-card rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Pengaturan Add-on</h2>
        {msg && <span className="text-xs font-bold text-zen-brand">{msg}</span>}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Nomor WA Admin</label>
          <input className={inputCls} placeholder="628123456789" value={cfg.admin_wa} onChange={e => set('admin_wa', e.target.value)} /></div>
        <div><label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Nama Bank</label>
          <input className={inputCls} placeholder="BCA" value={cfg.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
        <div><label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">No. Rekening</label>
          <input className={inputCls} placeholder="1234567890" value={cfg.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} /></div>
        <div><label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Atas Nama</label>
          <input className={inputCls} placeholder="Nama pemilik" value={cfg.bank_account_holder} onChange={e => set('bank_account_holder', e.target.value)} /></div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2">Harga per Fitur (Rp)</p>
        <div className="space-y-2">
          {FEATURE_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zen-ink">{FEATURES[key].label}</span>
              <input type="number" min={0} className={`${inputCls} max-w-[180px]`} value={cfg.feature_prices?.[key] ?? 0}
                onChange={e => setPrice(key, Math.max(0, Number(e.target.value)))} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={save} disabled={saving} className="px-5 py-3 rounded-2xl bg-zen-brand text-white text-sm font-bold disabled:opacity-50">
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  );
}
