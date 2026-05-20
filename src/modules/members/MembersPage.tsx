import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMembers, useMemberMutation } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { Button, Input, Select, Modal, TableSkeleton, QueryError } from '@/components/ui';
import type { Member } from '@/types';
import { formatDate } from '@/utils';
import { memberSchema, type MemberFormData } from '@/utils/schemas';
import { useTranslation } from '@/hooks/useTranslation';
import { Search, Plus, ChevronRight, UserRound } from 'lucide-react';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function MembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: members = [], isLoading, isError, refetch } = useMembers();
  const mutation = useMemberMutation();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MemberFormData>({ resolver: zodResolver(memberSchema) });

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = members.filter(m => m.status_active).length;

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
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-zen-ink/30 pointer-events-none" />
        <input
          type="text"
          placeholder={t('members.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-zen-ink/10 rounded-2xl focus:outline-none focus:border-zen-brand focus:ring-2 focus:ring-zen-brand/20"
        />
      </div>

      {/* List */}
      {isLoading ? <TableSkeleton /> : isError ? <QueryError onRetry={() => refetch()} /> : (
        <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-zen-ink/30">
              <UserRound size={32} className="mb-3" />
              <p className="text-sm">{search ? 'Tidak ada hasil' : 'Belum ada member'}</p>
            </div>
          ) : (
            <div className="divide-y divide-zen-ink/5">
              {filtered.map(m => (
                <div
                  key={m.member_id}
                  onClick={() => navigate(`/members/${m.member_id}`)}
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline ${m.status_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {m.status_active ? t('members.active') : t('members.inactive')}
                    </span>
                    <span className="text-[10px] text-zen-ink/30 hidden md:inline">{formatDate(m.join_date)}</span>
                    <div className="flex gap-1">
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
