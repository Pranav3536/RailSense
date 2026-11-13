import { useState, useEffect, useCallback, useRef } from 'react';
import { getTrainDetail } from '../api/endpoints.js';
import { adaptTrainDetail } from '../api/adapters.js';

/**
 * useTrain — Hook to fetch a single train's full route timetable, stops, and run history.
 */
export function useTrain(trainNumber) {
  const [train, setTrain] = useState(null);
  const [loading, setLoading] = useState(Boolean(trainNumber));
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchTrain = useCallback(async () => {
    if (!trainNumber) {
      setTrain(null);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const raw = await getTrainDetail(trainNumber, {
        signal: controller.signal,
      });
      const adapted = adaptTrainDetail(raw);
      setTrain(adapted);
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      setError(err);
      setTrain(null);
    } finally {
      setLoading(false);
    }
  }, [trainNumber]);

  useEffect(() => {
    fetchTrain();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTrain]);

  return {
    train,
    loading,
    error,
    refetch: fetchTrain,
  };
}
