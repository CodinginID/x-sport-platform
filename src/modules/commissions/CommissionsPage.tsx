import { useState } from 'react';
import { useCoachCommissions, useCoaches, useMembers } from '@/hooks';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuthStore } from '@/stores/auth';
import { Card, DataTable, DateRangeFilter, Select, StatCard } from '@/components/ui';
import { formatCurrency, formatDate } from '@/utils';

export default function CommissionsPage() {
  const { t } = useTranslation();
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
    { key: 'date', label: t('commissions.date'), render: (r: any) => formatDate(r.date) },
    { key: 'coach_id', label: t('commissions.coach'), render: (r: any) => coachMap[r.coach_id] ?? '-' },
    { key: 'member_id', label: t('commissions.member'), render: (r: any) => memberMap[r.member_id] ?? '-' },
    { key: 'package_price', label: t('packages.price'), render: (r: any) => formatCurrency(r.package_price) },
    { key: 'commission_percentage', label: t('commissions.pct'), render: (r: any) => `${r.commission_percentage}%` },
    { key: 'commission_amount', label: t('commissions.amount'), render: (r: any) => formatCurrency(r.commission_amount) },
  ];

  return (
    <div className="space-y-6">
      <StatCard title={t('commissions.total')} value={formatCurrency(totalKomisi)} />

      <Card title={t('commissions.title')}>
        <div className="flex flex-wrap gap-4 mb-4">
          {isAdmin && (
            <Select
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
              options={[{ value: '', label: t('reports.select_coach') }, ...coaches.map((c) => ({ value: c.coach_id, label: c.full_name }))]}
              label={t('commissions.coach')}
            />
          )}
          <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        </div>
        <DataTable columns={columns} data={commissions} emptyMessage={t('common.no_data')} />
      </Card>
    </div>
  );
}
