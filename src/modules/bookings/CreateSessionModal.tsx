import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { usePackages, usePackageCoaches, useCoaches, useTrainingSessionMutation } from '@/hooks';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function CreateSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: packages = [] } = usePackages();
  const { data: coaches = [] } = useCoaches();
  const { data: allPackageCoaches = [] } = usePackageCoaches();
  const mutation = useTrainingSessionMutation();

  const [form, setForm] = useState({ package_id: '', coach_id: '', session_date: todayLocal(), session_time: '', capacity: 1 });

  const coachMap = Object.fromEntries(coaches.map(c => [c.coach_id, c.full_name]));
  const coachOptions = allPackageCoaches
    .filter(pc => pc.package_id === form.package_id)
    .map(pc => ({ value: pc.coach_id, label: coachMap[pc.coach_id] ?? pc.coach_id }));

  const onPackageChange = (package_id: string) => {
    const pkg = packages.find(p => p.package_id === package_id);
    setForm({ ...form, package_id, capacity: pkg?.default_capacity ?? 1, coach_id: '' });
  };

  const valid = form.package_id && form.coach_id && form.session_date && form.session_time && form.capacity > 0;
  const submit = () => {
    if (!valid) return;
    mutation.mutate({ action: 'create', session: form }, { onSuccess: () => { setForm({ package_id: '', coach_id: '', session_date: todayLocal(), session_time: '', capacity: 1 }); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Sesi">
      <div className="space-y-5">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Paket</label>
          <select value={form.package_id} onChange={e => onPackageChange(e.target.value)}
            className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium text-zen-ink outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
            <option value="">Pilih paket...</option>
            {packages.map(p => <option key={p.package_id} value={p.package_id}>{p.package_name}</option>)}
          </select>
        </div>

        {form.package_id && (
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-2 block">Coach</label>
            {coachOptions.length === 0
              ? <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">Paket ini belum punya coach. Tambahkan di menu Paket.</p>
              : (
                <div className="flex flex-wrap gap-2">
                  {coachOptions.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm({ ...form, coach_id: opt.value })}
                      className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold border transition-all ${form.coach_id === opt.value ? 'bg-zen-brand text-white border-zen-brand' : 'bg-zen-bg text-zen-ink/60 border-zen-ink/10 hover:border-zen-brand/40'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Tanggal</label>
            <input type="date" value={form.session_date} onChange={e => setForm({ ...form, session_date: e.target.value })}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Jam</label>
            <input type="time" value={form.session_time} onChange={e => setForm({ ...form, session_time: e.target.value })}
              className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Kapasitas (slot peserta)</label>
          <input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: Math.max(1, Number(e.target.value)) })}
            className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-zen-brand/30" />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending} className="flex-1">
            {mutation.isPending ? 'Menyimpan...' : 'Buat Sesi'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
