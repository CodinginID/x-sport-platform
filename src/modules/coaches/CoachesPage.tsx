import { useState } from "react";
import { useCoaches, useCoachMutation } from "@/hooks";
import { useAuthStore } from "@/stores/auth";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { Modal, Button, Input, Select, DataTable, Badge, QueryError } from "@/components/ui";
import { Coach } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

const defaultForm = { full_name: "", phone_number: "", email: "", commission_type: "percentage" as "percentage" | "fixed", commission_percentage: 0, notes: "" };

export default function CoachesPage() {
  const { t } = useTranslation();
  const { data: coaches = [], isError, refetch } = useCoaches();
  const mutation = useCoachMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(defaultForm);

  const openCreate = () => { setEditing(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (coach: Coach) => { setEditing(coach); setForm({ full_name: coach.full_name, phone_number: coach.phone_number, email: coach.email, commission_type: coach.commission_type, commission_percentage: coach.commission_percentage, notes: coach.notes || "" }); setOpen(true); };

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

  const columns = [
    { key: "full_name", label: t('coaches.name') },
    { key: "phone_number", label: t('coaches.phone') },
    { key: "email", label: t('coaches.email') },
    { key: "commission_type", label: t('coaches.commission_type') },
    { key: "commission_percentage", label: t('coaches.commission_pct') },
    { key: "active_status", label: "Status", render: (coach: Coach) => <Badge variant={coach.active_status ? "success" : "danger"}>{coach.active_status ? t('members.active') : t('members.inactive')}</Badge> },
    { key: "actions", label: "", render: (coach: Coach) => (
      <>
        <Button size="sm" variant="ghost" onClick={() => openEdit(coach)}>{t('common.edit')}</Button>
        {useAuthStore.getState().user?.role === 'owner' && <Button size="sm" variant="ghost" onClick={() => toggleActive(coach)}>{coach.active_status ? t('coaches.deactivate') : t('coaches.activate')}</Button>}
      </>
    )},
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t('coaches.title')}</h1>
        <Button onClick={openCreate}>{t('coaches.add')}</Button>
      </div>
      {isError ? <QueryError onRetry={() => refetch()} /> : <DataTable data={coaches} columns={columns} />}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t('common.edit') + ' Coach' : t('coaches.add')}>
        <div className="space-y-4">
          <Input label={t('coaches.name')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label={t('coaches.phone')} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <Input label={t('coaches.email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label={t('coaches.commission_type')} value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value as "percentage" | "fixed" })} options={[{ label: "Percentage", value: "percentage" }, { label: "Fixed", value: "fixed" }]} />
          <Input label={t('coaches.commission_pct')} type="number" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: Number(e.target.value) })} />
          <Input label={t('coaches.notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleSubmit}>{editing ? t('common.save') : t('common.add')}</Button>
        </div>
      </Modal>
    </div>
  );
}
