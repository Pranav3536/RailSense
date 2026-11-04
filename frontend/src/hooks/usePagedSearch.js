import { useState, useEffect, useRef, useCallback } from 'react';
import { getTrains } from '../api/endpoints.js';
import { adaptTrainsList } from '../api/adapters.js';

/**
 * usePagedSearch — Hook for debounced, abortable, paginated train catalog searches.
 * 
 * Features:
 * - 300ms input debounce
 * - Automatically cancels in-flight stale requests
 * - Category filtering support
 * - Adapts backend schema with error handling
 */
export function usePagedSearch({
  initialQuery = '',
  initialCategory = '',
  initialSort = 'runs_desc',
  initialPage = 1,
  pageSize = 20
} = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Debounce query input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1); // Reset to page 1 on new query
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Reset to page 1 when category changes
  const handleCategoryChange = useCallback((newCategory) => {
    setCategory(newCategory);
    setPage(1);
  }, []);

  // Reset to page 1 when sort changes
  const handleSortChange = useCallback((newSort) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const fetchData = useCallback(async () => {
    // Abort prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const queryParams = {
        page,
        page_size: pageSize,
      };
      if (debouncedQuery.length >= 2) {
        queryParams.q = debouncedQuery;
      }
      if (category) {
        queryParams.category = category;
      }
      if (sort) {
        queryParams.sort = sort;
      }

      const raw = await getTrains(queryParams, {
        signal: controller.signal,
      });

      const adapted = adaptTrainsList(raw);
      setItems(adapted.items);
      setPagination(adapted.pagination);
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        // Ignored aborted request
        return;
      }
      setError(err);
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, category, sort, page, pageSize]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    query,
    setQuery,
    category,
    setCategory: handleCategoryChange,
    sort,
    setSort: handleSortChange,
    page,
    setPage,
    items,
    pagination,
    loading,
    error,
    refetch: fetchData,
  };
}
