/**
 * RailSense — API Endpoint Wrapper Functions (src/api/endpoints.js)
 * 
 * Strict mapping to live Python Flask REST API contracts documented in
 * docs/api_contract_for_frontend.md and docs/openapi.yaml.
 */

import { apiRequest } from './client';

// Standard Cache Durations
const CACHE_STATIC_MS = 10 * 60 * 1000;   // 10 minutes (overview, patterns, models)
const CACHE_CATALOG_MS = 5 * 60 * 1000;   // 5 minutes (trains/stations search)

/**
 * Lightweight Liveness Probe (zero I/O).
 */
export function getHealth() {
  return apiRequest('/health', { ttlMs: 0 });
}

/**
 * Truthful Readiness Probe:
 * Returns { status, components: { serving_store, prediction_engine, json_analytics }, data_source, data_as_of, model_version }
 * Note: Never cached by client so status card accurately tracks live health.
 */
export function getReadiness() {
  return apiRequest('/health/ready', { ttlMs: 0 });
}

/**
 * Macro Dataset Overview & Global KPIs:
 * Returns { fleet_kpis, delay_summary, category_breakdown, per_date_trend }
 */
export function getOverview(options = {}) {
  return apiRequest('/overview', { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Search & paginate train catalog:
 * @param {object} params
 * @param {string} [params.q] Search prefix/substring
 * @param {string} [params.category] Category code (e.g. SUB, MEX, SUF)
 * @param {number} [params.page] Page number (default 1)
 * @param {number} [params.page_size] Items per page (default 20)
 */
export function getTrains(params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q.trim());
  if (params.category) query.set('category', params.category.trim());
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const qs = query.toString();
  return apiRequest(`/trains${qs ? `?${qs}` : ''}`, { ttlMs: CACHE_CATALOG_MS, ...options });
}

/**
 * Get comprehensive single train route profile & stop delay history.
 * @param {string|number} trainNumber
 */
export function getTrainDetail(trainNumber, options = {}) {
  const clean = encodeURIComponent(String(trainNumber).trim());
  return apiRequest(`/trains/${clean}`, { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Search & paginate station catalog with Wilson confidence intervals.
 * @param {object} params
 * @param {string} [params.q] Station code prefix
 * @param {number} [params.page] Page number (default 1)
 * @param {number} [params.page_size] Items per page (default 20)
 */
export function getStations(params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q.trim());
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const qs = query.toString();
  return apiRequest(`/stations${qs ? `?${qs}` : ''}`, { ttlMs: CACHE_CATALOG_MS, ...options });
}

/**
 * Get single station details, Wilson bounds, and calling trains.
 * @param {string} stationCode
 */
export function getStationDetail(stationCode, options = {}) {
  const clean = encodeURIComponent(String(stationCode).trim().toUpperCase());
  return apiRequest(`/stations/${clean}`, { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Get empirical delay distribution patterns.
 * @param {'hour'|'dow'|'category'|'position'|'hotspots'} kind
 */
export function getPatterns(kind, options = {}) {
  const clean = encodeURIComponent(String(kind).trim().toLowerCase());
  return apiRequest(`/patterns/${clean}`, { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Get deployment model architecture, feature inventory, and split boundaries.
 */
export function getModelInfo(options = {}) {
  return apiRequest('/model/info', { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Get full comparative benchmark metrics, curve coordinates, and feature importance.
 */
export function getModelMetrics(options = {}) {
  return apiRequest('/model/metrics', { ttlMs: CACHE_STATIC_MS, ...options });
}

/**
 * Real-Time Pre-Departure Delay Inference.
 * @param {object} body
 * @param {string|number} body.train_number
 * @param {string} body.station_code
 * @param {string} body.date YYYY-MM-DD
 * @param {number} [body.seq] Optional sequence number
 */
export function predictDelay(body, options = {}) {
  return apiRequest('/predict', {
    method: 'POST',
    body,
    ttlMs: 0,
    ...options,
  });
}
