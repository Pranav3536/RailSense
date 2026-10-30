/**
 * RailSense — Fetch API Client (src/api/client.js)
 * 
 * Features:
 * - Base URL configured from VITE_API_BASE_URL (default: http://localhost:5000/api)
 * - 15-second AbortController request timeout
 * - In-flight Promise deduplication (prevents double-firing under React StrictMode)
 * - In-memory client-side GET caching with configurable TTL (respects 120 req/min rate limit)
 * - Uniform error extraction preserving backend {code, message, details, request_id}
 */

const DEFAULT_BASE_URL = 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 15000;

// In-memory cache: URL -> { data, expiresAt }
const cacheStore = new Map();

// In-flight Promise deduplication: URL -> Promise
const inFlightRequests = new Map();

export class ApiClientError extends Error {
  constructor(message, status, code, details = null, requestId = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function getBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) return DEFAULT_BASE_URL;
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
}

/**
 * Clears the in-memory GET cache. Useful for testing or manual refreshes.
 */
export function clearApiCache() {
  cacheStore.clear();
  inFlightRequests.clear();
}

/**
 * Core HTTP fetch wrapper.
 * @param {string} endpoint e.g. '/overview' or '/trains/12951'
 * @param {object} options
 * @param {string} options.method 'GET' | 'POST'
 * @param {object} [options.body] JSON body
 * @param {number} [options.timeoutMs]
 * @param {number} [options.ttlMs] Cache TTL in milliseconds for GET (default: 0 for no cache)
 * @param {boolean} [options.bypassCache] If true, ignores cached response
 * @param {AbortSignal} [options.signal] External abort signal
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ttlMs = 0,
    bypassCache = false,
    signal: externalSignal,
    headers = {},
  } = options;

  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  // 1. GET Cache Check
  const now = Date.now();
  if (method === 'GET' && !bypassCache && ttlMs > 0) {
    const cached = cacheStore.get(fullUrl);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  // 2. In-Flight Request Deduplication for GET
  if (method === 'GET') {
    const inFlight = inFlightRequests.get(fullUrl);
    if (inFlight) {
      return inFlight;
    }
  }

  const executeFetch = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Chain external abort signal if provided
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(fullUrl, {
        method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      clearTimeout(timeoutId);

      // Parse JSON response safely
      let responseData = null;
      if (typeof response.text === 'function') {
        const text = await response.text();
        if (text) {
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = { raw: text };
          }
        }
      } else if (typeof response.json === 'function') {
        responseData = await response.json();
      }

      if (!response.ok) {
        // Extract backend error envelope: { error: { code, message, details, request_id } }
        const errObj = responseData?.error || {};
        const code = errObj.code || (response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_ERROR');
        let message = errObj.message;

        if (response.status === 429) {
          message = message || 'API rate limit reached (120 req/min). Please wait a moment before trying again.';
        } else if (response.status >= 500) {
          message = message || 'An internal backend error occurred. Please try again.';
        } else if (!message) {
          message = `HTTP request failed with status ${response.status}.`;
        }

        throw new ApiClientError(
          message,
          response.status,
          code,
          errObj.details || null,
          errObj.request_id || response.headers.get('X-Request-ID') || null
        );
      }

      // Store in GET Cache if TTL specified
      if (method === 'GET' && ttlMs > 0) {
        cacheStore.set(fullUrl, {
          data: responseData,
          expiresAt: Date.now() + ttlMs,
        });
      }

      return responseData;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiClientError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new ApiClientError(
          `Request timed out after ${timeoutMs / 1000} seconds.`,
          408,
          'TIMEOUT'
        );
      }

      // Browser network failure / server offline
      throw new ApiClientError(
        'Unable to connect to RailSense API server. Please verify backend is running on port 5000.',
        0,
        'NETWORK_ERROR'
      );
    } finally {
      if (method === 'GET') {
        inFlightRequests.delete(fullUrl);
      }
    }
  };

  const promise = executeFetch();
  if (method === 'GET') {
    inFlightRequests.set(fullUrl, promise);
  }
  return promise;
}
