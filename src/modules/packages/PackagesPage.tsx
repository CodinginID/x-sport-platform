import { useState } from "react";
import { usePackages, usePackageMutation } from "@/hooks";
import { formatCurrency } from "@/utils";
import { DataTable, Button, Modal } from "@/components/ui";
import { Package } from "@/types";

export default function PackagesPage() {
  const { data: packages = [], isLoading } = usePackages();
  const mutation = usePackageMutation();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState({ package_name: "", package_type: "session" as Package["package_type"], session_count: 0, valid_days: 0, package_price: 0, description: "" });

  const openCreate = () => { setEditing(null); setForm({ package_name: "", package_type: "session", session_count: 0, valid_days: 0, package_price: 0, description: "" }); setModal(true); };
  const openEdit = (pkg: Package) => { setEditing(pkg); setForm({ package_name: pkg.package_name, package_type: pkg.package_type, session_count: pkg.session_count ?? 0, valid_days: pkg.valid_days, package_price: pkg.package_price, description: pkg.description }); setModal(true); };

  const handleSubmit = () => {
    if (editing) {
      mutation.mutate({ action: "update", pkg: { package_id: editing.package_id, ...form } });
    } else {
      mutation.mutate({ action: "add", pkg: { ...form, active_status: true } });
    }
    setModal(false);
  };

  const toggleActive = (pkg: Package) => {
    mutation.mutate({ action: "update", pkg: { package_id: pkg.package_id, active_status: !pkg.active_status } });
  };

  const columns = [
    { key: "package_name", label: "Nama Paket" },
    { key: "package_type", label: "Tipe" },
    { key: "session_count", label: "Jumlah Sesi" },
    { key: "valid_days", label: "Masa Berlaku (Hari)" },
    { key: "package_price", label: "Harga", render: (row: Package) => formatCurrency(row.package_price) },
    { key: "active_status", label: "Status", render: (row: Package) => row.active_status ? "Aktif" : "Nonaktif" },
    {
      key: "actions", label: "Aksi", render: (row: Package) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openEdit(row)}>Edit</Button>
          <Button size="sm" variant={row.active_status ? "danger" : "primary"} onClick={() => toggleActive(row)}>
            {row.active_status ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Paket</h1>
        <Button onClick={openCreate}>Tambah Paket</Button>
      </div>
      <DataTable columns={columns} data={packages} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Paket" : "Tambah Paket"}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <input className="w-full border p-2 rounded" placeholder="Nama Paket" value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} required />
          <select className="w-full border p-2 rounded" value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value as Package["package_type"] })}>
            <option value="session">Session</option>
            <option value="duration">Duration</option>
          </select>
          <input className="w-full border p-2 rounded" type="number" placeholder="Jumlah Sesi" value={form.session_count} onChange={(e) => setForm({ ...form, session_count: +e.target.value })} />
          <input className="w-full border p-2 rounded" type="number" placeholder="Masa Berlaku (Hari)" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: +e.target.value })} />
          <input className="w-full border p-2 rounded" type="number" placeholder="Harga" value={form.package_price} onChange={(e) => setForm({ ...form, package_price: +e.target.value })} />
          <textarea className="w-full border p-2 rounded" placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button type="submit" className="w-full">{editing ? "Simpan" : "Tambah"}</Button>
        </form>
      </Modal>
    </div>
  );
}
