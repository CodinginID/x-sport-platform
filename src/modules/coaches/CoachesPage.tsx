import { useState } from "react";
import { useCoaches, useCoachMutation } from "@/hooks";
import { useAuthStore } from "@/stores/auth";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { Modal, Button, Input, QueryError } from "@/components/ui";
import { Coach } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Dumbbell } from "lucide-react";

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const defaultForm = { full_name: "", phone_number: "", email: "", notes: "" };

export default function CoachesPage() {
  const { t } = useTranslation();
  const { data: coaches = [], isError, refetch } = useCoaches();
  const mutation = useCoachMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(defaultForm);

  const activeCount = coaches.filter(c => c.active_status).length;

  const openCreate = () => { setEditing(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (coach: Coach) => {
    setEditing(coach);
    setForm({ full_name: coach.full_name, phone_number: coach.phone_number, email: coach.email, notes: coach.notes || "" });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editing) mutation.mutate({ action: "update", coach: { coach_id: editing.coach_id, ...form } });
    else mutation.mutate({ action: "add", coach: form });
    setOpen(false);
  };

  const toggleActive = (coach: Coach) => {
    if (coach.active_status) {
      useConfirmStore.getState().show({
        title: 'Nonaktifkan Coach?',
        message: `Coach "${coach.full_name}" akan dinonaktifkan.`,
        variant: 'warning',
        onConfirm: () => mutation.mutate({ action: "update", coach: { coach_id: coach.coach_id, active_status: false } }),
      });
    } else {
      mutation.mutate({ action: "update", coach: { coach_id: coach.coach_id, active_status: true } });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('coaches.title')}</h1>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mt-0.5">{activeCount} aktif</p>
        </div>
        <Button onClick={openCreate}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('coaches.add')}</span>
        </Button>
      </div>

      {/* List */}
      {isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {coaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <Dumbbell size={32} className="mb-3" />
              <p className="text-sm">Belum ada pelatih</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {coaches.map(coach => (
                <div key={coach.coach_id} className="flex items-center gap-3 px-5 py-4 hover:bg-zen-bg transition-colors">
                  <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                    {initials(coach.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{coach.full_name}</p>
                    <p className="text-xs text-zen-ink/40 truncate">{coach.phone_number || coach.email || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline ${coach.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {coach.active_status ? t('members.active') : t('members.inactive')}
                    </span>
                    <button
                      onClick={() => openEdit(coach)}
                      className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-brand transition-colors text-xs font-bold"
                      title={t('common.edit')}
                    >
                      ✏
                    </button>
                    {useAuthStore.getState().user?.role === 'owner' && (
                      <button
                        onClick={() => toggleActive(coach)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors ${coach.active_status ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {coach.active_status ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `${t('common.edit')} Coach` : t('coaches.add')}>
        <div className="space-y-4">
          <Input label={t('coaches.name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label={t('coaches.phone')} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <Input label={t('coaches.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={t('coaches.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSubmit}>{editing ? t('common.save') : t('common.add')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
