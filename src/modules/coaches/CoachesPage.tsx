import { useState } from "react";
import { useCoaches, useCoachMutation } from "@/hooks";
import { Modal, Button, Input, Select, DataTable, Badge } from "@/components/ui";
import { Coach } from "@/types";

const defaultForm = { full_name: "", phone_number: "", email: "", commission_type: "percentage" as "percentage" | "fixed", commission_percentage: 0, notes: "" };

export default function CoachesPage() {
  const { data: coaches = [] } = useCoaches();
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
    mutation.mutate({ action: "update", coach: { coach_id: coach.coach_id, active_status: !coach.active_status } });
  };

  const columns = [
    { key: "full_name", label: "Nama" },
    { key: "phone_number", label: "Telepon" },
    { key: "email", label: "Email" },
    { key: "commission_type", label: "Tipe Komisi" },
    { key: "commission_percentage", label: "Komisi (%)" },
    { key: "active_status", label: "Status", render: (coach: Coach) => <Badge variant={coach.active_status ? "success" : "danger"}>{coach.active_status ? "Aktif" : "Nonaktif"}</Badge> },
    { key: "actions", label: "", render: (coach: Coach) => (
      <>
        <Button size="sm" variant="ghost" onClick={() => openEdit(coach)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => toggleActive(coach)}>{coach.active_status ? "Nonaktifkan" : "Aktifkan"}</Button>
      </>
    )},
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Coaches</h1>
        <Button onClick={openCreate}>Tambah Coach</Button>
      </div>
      <DataTable data={coaches} columns={columns} />
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Coach" : "Tambah Coach"}>
        <div className="space-y-4">
          <Input label="Nama Lengkap" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="No. Telepon" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Tipe Komisi" value={form.commission_type} onChange={(e) => setForm({ ...form, commission_type: e.target.value as "percentage" | "fixed" })} options={[{ label: "Percentage", value: "percentage" }, { label: "Fixed", value: "fixed" }]} />
          <Input label="Komisi" type="number" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: Number(e.target.value) })} />
          <Input label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={handleSubmit}>{editing ? "Simpan" : "Tambah"}</Button>
        </div>
      </Modal>
    </div>
  );
}
