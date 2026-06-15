import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/utils/zodResolver';
import { useMembers, useMemberMutation, useSearchPaginate, useMemberPackages, usePackages, usePurchasePackage } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { useFeature } from '@/hooks/useFeature';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { Button, Input, Select, Modal, TableSkeleton, QueryError, SearchBar } from '@/components/ui';
import { SmartSelect } from '@/components/ui/SmartSelect';
import type { Member } from '@/types';
import { formatDate, formatCurrency } from '@/utils';
import { memberSchema, type MemberFormData } from '@/utils/schemas';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, ChevronRight, UserRound, Package } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { MemberDetailSheet } from './MemberDetailSheet';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function MembersPage() {
  const { t } = useTranslation();
  const isPro = useFeature('pro');
  const { data: members = [], isLoading, isError, refetch } = useMembers();
  const { data: allPackages = [] } = useMemberPackages();
  const { data: catalog = [], isLoading: catalogLoading } = usePackages();
  const purchase = usePurchasePackage();
  const addToast = useToastStore(s => s.addToast);
  const mutation = useMemberMutation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buyFor, setBuyFor] = useState<Member | null>(null);
  const [buyPkgId, setBuyPkgId] = useState('');
  const [detailMember, setDetailMember] = useState<Member | null>(null);

  // Ringkasan status paket per member: aktif (jumlah sisa sesi), pending, atau belum punya.
  const pkgStatus = (memberId: string): { label: string; cls: string } => {
    const mps = allPackages.filter(p => p.member_id === memberId);
    const active = mps.filter(p => p.status === 'active');
    if (active.length) {
      const sisa = active.reduce((s, p) => s + p.remaining_sessions, 0);
      return { label: `Aktif · ${sisa} sesi`, cls: 'bg-green-100 text-green-700' };
    }
    if (mps.some(p => p.status === 'pending')) return { label: 'Belum bayar', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Belum punya paket', cls: 'bg-zen-ink/8 text-zen-ink/50' };
  };

  const doBuy = () => {
    if (!buyFor || !buyPkgId) return;
    purchase.mutate({ member_id: buyFor.member_id, package_id: buyPkgId }, {
      onSuccess: () => { addToast('Paket ditambahkan — lanjut ke Pembayaran untuk settle', 'success'); setBuyFor(null); setBuyPkgId(''); },
      onError: (e) => addToast(e instanceof Error ? e.message : 'Gagal beli paket', 'error'),
    });
  };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MemberFormData>({ resolver: zodResolver(memberSchema) });

  const { query, setQuery, pageItems, page, setPage, totalPages, totalFiltered } = useSearchPaginate(
    members,
    (m, q) => m.full_name.toLowerCase().includes(q) || (m.phone_number ?? '').includes(q) || (m.email ?? '').toLowerCase().includes(q),
  );

  const activeCount = members.filter(m => m.status_active).length;

  // Pro insight — segmentasi dari allPackages (useMemberPackages) yang sudah di-fetch.
  const withActivePkg = new Set(allPackages.filter(p => p.status === 'active').map(p => p.member_id));
  const segActive = members.filter(m => withActivePkg.has(m.member_id)).length;
  const segNone = Math.max(0, members.length - segActive);
  // Paket mau habis: aktif dengan sisa sesi ≤ 2.
  const expiringSoonCount = allPackages.filter(p => p.status === 'active' && p.remaining_sessions <= 2).length;

  const openAdd = () => {
    reset({ full_name: '', phone_number: '', email: '', gender: 'male', birth_date: '', address: '', notes: '' });
    setEditingId(null);
    setModalOpen(true);
  };
  const openEdit = (row: Member) => {
    reset(row as any);
    setEditingId(row.member_id);
    setModalOpen(true);
  };

  const onSubmit = (data: MemberFormData) => {
    mutation.mutate(
      { action: editingId ? 'update' : 'add', member: editingId ? { ...data, member_id: editingId } : { ...data, join_date: new Date().toISOString().split('T')[0] } },
      { onSuccess: () => { setModalOpen(false); reset(); } }
    );
  };

  const archive = (row: Member) => {
    useConfirmStore.getState().show({
      title: 'Arsipkan Member?',
      message: `Member "${row.full_name}" akan diarsipkan dan tidak tampil di daftar aktif.`,
      variant: 'danger',
      onConfirm: () => mutation.mutate({ action: 'archive', member: { member_id: row.member_id } }),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('members.title')}</h1>
          <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mt-0.5">{activeCount} aktif</p>
        </div>
        <Button onClick={openAdd}>
          <span className="flex items-center gap-1.5"><Plus size={15} />{t('members.add')}</span>
        </Button>
      </div>

      {/* Search */}
      <SearchBar value={query} onChange={setQuery} placeholder={t('members.search')} />

      {/* Pro: insight segmentasi member */}
      {isPro && members.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Punya Paket Aktif</p>
            <p className="text-lg font-bold mt-1 tracking-tight text-green-600">{segActive}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Belum Ada Paket</p>
            <p className="text-lg font-bold mt-1 tracking-tight text-zen-ink/60">{segNone}</p>
          </div>
          <div className="bg-white rounded-3xl p-4 border border-zen-ink/5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40">Paket Mau Habis</p>
            <p className="text-lg font-bold mt-1 tracking-tight text-amber-500">{expiringSoonCount}</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? <TableSkeleton /> : isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <UserRound size={32} className="mb-3" />
              <p className="text-sm">{query ? 'Tidak ada hasil' : 'Belum ada member'}</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {pageItems.map(m => (
                <div
                  key={m.member_id}
                  onClick={() => setDetailMember(m)}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-zen-bg transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-2xl bg-zen-brand/10 text-zen-brand font-bold text-xs flex items-center justify-center shrink-0">
                    {initials(m.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{m.full_name}</p>
                    <p className="text-xs text-zen-ink/40 truncate">{m.phone_number || m.email || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => { const st = pkgStatus(m.member_id); return (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline ${st.cls}`}>{st.label}</span>
                    ); })()}
                    <span className="text-[10px] text-zen-ink/30 hidden md:inline">{formatDate(m.join_date)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setBuyFor(m); setBuyPkgId(''); }}
                        className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-brand transition-colors"
                        title="Beli paket"
                      >
                        <Package size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(m); }}
                        className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-zen-brand/10 flex items-center justify-center text-zen-ink/40 hover:text-zen-brand transition-colors text-xs font-bold"
                        title={t('common.edit')}
                      >
                        ✏
                      </button>
                      {useAuthStore.getState().user?.role === 'owner' && (
                        <button
                          onClick={e => { e.stopPropagation(); archive(m); }}
                          className="w-8 h-8 rounded-xl bg-zen-bg hover:bg-red-50 flex items-center justify-center text-zen-ink/30 hover:text-red-400 transition-colors text-xs"
                          title={t('members.archive')}
                        >
                          🗃
                        </button>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-zen-ink/20" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Beli Paket modal */}
      <Modal open={!!buyFor} onClose={() => { setBuyFor(null); setBuyPkgId(''); }} title={`Beli Paket — ${buyFor?.full_name ?? ''}`}>
        <div className="space-y-4">
          <SmartSelect
            label="Paket"
            placeholder="Pilih paket..."
            options={catalog.map(p => ({ value: p.package_id, label: `${p.package_name} (${p.package_category === 'pribadi' ? 'Private' : 'Reguler'}) — ${formatCurrency(p.package_price)}` }))}
            value={buyPkgId}
            loading={catalogLoading}
            onChange={v => setBuyPkgId(v)}
          />
          <p className="text-[11px] text-zen-ink/40 leading-relaxed">
            Paket akan berstatus <b>belum bayar</b>. Lanjut ke menu Pembayaran untuk menyelesaikan, lalu member bisa ikut sesi.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setBuyFor(null); setBuyPkgId(''); }}>{t('common.cancel')}</Button>
            <Button onClick={doBuy} disabled={!buyPkgId || purchase.isPending}>
              {purchase.isPending ? 'Memproses...' : 'Beli Paket'}
            </Button>
          </div>
        </div>
      </Modal>

      <Pagination page={page} totalPages={totalPages} totalItems={totalFiltered} onPageChange={setPage} />

      {/* Detail sheet (view-only) */}
      <MemberDetailSheet member={detailMember} onClose={() => setDetailMember(null)} />

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? `${t('common.edit')} ${t('members.title')}` : t('members.add')} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <Input label={t('members.name')} error={errors.full_name?.message} {...register('full_name')} />
          <Input label={t('members.phone')} error={errors.phone_number?.message} {...register('phone_number')} />
          <Input label={t('members.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Select label={t('members.gender')} options={[{ value: 'male', label: t('members.male') }, { value: 'female', label: t('members.female') }, { value: 'other', label: t('members.other') }]} {...register('gender')} />
          <Input label={t('members.birth_date')} type="date" {...register('birth_date')} />
          <Input label={t('members.address')} {...register('address')} className="col-span-2" />
          <Input label={t('members.notes')} {...register('notes')} className="col-span-2" />
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
