import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMembers, useMemberMutation } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { useConfirmStore } from '@/components/ConfirmDialog';
import { Button, Input, Select, Modal, DataTable, Badge, Card, TableSkeleton, QueryError } from '@/components/ui';
import type { Member } from '@/types';
import { formatDate } from '@/utils';
import { memberSchema, type MemberFormData } from '@/utils/schemas';
import { useTranslation } from '@/hooks/useTranslation';

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

  const openAdd = () => { reset({ full_name: '', phone_number: '', email: '', gender: 'male', birth_date: '', address: '', notes: '' }); setEditingId(null); setModalOpen(true); };
  const openEdit = (row: any) => { reset(row); setEditingId(row.member_id); setModalOpen(true); };

  const onSubmit = (data: MemberFormData) => {
    mutation.mutate(
      { action: editingId ? 'update' : 'add', member: editingId ? { ...data, member_id: editingId } : { ...data, join_date: new Date().toISOString().split('T')[0] } },
      { onSuccess: () => { setModalOpen(false); reset(); } }
    );
  };

  const archive = (row: any) => {
    useConfirmStore.getState().show({
      title: 'Arsipkan Member?',
      message: `Member "${row.full_name}" akan diarsipkan dan tidak tampil di daftar aktif.`,
      variant: 'danger',
      onConfirm: () => mutation.mutate({ action: 'archive', member: { member_id: row.member_id } }),
    });
  };

  const columns = [
    { key: 'full_name', label: t('members.name') },
    { key: 'phone_number', label: t('members.phone') },
    { key: 'email', label: t('members.email') },
    { key: 'join_date', label: t('members.join_date'), render: (r: any) => formatDate(r.join_date) },
    { key: 'status_active', label: t('members.status'), render: (r: any) => <Badge variant={r.status_active ? 'success' : 'danger'}>{r.status_active ? t('members.active') : t('members.inactive')}</Badge> },
    {
      key: 'actions', label: t('common.actions'), render: (r: any) => (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>{t('common.edit')}</Button>
          {useAuthStore.getState().user?.role === 'owner' && <Button size="sm" variant="danger" onClick={() => archive(r)}>{t('members.archive')}</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Input placeholder={t('members.search')} value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Button onClick={openAdd}>{t('members.add')}</Button>
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={row => navigate(`/members/${row.member_id}`)} />
        {isLoading && <TableSkeleton />}
        {isError && <QueryError onRetry={() => refetch()} />}
      </Card>

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
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
