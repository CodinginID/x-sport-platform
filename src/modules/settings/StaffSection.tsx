import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/stores/auth';
import { useStaff, useStaffMutation } from '@/hooks/useStaff';
import type { StaffUser } from '@/hooks/useStaff';
import {
  Users, Plus, Pencil, Trash2, Loader2, Eye, EyeOff,
  ShieldCheck, UserCircle, KeyRound, X, Check,
} from 'lucide-react';
import { useConfirmStore } from '@/components/ConfirmDialog';

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function StaffModal({ staff, onClose }: { staff: StaffUser | null; onClose: () => void }) {
  const isEdit = !!staff;
  const { addMutation, updateMutation } = useStaffMutation();

  const [fullName, setFullName] = useState(staff?.full_name ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const isPending = addMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Nama harus diisi'); return; }
    if (!isEdit && !email.trim()) { setError('Email harus diisi'); return; }
    if (!isEdit && !password) { setError('Password harus diisi'); return; }
    if (password && password.length < 6) { setError('Password minimal 6 karakter'); return; }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: staff!.id,
          full_name: fullName !== staff!.full_name ? fullName : undefined,
          newPassword: password || undefined,
        });
      } else {
        await addMutation.mutateAsync({ full_name: fullName, email, password });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm bg-zen-ink/40" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-[28px] rounded-t-[28px] p-6 space-y-5 animate-slide-up sm:animate-page-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zen-ink/10 rounded-full mx-auto sm:hidden -mt-1" />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{isEdit ? 'Edit Staff' : 'Tambah Staff Baru'}</h2>
          <button onClick={onClose} className="text-zen-ink/40 hover:text-zen-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Nama Lengkap</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nama staff"
              autoFocus
              className="w-full bg-zen-bg rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zen-brand/20"
            />
          </div>

          {/* Email — only on add */}
          {!isEdit && (
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">Email (untuk login)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@studio.com"
                className="w-full bg-zen-bg rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 ring-zen-brand/20"
              />
            </div>
          )}

          {/* Password */}
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-zen-ink/40 mb-1.5 block">
              {isEdit ? 'Password Baru (kosongkan jika tidak diganti)' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? '••••••••' : 'Min. 6 karakter'}
                className="w-full bg-zen-bg rounded-2xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 ring-zen-brand/20"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zen-ink/30 hover:text-zen-ink transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 border border-zen-ink/10 text-zen-ink/60 text-sm font-bold rounded-2xl min-h-[48px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3.5 bg-zen-brand text-white text-sm font-bold rounded-2xl min-h-[48px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending
                ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
                : <><Check size={14} /> {isEdit ? 'Simpan' : 'Tambah'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Staff Row ────────────────────────────────────────────────────────────────

function StaffRow({ staff, isMe, onEdit, onDelete }: {
  staff: StaffUser; isMe: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const isOwner = staff.role === 'owner';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zen-ink/5 last:border-0">
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${isOwner ? 'bg-zen-brand/10' : 'bg-zen-bg'}`}>
        {isOwner
          ? <ShieldCheck size={16} className="text-zen-brand" />
          : <UserCircle size={16} className="text-zen-ink/40" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">{staff.full_name}</p>
          {isMe && <span className="text-[9px] uppercase tracking-widest font-bold text-zen-brand bg-zen-brand/10 px-1.5 py-0.5 rounded-full shrink-0">Saya</span>}
        </div>
        <p className="text-[11px] text-zen-ink/40 truncate">{staff.email}</p>
      </div>

      <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-full shrink-0 ${isOwner ? 'bg-zen-brand/10 text-zen-brand' : 'bg-zen-ink/5 text-zen-ink/50'}`}>
        {isOwner ? 'Owner' : 'Staff'}
      </span>

      {/* Actions — editable by owner for non-owner staff, or self-edit for name/pw */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-zen-ink/30 hover:text-zen-brand hover:bg-zen-brand/5 transition-colors"
          title="Edit"
        >
          <Pencil size={13} />
        </button>
        {!isOwner && !isMe && (
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zen-ink/30 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Hapus"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function StaffSection() {
  const { user } = useAuthStore();
  const { data: staffList = [], isLoading } = useStaff();
  const { deleteMutation } = useStaffMutation();
  const confirm = useConfirmStore(s => s.show);

  const [modal, setModal] = useState<'add' | StaffUser | null>(null);

  const handleDelete = (staff: StaffUser) => {
    confirm({
      title: 'Hapus Staff?',
      message: `Hapus akun "${staff.full_name}"? Staff akan otomatis logout dari semua perangkat.`,
      variant: 'danger',
      onConfirm: () => deleteMutation.mutate(staff),
    });
  };

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
            <p className="text-[10px] text-zen-ink/40 mt-0.5">{staffList.length} akun terdaftar</p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-zen-brand bg-zen-brand/10 px-3 py-2 rounded-2xl hover:bg-zen-brand/15 transition-colors"
          >
            <Plus size={12} /> Tambah
          </button>
        </div>

        {/* List */}
        <div className="px-6 py-2">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-zen-brand/40" />
            </div>
          ) : staffList.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Users size={28} className="text-zen-ink/15 mx-auto" />
              <div>
                <p className="text-sm font-bold text-zen-ink/40">Belum ada akun</p>
                <p className="text-xs text-zen-ink/30 mt-1">Tambah staff agar bisa login ke studio ini</p>
              </div>
              <button
                onClick={() => setModal('add')}
                className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-zen-brand text-white text-xs font-bold rounded-2xl"
              >
                <Plus size={12} /> Tambah Staff Pertama
              </button>
            </div>
          ) : (
            <div>
              {staffList.map(staff => (
                <StaffRow
                  key={staff.id}
                  staff={staff}
                  isMe={staff.email === user?.email}
                  onEdit={() => setModal(staff)}
                  onDelete={() => handleDelete(staff)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {staffList.length > 0 && (
          <div className="px-6 py-4 border-t border-zen-ink/5 bg-zen-bg/40 flex items-start gap-2">
            <KeyRound size={12} className="text-zen-ink/30 mt-0.5 shrink-0" />
            <p className="text-[10px] text-zen-ink/40 leading-relaxed">
              Staff login dengan email dan password yang Anda set. Setiap akun hanya bisa aktif di 1 perangkat sekaligus.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <StaffModal
          staff={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
