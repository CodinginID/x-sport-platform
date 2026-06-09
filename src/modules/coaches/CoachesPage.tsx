import { useState } from "react";
import { useCoaches, useCoachMutation, usePackages, usePackageCoaches, useSearchPaginate } from "@/hooks";
import { useAuthStore } from "@/stores/auth";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { Modal, Button, Input, QueryError, SearchBar } from "@/components/ui";
import { ListSkeleton } from "@/components/Skeleton";
import { Pagination } from "@/components/Pagination";
import { DetailSheet, DetailRow, DetailSection } from "@/components/DetailSheet";
import { Coach } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency } from "@/utils";
import { Plus, Dumbbell, Phone, Mail, FileText, Boxes } from "lucide-react";

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const defaultForm = { full_name: "", phone_number: "", email: "", notes: "" };

export default function CoachesPage() {
  const { t } = useTranslation();
  const { data: coaches = [], isLoading, isError, refetch } = useCoaches();
  const mutation = useCoachMutation();
  const { data: packages = [] } = usePackages();
  const { data: allPackageCoaches = [] } = usePackageCoaches();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coach | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [detail, setDetail] = useState<Coach | null>(null);

  const { query, setQuery, pageItems, page, setPage, totalPages, totalFiltered } = useSearchPaginate(
    coaches,
    (c, q) => c.full_name.toLowerCase().includes(q) || (c.phone_number ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q),
  );

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

      {/* Search */}
      <SearchBar value={query} onChange={setQuery} placeholder="Cari coach..." />

      {/* List */}
      {isLoading ? <ListSkeleton rows={5} /> : isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <Dumbbell size={32} className="mb-3" />
              <p className="text-sm">{query ? 'Tidak ada hasil' : 'Belum ada pelatih'}</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {pageItems.map(coach => (
                <div
                  key={coach.coach_id}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-zen-bg transition-colors cursor-pointer"
                  onClick={() => setDetail(coach)}
                >
                  <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                    {initials(coach.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{coach.full_name}</p>
                    <p className="text-xs text-zen-ink/40 truncate">{coach.phone_number || coach.email || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
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

      <Pagination page={page} totalPages={totalPages} totalItems={totalFiltered} onPageChange={setPage} />

      {/* Detail Sheet */}
      {detail && (() => {
        const coachPackages = allPackageCoaches
          .filter(pc => pc.coach_id === detail.coach_id)
          .map(pc => ({ pkg: packages.find(p => p.package_id === pc.package_id), pct: pc.commission_percentage }))
          .filter(x => x.pkg);
        return (
          <DetailSheet
            open={!!detail}
            onClose={() => setDetail(null)}
            title={detail.full_name}
            subtitle={detail.active_status ? 'Aktif' : 'Nonaktif'}
          >
            {/* Avatar */}
            <div className="flex justify-center pt-1 pb-2">
              <div className="w-16 h-16 rounded-[20px] bg-zen-brand/10 text-zen-brand font-black text-xl flex items-center justify-center">
                {initials(detail.full_name)}
              </div>
            </div>

            <DetailSection title="Informasi">
              {detail.phone_number && <DetailRow label="Telepon" value={<span className="flex items-center gap-1"><Phone size={11} />{detail.phone_number}</span>} />}
              {detail.email && <DetailRow label="Email" value={<span className="flex items-center gap-1"><Mail size={11} />{detail.email}</span>} />}
              <DetailRow label="Status" value={
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${detail.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {detail.active_status ? 'Aktif' : 'Nonaktif'}
                </span>
              } />
            </DetailSection>

            {detail.notes && (
              <DetailSection title="Catatan">
                <div className="py-2.5 flex gap-2 text-xs text-zen-ink/60">
                  <FileText size={13} className="shrink-0 mt-0.5" />
                  <span>{detail.notes}</span>
                </div>
              </DetailSection>
            )}

            {coachPackages.length > 0 && (
              <DetailSection title="Paket yang Dipegang">
                {coachPackages.map(({ pkg, pct }) => pkg && (
                  <div key={pkg.package_id} className="flex items-center gap-3 py-2.5 border-b border-zen-ink/5 last:border-0">
                    <div className="w-7 h-7 rounded-xl bg-zen-brand/10 flex items-center justify-center shrink-0">
                      <Boxes size={12} className="text-zen-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{pkg.package_name}</p>
                      <p className="text-[11px] text-zen-ink/40">{formatCurrency(pkg.package_price)}</p>
                    </div>
                    <span className="text-xs font-bold text-zen-brand">{pct}%</span>
                  </div>
                ))}
              </DetailSection>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setDetail(null); openEdit(detail); }}
                className="flex-1 py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl"
              >
                Edit Coach
              </button>
            </div>
          </DetailSheet>
        );
      })()}

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
