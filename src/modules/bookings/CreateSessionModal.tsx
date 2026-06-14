import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { useTrainingSessionMutation, useCoaches } from '@/hooks';

const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({ session_date: todayLocal(), session_time: '', capacity: 1, coach_id: '' });

export function CreateSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useTrainingSessionMutation();
  const { data: coaches = [] } = useCoaches();

  // Sesi v4 = slot waktu + kapasitas member + 1 coach (di-set di sini, peserta ikut coach sesi).
  const [form, setForm] = useState(emptyForm);

  const valid = form.session_date && form.session_time && form.capacity > 0;
  const submit = () => {
    if (!valid) return;
    mutation.mutate(
      { action: 'create', session: { ...form, coach_id: form.coach_id || null } },
      { onSuccess: () => { setForm(emptyForm()); onClose(); } },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Buat Sesi">
      <div className="space-y-5">
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
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Coach</label>
          <select value={form.coach_id} onChange={e => setForm({ ...form, coach_id: e.target.value })}
            className="w-full px-4 py-3 bg-zen-bg rounded-2xl text-sm font-medium text-zen-ink outline-none focus:ring-2 focus:ring-zen-brand/30 appearance-none">
            <option value="">Pilih coach (bisa diisi nanti)...</option>
            {coaches.map(c => <option key={c.coach_id} value={c.coach_id}>{c.full_name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Kapasitas (jumlah member)</label>
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
