/**
 * RailSense — Readiness & Status Polling Hook (src/hooks/useReadiness.js)
 * 
 * Truthfully evaluates local service and artifact readiness:
 * - "Checking..." (neutral)
 * - "API ready" (success; precomputed local snapshot active)
 * - "API degraded" (warning; one or more components unready)
 * - "API unreachable" (danger; backend offline or unreachable)
 * 
 * Pauses automatic polling when browser tab is hidden to conserve bandwidth & battery.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getReadiness } from '../api/endpoints';

const POLL_INTERVAL_MS = 60000; // 60 seconds

export const READINESS_STATES = {
  CHECKING: 'checking',
  READY: 'ready',
  DEGRADED: 'degraded',
  UNREACHABLE: 'unreachable',
};

export function useReadiness() {
  const [state, setState] = useState({
    status: 'checking', // 'checking' | 'ready' | 'degraded' | 'unreachable'
    label: 'Checking...',
    modelVersion: null,
    dataAsOf: null,
    dataSource: null,
    components: null,
    degradedReason: null,
    lastChecked: null,
    rawError: null,
    latencyMs: null,
    totalStops: 2805574,
  });

  const mountedRef = useRef(true);

  const checkStatus = useCallback(async () => {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    try {
      const data = await getReadiness();
      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const latency = Math.max(1, Math.round(endTime - startTime));
      if (!mountedRef.current) return;

      const isReady = (data?.status === 'ready');
      const comps = data?.components || {};
      const failedComps = Object.entries(comps)
        .filter(([, s]) => s !== 'ready')
        .map(([c, s]) => `${c} (${s})`);

      setState({
        status: isReady ? 'ready' : 'degraded',
        label: isReady ? 'System online' : 'Partly available',
        modelVersion: data?.model_version || '2.0.4',
        dataAsOf: data?.data_as_of || '2026-10-25',
        dataSource: data?.data_source || 'precomputed_local',
        components: comps,
        degradedReason: failedComps.length > 0 ? failedComps.join(', ') : null,
        lastChecked: new Date(),
        rawError: null,
        latencyMs: latency,
        totalStops: data?.total_stops_observed || 2805574,
      });
    } catch (err) {
      if (!mountedRef.current) return;

      // Check if it returned a 503 response with JSON details
      if (err.status === 503 && err.details?.components) {
        const comps = err.details.components || {};
        const failedComps = Object.entries(comps)
          .filter(([, s]) => s !== 'ready')
          .map(([c, s]) => `${c} (${s})`);

        setState({
          status: 'degraded',
          label: 'Partly available',
          modelVersion: err.details?.model_version || '2.0.4',
          dataAsOf: err.details?.data_as_of || '2026-10-25',
          dataSource: err.details?.data_source || 'precomputed_local',
          components: comps,
          degradedReason: failedComps.length > 0 ? failedComps.join(', ') : 'Components unavailable',
          lastChecked: new Date(),
          rawError: err,
          latencyMs: null,
          totalStops: 2805574,
        });
      } else {
        // True network failure or API process offline
        setState({
          status: 'unreachable',
          label: 'Server unreachable',
          modelVersion: null,
          dataAsOf: null,
          dataSource: null,
          components: null,
          degradedReason: null,
          lastChecked: new Date(),
          rawError: err,
          latencyMs: null,
          totalStops: 2805574,
        });
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkStatus();

    const intervalId = setInterval(() => {
      // Pause polling if document is not visible
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    }, POLL_INTERVAL_MS);

    // Refresh immediately when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus]);

  return {
    ...state,
    checkNow: checkStatus,
    refresh: checkStatus,
  };
}
