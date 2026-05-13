import { useState } from 'react';
import { useCoachCommissions, useCoaches, useMembers } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import { Card, DataTable, DateRangeFilter, Select, StatCard } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';

export default function CommissionsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'owner';

  const [coachFilter, setCoachFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filterCoachId = isAdmin ? coachFilter || undefined : user?.id;

  const { data: commissions = [] } = useCoachCommissions({ coach_id: filterCoachId, startDate: startDate || undefined, endDate: endDate || undefined });
  const { data: coaches = [] } = useCoaches();
  const { data: members = [] } = useMembers();

  const coachMap = Object.fromEntries(coaches.map((c) => [c.coach_id, c.full_name]));
  const memberMap = Object.fromEntries(members.map((m) => [m.member_id, m.full_name]));

  const totalKomisi = commissions.reduce((sum, c) => sum + c.commission_amount, 0);

  const columns = [
    { key: 'date', label: 'Tanggal', render: (r: any) => formatDate(r.date) },
    { key: 'coach_id', label: 'Coach', render: (r: any) => coachMap[r.coach_id] ?? '-' },
    { key: 'member_id', label: 'Member', render: (r: any) => memberMap[r.member_id] ?? '-' },
    { key: 'package_price', label: 'Harga Paket', render: (r: any) => formatCurrency(r.package_price) },
    { key: 'commission_percentage', label: 'Persentase', render: (r: any) => `${r.commission_percentage}%` },
    { key: 'commission_amount', label: 'Komisi', render: (r: any) => formatCurrency(r.commission_amount) },
  ];

  return (
    <div className="space-y-6">
      <StatCard title="Total Komisi" value={formatCurrency(totalKomisi)} />

      <Card title="Komisi">
        <div className="flex flex-wrap gap-4 mb-4">
          {isAdmin && (
            <Select
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
              options={[{ value: '', label: 'Semua Coach' }, ...coaches.map((c) => ({ value: c.coach_id, label: c.full_name }))]}
              label="Coach"
            />
          )}
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        </div>
        <DataTable columns={columns} data={commissions} emptyMessage="Belum ada data komisi" />
      </Card>
    </div>
  );
}
