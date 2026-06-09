import { cn } from '@/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-zen-ink/5 rounded-2xl', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-[32px] bg-white p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-[32px] bg-white p-6 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
    </div>
  );
}

/** Skeleton untuk card-list (avatar + 2 baris teks + elemen kanan) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-3xl border border-zen-ink/5 overflow-hidden">
      <div className="divide-y divide-zen-ink/5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-zen-ink/8 shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3 bg-zen-ink/8 rounded-full" style={{ width: `${50 + (i % 3) * 15}%` }} />
              <div className="h-2.5 bg-zen-ink/5 rounded-full" style={{ width: `${35 + (i % 4) * 10}%` }} />
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <div className="h-5 w-14 bg-zen-ink/5 rounded-full hidden sm:block" />
              <div className="w-8 h-8 bg-zen-ink/5 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
