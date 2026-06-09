import { useState, useMemo, useEffect } from 'react';

const PAGE_SIZE = 10;

export function useSearchPaginate<T>(
  items: T[],
  matchFn: (item: T, q: string) => boolean,
  pageSize = PAGE_SIZE,
) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever search query changes
  useEffect(() => { setPage(1); }, [query]);

  const filtered = useMemo(
    () => (query.trim() ? items.filter(i => matchFn(i, query.toLowerCase())) : items),
    [items, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  return {
    query,
    setQuery,
    page,
    setPage,
    pageItems,
    totalPages,
    totalFiltered: filtered.length,
  };
}
