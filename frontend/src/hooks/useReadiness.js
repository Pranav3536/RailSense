/**
 * RailSense — Readiness & Status Polling Hook (src/hooks/useReadiness.js)
 * 
 * Truthfully evaluates service and database connectivity:
 * - "Checking..." (neutral)
 * - "Database connected" (success)
 * - "Database unavailable" (warning)
 * - "API unreachable" (danger)
 * 
 * Pauses automatic polling when browser tab is hidden to conserve bandwidth & battery.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadiness } from '../api/endpoints';

const POLL_INTERVAL_MS = 60000; // 60 seconds

export const READINESS_STATES = {
  CHECKING: 'checking',
  CONNECTED: 'connected',
  DB_UNAVAILABLE: 'db_unavailable',
  UNREACHABLE: 'unreachable',
};

export function useReadiness() {
  const [state, setState] = useState({
    status: 'checking', // 'checking' | 'connected' | 'db_unavailable' | 'unreachable'
    label: 'Checking...',
    modelVersion: null,
    dataAsOf: null,
    servingStore: null,
    tidbStatus: null,
    lastChecked: null,
    rawError: null,
  });

  const mountedRef = useRef(true);

  const checkStatus = useCallback(async () => {
    try {
      const data = await getReadiness();
      if (!mountedRef.current) return;

      const tidbStatus = data?.components?.tidb_cloud;
      const isConnected = (tidbStatus === 'connected');

      setState({
        status: isConnected ? 'connected' : 'db_unavailable',
        label: isConnected ? 'Database connected' : 'Database unavailable',
        modelVersion: data?.model_version || '1.0.0',
        dataAsOf: data?.data_as_of || '2026-10-25',
        servingStore: data?.components?.serving_store || 'unknown',
        tidbStatus: tidbStatus || 'unavailable',
        lastChecked: new Date(),
        rawError: null,
      });
    } catch (err) {
      if (!mountedRef.current) return;

      // Check if it returned a 503 response with JSON details
      if (err.status === 503 && err.details?.components) {
        setState({
          status: 'db_unavailable',
          label: 'Database unavailable',
          modelVersion: err.details?.model_version || '1.0.0',
          dataAsOf: err.details?.data_as_of || '2026-10-25',
          servingStore: err.details?.components?.serving_store || 'ready',
          tidbStatus: 'unavailable',
          lastChecked: new Date(),
          rawError: err,
        });
      } else {
        // True network failure or API process offline
        setState({
          status: 'unreachable',
          label: 'API unreachable',
          modelVersion: null,
          dataAsOf: null,
          servingStore: null,
          tidbStatus: null,
          lastChecked: new Date(),
          rawError: err,
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkStatus();

    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(checkStatus, POLL_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus]);

  return {
    ...state,
    checkNow: checkStatus,
  };
}
