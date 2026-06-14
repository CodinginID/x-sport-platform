import { useState } from "react";
import { usePackages, usePackageMutation, useSearchPaginate } from "@/hooks";
import { formatCurrency } from "@/utils";
import { Button, Modal, Input, Select, NumericInput, SearchBar } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import { DetailSheet, DetailRow, DetailSection } from "@/components/DetailSheet";
import { Pagination } from "@/components/Pagination";
import { Package } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Boxes, Calendar, Hash } from "lucide-react";

const CATEGORY_LABEL: Record<Package["package_category"], string> = {
  reguler: "Reguler",
  pribadi: "Pribadi",
};

export default function PackagesPage() {
  const { t } = useTranslation();
  const { data: packages = [], isLoading: pkgLoading } = usePackages();
  const mutation = usePackageMutation();

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [detail, setDetail] = useState<Package | null>(null);

  const { query, setQuery, pageItems, page, setPage, totalPages, totalFiltered } = useSearchPaginate(
    packages,
    (p, q) => p.package_name.toLowerCase().includes(q),
  );
  const [form, setForm] = useState({ package_name: "", package_category: "reguler" as Package["package_category"], session_count: 0, valid_days: 0, package_price: 0, description: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ package_name: "", package_category: "reguler", session_count: 0, valid_days: 0, package_price: 0, description: "" });
    setModal(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({ package_name: pkg.package_name, package_category: pkg.package_category, session_count: pkg.session_count ?? 0, valid_days: pkg.valid_days, package_price: pkg.package_price, description: pkg.description });
    setModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        await mutation.mutateAsync({ action: "update", pkg: { package_id: editing.package_id, ...form } });
      } else {
        await mutation.mutateAsync({ action: "add", pkg: { ...form, active_status: true } });
      }
      setModal(false);
    } catch {
      // Error toast already shown by the mutation's onError; keep the modal open to retry.
    }
  };

  const toggleActive = (pkg: Package) => {
    mutation.mutate({ action: "update", pkg: { package_id: pkg.package_id, active_status: !pkg.active_status } });
  };

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
            {pageItems.map(pkg => (
              <div key={pkg.package_id} className="px-5 py-4 hover:bg-zen-bg transition-colors cursor-pointer" onClick={() => setDetail(pkg)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand flex items-center justify-center shrink-0 mt-0.5">
                    <Boxes size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold">{pkg.package_name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zen-bg text-zen-ink/60">
                        {CATEGORY_LABEL[pkg.package_category]}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pkg.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {pkg.active_status ? t('members.active') : t('members.inactive')}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-zen-brand">{formatCurrency(pkg.package_price)}</p>
                    {pkg.session_count != null && pkg.session_count > 0 && (
                      <p className="text-[11px] text-zen-ink/40 mt-0.5">{pkg.session_count} sesi</p>
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
            ))}
          </div>
        )}
      </div>}

      <Pagination page={page} totalPages={totalPages} totalItems={totalFiltered} onPageChange={setPage} />

      {/* Detail Sheet */}
      {detail && (
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
            <DetailRow label="Kategori" value={CATEGORY_LABEL[detail.package_category]} accent />
            {detail.session_count != null && (
              <DetailRow label="Jumlah Sesi" value={<span className="flex items-center gap-1"><Hash size={11} />{detail.session_count} sesi</span>} />
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

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setDetail(null); openEdit(detail); }}
              className="flex-1 py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl"
            >
              Edit Paket
            </button>
          </div>
        </DetailSheet>
      )}

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `${t('common.edit')} ${t('packages.title')}` : t('packages.add')} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('packages.name')} value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} required className="col-span-2" />
            <Select label="Kategori" value={form.package_category} onChange={(e) => setForm({ ...form, package_category: e.target.value as Package["package_category"] })}
              options={[{ value: "reguler", label: "Reguler" }, { value: "pribadi", label: "Pribadi" }]} />
            <Input label={t('packages.session_count')} type="number" value={form.session_count} onChange={(e) => setForm({ ...form, session_count: +e.target.value })} />
            <Input label={t('packages.valid_days')} type="number" value={form.valid_days} onChange={(e) => setForm({ ...form, valid_days: +e.target.value })} />
            <NumericInput label={t('packages.price')} value={form.package_price} onChange={(v) => setForm({ ...form, package_price: v })} className="col-span-2" />
          </div>
          <Input label={t('packages.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{editing ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
