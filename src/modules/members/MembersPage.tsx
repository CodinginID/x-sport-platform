import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMembers, useMemberMutation } from '@/hooks';
import { Button, Input, Select, Modal, DataTable, Badge, Card } from '@/components/ui';
import type { Member } from '@/types';
import { formatDate } from '@/utils';

interface MemberForm {
  full_name: string;
  phone_number: string;
  email: string;
  gender: Member['gender'];
  birth_date: string;
  address: string;
  notes: string;
}

export default function MembersPage() {
  const navigate = useNavigate();
  const { data: members = [] } = useMembers();
  const mutation = useMemberMutation();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<MemberForm>();

  const filtered = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { reset({ full_name: '', phone_number: '', email: '', gender: 'male', birth_date: '', address: '', notes: '' }); setEditingId(null); setModalOpen(true); };
  const openEdit = (row: any) => { reset(row); setEditingId(row.member_id); setModalOpen(true); };

  const onSubmit = (data: MemberForm) => {
    mutation.mutate(
      { action: editingId ? 'update' : 'add', member: editingId ? { ...data, member_id: editingId } : { ...data, join_date: new Date().toISOString().split('T')[0] } },
      { onSuccess: () => { setModalOpen(false); reset(); } }
    );
  };

  const archive = (row: any) => {
    mutation.mutate({ action: 'archive', member: { member_id: row.member_id } });
  };

  const columns = [
    { key: 'full_name', label: 'Nama' },
    { key: 'phone_number', label: 'No. Telepon' },
    { key: 'email', label: 'Email' },
    { key: 'join_date', label: 'Tanggal Bergabung', render: (r: any) => formatDate(r.join_date) },
    { key: 'status_active', label: 'Status', render: (r: any) => <Badge variant={r.status_active ? 'success' : 'danger'}>{r.status_active ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      key: 'actions', label: 'Aksi', render: (r: any) => (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => archive(r)}>Arsip</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Input placeholder="Cari nama member..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
          <Button onClick={openAdd}>Tambah Member</Button>
        </div>
        <DataTable columns={columns} data={filtered} onRowClick={row => navigate(`/members/${row.member_id}`)} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Member' : 'Tambah Member'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <Input label="Nama Lengkap" {...register('full_name', { required: true })} />
          <Input label="No. Telepon" {...register('phone_number', { required: true })} />
          <Input label="Email" type="email" {...register('email')} />
          <Select label="Gender" options={[{ value: 'male', label: 'Laki-laki' }, { value: 'female', label: 'Perempuan' }, { value: 'other', label: 'Lainnya' }]} {...register('gender')} />
          <Input label="Tanggal Lahir" type="date" {...register('birth_date')} />
          <Input label="Alamat" {...register('address')} className="col-span-2" />
          <Input label="Catatan" {...register('notes')} className="col-span-2" />
          <div className="col-span-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
