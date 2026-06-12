import { useState } from "react";
import { usePackages, usePackageMutation, useCoaches, usePackageCoaches, usePackageCoachMutation, useSearchPaginate } from "@/hooks";
import { formatCurrency } from "@/utils";
import { Button, Modal, Input, Select, NumericInput, SearchBar } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import { DetailSheet, DetailRow, DetailSection } from "@/components/DetailSheet";
import { Pagination } from "@/components/Pagination";
import { Package, PackageCoach } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Trash2, Plus, Boxes, Calendar, Hash, Clock } from "lucide-react";

export default function PackagesPage() {
  const { t } = useTranslation();
  const { data: packages = [], isLoading: pkgLoading } = usePackages();
  const mutation = usePackageMutation();
  const { data: coaches = [] } = useCoaches();
  const { data: allPackageCoaches = [] } = usePackageCoaches();
  const coachMutation = usePackageCoachMutation();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [detail, setDetail] = useState<Package | null>(null);

  const { query, setQuery, pageItems, page, setPage, totalPages, totalFiltered } = useSearchPaginate(
    packages,
    (p, q) => p.package_name.toLowerCase().includes(q),
  );
  const [form, setForm] = useState({ package_name: "", package_type: "session" as Package["package_type"], session_count: 0, valid_days: 0, package_price: 0, default_capacity: 1, description: "" });
  const [assignedList, setAssignedList] = useState<{ coach_id: string; commission_percentage: number }[]>([]);
  const [addCoachId, setAddCoachId] = useState("");
  const [addCommission, setAddCommission] = useState(10);

  const openCreate = () => {
    setEditing(null);
    setForm({ package_name: "", package_type: "session", session_count: 0, valid_days: 0, package_price: 0, default_capacity: 1, description: "" });
    setAssignedList([]);
    setModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({ package_name: pkg.package_name, package_type: pkg.package_type, session_count: pkg.session_count ?? 0, valid_days: pkg.valid_days, package_price: pkg.package_price, default_capacity: pkg.default_capacity ?? 1, description: pkg.description });
    const existing = allPackageCoaches.filter(pc => pc.package_id === pkg.package_id);
    setAssignedList(existing.map(pc => ({ coach_id: pc.coach_id, commission_percentage: pc.commission_percentage })));
    setModal(true);
  };

  const handleSubmit = async () => {
    // Fold in a coach that's selected in the dropdown but not yet committed via "+",
    // so the assignment saves whether or not the user clicked the "+" button.
    const finalAssigned = addCoachId && !assignedList.some(a => a.coach_id === addCoachId)
      ? [...assignedList, { coach_id: addCoachId, commission_percentage: addCommission }]
      : assignedList;

    // Await every write so coach links are actually persisted before closing the modal,
    // and so a failed link surfaces its error toast instead of failing silently.
    try {
      if (editing) {
        await mutation.mutateAsync({ action: "update", pkg: { package_id: editing.package_id, ...form } });
        const existing = allPackageCoaches.filter(pc => pc.package_id === editing.package_id);
        for (const pc of existing) {
          if (!finalAssigned.some(a => a.coach_id === pc.coach_id)) {
            await coachMutation.mutateAsync({ action: 'remove', package_id: editing.package_id, coach_id: pc.coach_id });
          }
        }
        for (const a of finalAssigned) {
          await coachMutation.mutateAsync({ action: 'add', package_id: editing.package_id, coach_id: a.coach_id, commission_percentage: a.commission_percentage });
        }
      } else {
        const newPkg = await mutation.mutateAsync({ action: "add", pkg: { ...form, active_status: true } });
        if (newPkg?.package_id) {
          for (const a of finalAssigned) {
            await coachMutation.mutateAsync({ action: 'add', package_id: newPkg.package_id, coach_id: a.coach_id, commission_percentage: a.commission_percentage });
          }
        }
      }
      setModal(false);
    } catch {
      // Error toast already shown by the mutation's onError; keep the modal open to retry.
    }
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

  const getCoachName = (id: string) => coaches.find(c => c.coach_id === id)?.full_name ?? '-';
  const activeCoaches = coaches.filter(c => c.active_status);
  const availableCoaches = activeCoaches.filter(c => !assignedList.some(a => a.coach_id === c.coach_id));

  const getPackageCoaches = (pkg_id: string) => allPackageCoaches.filter(pc => pc.package_id === pkg_id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('packages.title')}</h1>
        <Button onClick={openCreate}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('packages.add')}</span>
        </Button>
      </div>

      {/* Search */}
      <SearchBar value={query} onChange={setQuery} placeholder="Cari paket..." />

      {/* List */}
      {pkgLoading ? <ListSkeleton rows={4} /> : <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
            <Boxes size={32} className="mb-3" />
            <p className="text-sm">{query ? 'Tidak ada hasil' : 'Belum ada paket'}</p>
          </div>
        ) : (
          <div className="divide-y divide-zen-ink/5">
            {pageItems.map(pkg => {
              const pcs = getPackageCoaches(pkg.package_id);
              return (
                <div key={pkg.package_id} className="px-5 py-4 hover:bg-zen-bg transition-colors cursor-pointer" onClick={() => setDetail(pkg)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand flex items-center justify-center shrink-0 mt-0.5">
                      <Boxes size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold">{pkg.package_name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zen-bg text-zen-ink/60">
                          {pkg.package_type === 'session' ? t('packages.session') : t('packages.duration')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {pkg.active_status ? t('members.active') : t('members.inactive')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zen-brand">{formatCurrency(pkg.package_price)}</p>
                      {pcs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pcs.map(pc => (
                            <span key={pc.coach_id} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zen-brand/5 text-zen-brand">
                              {getCoachName(pc.coach_id)} <span className="opacity-60">{pc.commission_percentage}%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(pkg)}
                        className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-brand transition-colors text-xs font-bold"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => toggleActive(pkg)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-colors ${pkg.active_status ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {pkg.active_status ? 'Off' : 'On'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      <Pagination page={page} totalPages={totalPages} totalItems={totalFiltered} onPageChange={setPage} />

      {/* Detail Sheet */}
      {detail && (() => {
        const pcs = getPackageCoaches(detail.package_id);
        return (
          <DetailSheet
            open={!!detail}
            onClose={() => setDetail(null)}
            title={detail.package_name}
            subtitle={detail.active_status ? 'Aktif' : 'Nonaktif'}
          >
            {/* Hero price */}
            <div className="bg-zen-brand/8 rounded-2xl px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zen-brand/15 flex items-center justify-center shrink-0">
                <Boxes size={17} className="text-zen-brand" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-zen-brand/60">Harga Paket</p>
                <p className="text-2xl font-black text-zen-brand">{formatCurrency(detail.package_price)}</p>
              </div>
            </div>

            <DetailSection title="Detail Paket">
              <DetailRow label="Tipe" value={detail.package_type === 'session' ? 'Per Sesi' : 'Durasi'} />
              {detail.session_count != null && (
                <DetailRow label="Jumlah Sesi" value={<span className="flex items-center gap-1"><Hash size={11} />{detail.session_count} sesi</span>} accent />
              )}
              <DetailRow label="Masa Aktif" value={<span className="flex items-center gap-1"><Calendar size={11} />{detail.valid_days} hari</span>} />
              <DetailRow label="Status" value={
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${detail.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {detail.active_status ? 'Aktif' : 'Nonaktif'}
                </span>
              } />
            </DetailSection>

            {detail.description && (
              <DetailSection title="Deskripsi">
                <p className="py-2.5 text-xs text-zen-ink/60 leading-relaxed">{detail.description}</p>
              </DetailSection>
            )}

            {pcs.length > 0 && (
              <DetailSection title="Coach & Komisi">
                {pcs.map(pc => (
                  <div key={pc.coach_id} className="flex items-center gap-3 py-2.5 border-b border-zen-ink/5 last:border-0">
                    <div className="w-7 h-7 rounded-xl bg-zen-brand/10 text-zen-brand font-bold text-[10px] flex items-center justify-center shrink-0">
                      {getCoachName(pc.coach_id).slice(0, 2).toUpperCase()}
                    </div>
                    <p className="flex-1 text-xs font-bold truncate">{getCoachName(pc.coach_id)}</p>
                    <span className="text-xs font-bold text-zen-brand">{pc.commission_percentage}%</span>
                  </div>
                ))}
              </DetailSection>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setDetail(null); openEdit(detail); }}
                className="flex-1 py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl"
              >
                Edit Paket
              </button>
            </div>
          </DetailSheet>
        );
      })()}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `${t('common.edit')} ${t('packages.title')}` : t('packages.add')} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('packages.name')} value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} required className="col-span-2" />
            <Select label={t('packages.type')} value={form.package_type} onChange={(e) => setForm({ ...form, package_type: e.target.value as Package["package_type"] })}
              options={[{ value: "session", label: t('packages.session') }, { value: "duration", label: t('packages.duration') }]} />
            <Input label={t('packages.session_count')} type="number" value={form.session_count} onChange={(e) => setForm({ ...form, session_count: +e.target.value })} />
            <Input label={t('packages.valid_days')} type="number" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: +e.target.value })} />
            <NumericInput label={t('packages.price')} value={form.package_price} onChange={(v) => setForm({ ...form, package_price: v })} />
            <Input label="Kapasitas default per sesi" type="number" min={1} value={form.default_capacity} onChange={(e) => setForm({ ...form, default_capacity: Math.max(1, +e.target.value) })} />
          </div>
          <Input label={t('packages.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* Coach assignment */}
          <div className="pt-4 border-t border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-3">Assign Coach & Komisi</p>
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
                    <button type="button" onClick={() => setAssignedList(assignedList.filter(x => x.coach_id !== a.coach_id))}
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{editing ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
