import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useStaff, useStaffMutation } from '@/hooks/useStaff';
import type { StaffUser } from '@/hooks/useStaff';
import {
  Users, Pencil, Loader2, Eye, EyeOff,
  ShieldCheck, UserCircle, KeyRound, X, Check,
  Info, Calendar, Wifi, WifiOff, Clock,
} from 'lucide-react';
import { useConfirmStore } from '@/components/ConfirmDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function StaffEditModal({ staff, onClose }: { staff: StaffUser; onClose: () => void }) {
  const { updateMutation } = useStaffMutation();
  const [fullName, setFullName] = useState(staff.full_name);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Nama harus diisi'); return; }
    if (password && password.length < 6) { setError('Password minimal 6 karakter'); return; }
    try {
      await updateMutation.mutateAsync({
        id: staff.id,
        email: staff.email,
        full_name: fullName !== staff.full_name ? fullName : undefined,
        newPassword: password || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-5 animate-slide-up sm:animate-page-in" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-1" />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Edit Akun</h2>
          <button onClick={onClose} className="text-zen-ink/40 hover:text-zen-ink transition-colors"><X size={18} /></button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs font-bold text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Nama Lengkap</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} autoFocus
              className="w-full bg-zen-bg rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zen-brand/20" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Password Baru (kosongkan jika tidak diganti)</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 karakter"
                className="w-full bg-zen-bg rounded-2xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 ring-zen-brand/20" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/30">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3.5 border border-zen-ink/10 text-zen-ink/60 text-sm font-bold rounded-2xl min-h-[48px]">Batal</button>
            <button type="submit" disabled={updateMutation.isPending}
              className="flex-1 py-3.5 bg-zen-brand text-white text-sm font-bold rounded-2xl min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2">
              {updateMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : <><Check size={14} /> Simpan</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface SessionInfo {
  last_used_at: string;
  expires_at: string;
}

function StaffDetailDrawer({ staff, isMe, onClose, onEdit }: {
  staff: StaffUser; isMe: boolean; onClose: () => void; onEdit: () => void;
}) {
  const studioId = useAuthStore(s => s.studioId);
  const [session, setSession] = useState<SessionInfo | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!studioId) return;
    supabase
      .from('sessions')
      .select('last_used_at, expires_at')
      .eq('studio_id', studioId)
      .eq('user_email', staff.email)
      .order('last_used_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setSession(data?.[0] ?? null));
  }, [studioId, staff.email]);

  const isOwner = staff.role === 'owner';

  // Session status
  let sessionNode: React.ReactNode;
  if (session === undefined) {
    sessionNode = <span className="text-zen-ink/30 text-[11px]">Memuat...</span>;
  } else if (!session) {
    sessionNode = (
      <div className="flex items-center gap-2">
        <WifiOff size={13} className="text-zen-ink/25" />
        <span className="text-[11px] text-zen-ink/40">Belum pernah login</span>
      </div>
    );
  } else {
    const isActive = new Date(session.expires_at) > new Date();
    const minAgo = (Date.now() - new Date(session.last_used_at).getTime()) / 60_000;
    const isOnline = isActive && minAgo < 30;
    sessionNode = (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-green-500 animate-pulse' : isActive ? 'bg-amber-400' : 'bg-zen-ink/20'}`} />
          <span className={`text-[11px] font-bold ${isOnline ? 'text-green-600' : isActive ? 'text-amber-600' : 'text-zen-ink/40'}`}>
            {isOnline ? 'Online sekarang' : isActive ? 'Aktif' : 'Sesi berakhir'}
          </span>
        </div>
        <p className="text-[10px] text-zen-ink/40 pl-4">Terakhir aktif: {timeAgo(session.last_used_at)}</p>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] overflow-hidden animate-slide-up sm:animate-page-in" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="pt-4 pb-2 flex justify-center sm:hidden">
          <div className="w-10 h-1 bg-zen-ink/10 rounded-full" />
        </div>

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 pb-4 pt-2">
          <h2 className="text-sm font-bold text-zen-ink/60">Detail Akun</h2>
          <button onClick={onClose} className="text-zen-ink/40 hover:text-zen-ink transition-colors"><X size={18} /></button>
        </div>

        {/* Avatar + name */}
        <div className={`mx-6 rounded-3xl px-5 py-5 flex items-center gap-4 mb-4 ${isOwner ? 'bg-zen-brand/5' : 'bg-zen-bg'}`}>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 ${isOwner ? 'bg-zen-brand/15 text-zen-brand' : 'bg-zen-ink/10 text-zen-ink/60'}`}>
            {staff.full_name[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold truncate">{staff.full_name}</p>
              {isMe && <span className="text-[9px] uppercase tracking-widest font-bold text-zen-brand bg-zen-brand/10 px-1.5 py-0.5 rounded-full shrink-0">Saya</span>}
            </div>
            <span className={`inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full mt-1 ${isOwner ? 'bg-zen-brand/10 text-zen-brand' : 'bg-zen-ink/8 text-zen-ink/50'}`}>
              {isOwner ? 'Owner' : 'Staff'}
            </span>
          </div>
        </div>

        {/* Info rows */}
        <div className="mx-6 mb-5 space-y-3">
          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-zen-bg flex items-center justify-center shrink-0 mt-0.5">
              <Info size={13} className="text-zen-ink/40" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-0.5">Email</p>
              <p className="text-sm font-medium">{staff.email}</p>
            </div>
          </div>

          {/* Bergabung */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-zen-bg flex items-center justify-center shrink-0 mt-0.5">
              <Calendar size={13} className="text-zen-ink/40" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-0.5">Bergabung</p>
              <p className="text-sm font-medium">{formatDate(staff.created_at)}</p>
            </div>
          </div>

          {/* Status perangkat */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-zen-bg flex items-center justify-center shrink-0 mt-0.5">
              <Wifi size={13} className="text-zen-ink/40" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/30 mb-0.5">Status Perangkat</p>
              {sessionNode}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-2">
          <button
            onClick={() => { onClose(); setTimeout(onEdit, 150); }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-zen-brand text-white text-sm font-bold rounded-2xl min-h-[48px]"
          >
            <Pencil size={14} /> Edit Akun
          </button>
          <button onClick={onClose} className="flex-1 py-3.5 border border-zen-ink/10 text-zen-ink/60 text-sm font-bold rounded-2xl min-h-[48px]">
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({ staff, isMe, onDetail, onEdit }: {
  staff: StaffUser; isMe: boolean; onDetail: () => void; onEdit: () => void;
}) {
  const isOwner = staff.role === 'owner';
  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-zen-ink/5 last:border-0">
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-sm font-bold ${isOwner ? 'bg-zen-brand/10 text-zen-brand' : 'bg-zen-bg text-zen-ink/50'}`}>
        {staff.full_name[0]?.toUpperCase() ?? (isOwner ? <ShieldCheck size={16} /> : <UserCircle size={16} />)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold truncate">{staff.full_name}</p>
          {isMe && (
            <span className="text-[9px] uppercase tracking-widest font-bold text-zen-brand bg-zen-brand/10 px-1.5 py-0.5 rounded-full shrink-0">Saya</span>
          )}
        </div>
        <p className="text-[11px] text-zen-ink/40 truncate">{staff.email}</p>
      </div>

      {/* Role badge */}
      <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full shrink-0 ${isOwner ? 'bg-zen-brand/10 text-zen-brand' : 'bg-zen-ink/5 text-zen-ink/50'}`}>
        {isOwner ? 'Owner' : 'Staff'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onDetail}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zen-ink/30 hover:text-zen-brand hover:bg-zen-brand/5 transition-colors"
          title="Lihat Detail"
        >
          <Info size={14} />
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zen-ink/30 hover:text-zen-brand hover:bg-zen-brand/5 transition-colors"
          title="Edit"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function StaffSection() {
  const { user } = useAuthStore();
  const { data: staffList = [], isLoading } = useStaff();

  const [editTarget, setEditTarget]     = useState<StaffUser | null>(null);
  const [detailTarget, setDetailTarget] = useState<StaffUser | null>(null);

  return (
    <>
      <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zen-ink/5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-zen-brand/10 flex items-center justify-center text-zen-brand shrink-0">
            <Users size={17} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Manajemen Staff</p>
            <p className="text-[10px] text-zen-ink/40 mt-0.5">
              {staffList.length} akun terdaftar · maks. 1 owner + 1 staff
            </p>
          </div>
        </div>

        {/* List */}
        <div className="px-6 py-2">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-zen-brand/40" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Users size={26} className="text-zen-ink/15 mx-auto" />
              <p className="text-sm font-bold text-zen-ink/40">Belum ada akun</p>
              <p className="text-xs text-zen-ink/30 leading-relaxed">
                Akun staff di-provision otomatis saat aktivasi lisensi.<br />
                Hubungi developer jika akun belum tersedia.
              </p>
            </div>
          ) : (
            <div>
              {staffList.map(staff => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  isMe={staff.email === user?.email}
                  onDetail={() => setDetailTarget(staff)}
                  onEdit={() => setEditTarget(staff)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-4 border-t border-zen-ink/5 bg-zen-bg/40 flex items-start gap-2">
          <KeyRound size={12} className="text-zen-ink/30 mt-0.5 shrink-0" />
          <p className="text-[10px] text-zen-ink/40 leading-relaxed">
            Akun staff di-provision oleh developer saat lisensi diaktifkan. Setiap akun hanya aktif di 1 perangkat sekaligus.
          </p>
        </div>
      </div>

      {/* Detail drawer */}
      {detailTarget && (
        <StaffDetailDrawer
          staff={detailTarget}
          isMe={detailTarget.email === user?.email}
          onClose={() => setDetailTarget(null)}
          onEdit={() => { setDetailTarget(null); setEditTarget(detailTarget); }}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <StaffEditModal
          staff={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
