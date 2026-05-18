import { useState, useEffect } from "react";
import { usePackages, usePackageMutation, useCoaches, usePackageCoaches, usePackageCoachMutation } from "@/hooks";
import { formatCurrency } from "@/utils";
import { DataTable, Button, Modal, Input, Select, Badge, ActionButtons, NumericInput } from "@/components/ui";
import { Package, PackageCoach } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Trash2 } from "lucide-react";

export default function PackagesPage() {
  const { t } = useTranslation();
  const { data: packages = [] } = usePackages();
  const mutation = usePackageMutation();
  const { data: coaches = [] } = useCoaches();
  const { data: allPackageCoaches = [] } = usePackageCoaches();
  const coachMutation = usePackageCoachMutation();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState({ package_name: "", package_type: "session" as Package["package_type"], session_count: 0, valid_days: 0, package_price: 0, description: "" });

  // Inline coach assignment state
  const [assignedList, setAssignedList] = useState<{ coach_id: string; commission_percentage: number }[]>([]);
  const [addCoachId, setAddCoachId] = useState("");
  const [addCommission, setAddCommission] = useState(10);

  const openCreate = () => {
    setEditing(null);
    setForm({ package_name: "", package_type: "session", session_count: 0, valid_days: 0, package_price: 0, description: "" });
    setAssignedList([]);
    setModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({ package_name: pkg.package_name, package_type: pkg.package_type, session_count: pkg.session_count ?? 0, valid_days: pkg.valid_days, package_price: pkg.package_price, description: pkg.description });
    const existing = allPackageCoaches.filter(pc => pc.package_id === pkg.package_id);
    setAssignedList(existing.map(pc => ({ coach_id: pc.coach_id, commission_percentage: pc.commission_percentage })));
    setModal(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      mutation.mutate({ action: "update", pkg: { package_id: editing.package_id, ...form } });
      // Sync coach assignments
      const existing = allPackageCoaches.filter(pc => pc.package_id === editing.package_id);
      // Remove coaches no longer in list
      for (const pc of existing) {
        if (!assignedList.some(a => a.coach_id === pc.coach_id)) {
          coachMutation.mutate({ action: 'remove', package_id: editing.package_id, coach_id: pc.coach_id });
        }
      }
      // Add/update coaches in list
      for (const a of assignedList) {
        coachMutation.mutate({ action: 'add', package_id: editing.package_id, coach_id: a.coach_id, commission_percentage: a.commission_percentage });
      }
    } else {
      mutation.mutate({ action: "add", pkg: { ...form, active_status: true } }, {
        onSuccess: (newPkg: any) => {
          if (newPkg?.package_id) {
            for (const a of assignedList) {
              coachMutation.mutate({ action: 'add', package_id: newPkg.package_id, coach_id: a.coach_id, commission_percentage: a.commission_percentage });
            }
          }
        }
      });
    }
    setModal(false);
  };

  const toggleActive = (pkg: Package) => {
    mutation.mutate({ action: "update", pkg: { package_id: pkg.package_id, active_status: !pkg.active_status } });
  };

  const addCoachToList = () => {
    if (!addCoachId || assignedList.some(a => a.coach_id === addCoachId)) return;
    setAssignedList([...assignedList, { coach_id: addCoachId, commission_percentage: addCommission }]);
    setAddCoachId("");
    setAddCommission(10);
  };

  const removeCoachFromList = (coach_id: string) => {
    setAssignedList(assignedList.filter(a => a.coach_id !== coach_id));
  };

  const getCoachName = (id: string) => coaches.find(c => c.coach_id === id)?.full_name ?? '-';
  const activeCoaches = coaches.filter(c => c.active_status);
  const availableCoaches = activeCoaches.filter(c => !assignedList.some(a => a.coach_id === c.coach_id));

  // Get coaches for a package (for table display)
  const getPackageCoachNames = (pkg_id: string) => {
    const pcs = allPackageCoaches.filter(pc => pc.package_id === pkg_id);
    if (pcs.length === 0) return <span className="text-zen-ink/30 text-xs">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {pcs.map(pc => (
          <span key={pc.coach_id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zen-brand/5 text-[10px] font-bold">
            {getCoachName(pc.coach_id)} <span className="text-zen-brand">{pc.commission_percentage}%</span>
          </span>
        ))}
      </div>
    );
  };

  const columns = [
    { key: "package_name", label: t('packages.name') },
    { key: "package_type", label: t('packages.type'), render: (row: Package) => <Badge variant="default">{row.package_type === 'session' ? t('packages.session') : t('packages.duration')}</Badge> },
    { key: "package_price", label: t('packages.price'), render: (row: Package) => <span className="font-bold">{formatCurrency(row.package_price)}</span> },
    { key: "coaches", label: "Coach", render: (row: Package) => getPackageCoachNames(row.package_id) },
    { key: "active_status", label: "Status", render: (row: Package) => <Badge variant={row.active_status ? 'success' : 'danger'}>{row.active_status ? t('members.active') : t('members.inactive')}</Badge> },
    {
      key: "actions", label: "", render: (row: Package) => (
        <ActionButtons actions={[
          { action: 'edit', onClick: () => openEdit(row) },
          { action: row.active_status ? 'deactivate' : 'activate', onClick: () => toggleActive(row) },
        ]} />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('packages.title')}</h1>
        <Button onClick={openCreate}>{t('packages.add')}</Button>
      </div>
      <DataTable columns={columns} data={packages} />

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('common.edit') + ' ' + t('packages.title') : t('packages.add')} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('packages.name')} value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} required className="col-span-2" />
            <Select label={t('packages.type')} value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value as Package["package_type"] })}
              options={[{ value: "session", label: t('packages.session') }, { value: "duration", label: t('packages.duration') }]} />
            <Input label={t('packages.session_count')} type="number" value={form.session_count} onChange={(e) => setForm({ ...form, session_count: +e.target.value })} />
            <Input label={t('packages.valid_days')} type="number" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: +e.target.value })} />
            <NumericInput label={t('packages.price')} value={form.package_price} onChange={(v) => setForm({ ...form, package_price: v })} />
          </div>
          <Input label={t('packages.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* Coach Assignment Section */}
          <div className="pt-4 border-t border-zen-brand/10">
            <label className="text-xs uppercase tracking-[0.2em] font-bold opacity-60 mb-3 block">Assign Coach & Komisi</label>

            {assignedList.length > 0 && (
              <div className="space-y-2 mb-3">
                {assignedList.map(a => (
                  <div key={a.coach_id} className="flex items-center justify-between p-3 rounded-2xl bg-zen-bg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{getCoachName(a.coach_id)}</span>
                      <span className="text-xs text-zen-brand font-bold">{a.commission_percentage}%</span>
                      {form.package_price > 0 && (
                        <span className="text-[10px] text-zen-ink/40">= {formatCurrency(form.package_price * a.commission_percentage / 100)}/sesi</span>
                      )}
                    </div>
                    <button type="button" onClick={() => removeCoachFromList(a.coach_id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availableCoaches.length > 0 && (
              <div className="flex gap-2 items-end">
                <Select label="Coach" value={addCoachId} onChange={(e) => setAddCoachId(e.target.value)}
                  options={[{ value: "", label: "Pilih coach..." }, ...availableCoaches.map(c => ({ value: c.coach_id, label: c.full_name }))]}
                  className="flex-1" />
                <Input label="%" type="number" min={0} max={100} value={addCommission}
                  onChange={(e) => setAddCommission(+e.target.value)} className="w-20" />
                <Button type="button" onClick={addCoachToList} disabled={!addCoachId} size="sm">+</Button>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full">{editing ? t('common.save') : t('common.add')}</Button>
        </form>
      </Modal>
    </div>
  );
}
