import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (p: number) => void;
  // legacy compat
  currentPage?: number;
  totalFiltered?: number;
  onPage?: (p: number) => void;
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export function Pagination({ page, totalPages, totalItems, pageSize = 10, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const nums = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-[11px] text-zen-ink/40 font-medium">
        {start}–{end} dari {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-brand hover:border-zen-brand/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} />
        </button>

        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-zen-ink/30 text-xs">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPageChange(n as number)}
              className={`w-9 h-9 rounded-2xl text-sm font-bold transition-all ${
                n === page
                  ? 'bg-zen-brand text-white shadow-sm'
                  : 'bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-brand hover:border-zen-brand/30'
              }`}
            >
              {n}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-9 h-9 rounded-2xl flex items-center justify-center bg-white border border-zen-ink/10 text-zen-ink/50 hover:text-zen-brand hover:border-zen-brand/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
