/**
 * RailSense — General API Fetch Hook (src/hooks/useApi.js)
 * 
 * Provides reactive loading, data, error, and refetch states.
 * Strictly safe under React StrictMode (no state updates after unmount).
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(apiFn, deps = [], options = {}) {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const abortControllerRef = useRef(null);

  const execute = useCallback(async (...args) => {
    // Abort previous in-flight request for this hook instance
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await apiFn(...args, { signal: currentController.signal });
      if (mountedRef.current && !currentController.signal.aborted) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      if (currentController.signal.aborted) {
        // Intentionally aborted by unmount or superseded refetch
        return null;
      }
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
      return null;
    }
  }, [apiFn]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) {
      execute();
    }
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    refetch: execute,
  };
}
