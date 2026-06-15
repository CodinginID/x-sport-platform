import { DetailSheet, DetailRow, DetailSection } from '@/components/DetailSheet';
import { EntityCard } from '@/components/EntityCard';
import { useFeature } from '@/hooks/useFeature';
import { useStudioStore } from '@/stores/studio';
import { Coach } from '@/types';
import { Phone, Mail, FileText } from 'lucide-react';

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

interface Props {
  coach: Coach;
  onClose: () => void;
  onEdit: (coach: Coach) => void;
}

export function CoachDetailSheet({ coach, onClose, onEdit }: Props) {
  const isPro = useFeature('pro');
  const studioName = useStudioStore(s => s.name);

  return (
    <DetailSheet
      open
      onClose={onClose}
      title={coach.full_name}
      subtitle={coach.active_status ? 'Aktif' : 'Nonaktif'}
    >
      {/* Pro card */}
      {isPro && (
        <EntityCard
          variant="coach"
          studioName={studioName}
          name={coach.full_name}
          subtitle={`ID ${coach.coach_id.slice(0, 8).toUpperCase()}`}
          infoRows={[
            { label: 'Komisi Reguler', value: `${coach.commission_regular_pct ?? 0}%` },
            { label: 'Komisi Pribadi', value: `${coach.commission_private_pct ?? 0}%` },
            { label: 'Status', value: coach.active_status ? 'Aktif' : 'Nonaktif' },
          ]}
          qrValue={coach.coach_id}
        />
      )}

      {/* Avatar (non-pro fallback) */}
      {!isPro && (
        <div className="flex justify-center pt-1 pb-2">
          <div className="w-16 h-16 rounded-[20px] bg-zen-brand/10 text-zen-brand font-black text-xl flex items-center justify-center">
            {initials(coach.full_name)}
          </div>
        </div>
      )}

      <DetailSection title="Informasi">
        {coach.phone_number && <DetailRow label="Telepon" value={<span className="flex items-center gap-1"><Phone size={11} />{coach.phone_number}</span>} />}
        {coach.email && <DetailRow label="Email" value={<span className="flex items-center gap-1"><Mail size={11} />{coach.email}</span>} />}
        <DetailRow label="Status" value={
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${coach.active_status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {coach.active_status ? 'Aktif' : 'Nonaktif'}
          </span>
        } />
      </DetailSection>

      <DetailSection title="Komisi">
        <DetailRow label="Reguler" value={<span className="font-bold text-zen-brand">{coach.commission_regular_pct ?? 0}%</span>} />
        <DetailRow label="Pribadi" value={<span className="font-bold text-zen-brand">{coach.commission_private_pct ?? 0}%</span>} />
      </DetailSection>

      {coach.notes && (
        <DetailSection title="Catatan">
          <div className="py-2.5 flex gap-2 text-xs text-zen-ink/60">
            <FileText size={13} className="shrink-0 mt-0.5" />
            <span>{coach.notes}</span>
          </div>
        </DetailSection>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => { onClose(); onEdit(coach); }}
          className="flex-1 py-3 bg-zen-brand text-white text-sm font-bold rounded-2xl"
        >
          Edit Coach
        </button>
      </div>
    </DetailSheet>
  );
}
