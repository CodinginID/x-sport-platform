interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="min-h-[44px] px-4 rounded-2xl bg-zen-brand text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        &lt; Prev
      </button>
      <span className="text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="min-h-[44px] px-4 rounded-2xl bg-zen-brand text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next &gt;
      </button>
    </div>
  );
}
