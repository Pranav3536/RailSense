import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, ApiClientError, clearApiCache } from '../api/client';

function createMockResponse(data, { status = 200, ok = true, headers = {} } = {}) {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    ok,
    status,
    headers: new Headers({ 'content-type': 'application/json', ...headers }),
    text: async () => jsonString,
    json: async () => (typeof data === 'string' ? JSON.parse(data) : data)
  };
}

describe('apiClient suite', () => {
  beforeEach(() => {
    clearApiCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('performs a successful GET request', async () => {
    const mockData = { status: 'healthy', version: '2.0.4' };
    global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockData));

    const result = await apiRequest('/health/live');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('performs a successful POST request with JSON body', async () => {
    const payload = { train_number: '12951' };
    const mockResponse = { risk_level: 'LOW' };

    global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockResponse));

    const result = await apiRequest('/predict', {
      method: 'POST',
      body: payload
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predict'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload)
      })
    );
  });

  it('handles 429 Rate Limit error truthfully', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Limit: 120 per minute.'
          }
        },
        { status: 429, ok: false }
      )
    );

    await expect(apiRequest('/overview')).rejects.toThrow(ApiClientError);
  });

  it('parses structured API errors into ApiClientError properties', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse(
        {
          error: {
            code: 'TRAIN_NOT_FOUND',
            message: 'Train 99999 was not found in observed dataset',
            request_id: 'req_12345'
          }
        },
        { status: 404, ok: false }
      )
    );

    try {
      await apiRequest('/trains/99999');
      expect.unreachable('Should have thrown ApiClientError');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.status).toBe(404);
      expect(err.code).toBe('TRAIN_NOT_FOUND');
      expect(err.requestId).toBe('req_12345');
    }
  });

  it('caches GET responses when ttlMs > 0', async () => {
    const mockData = { count: 42 };
    global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockData));

    const res1 = await apiRequest('/cached-endpoint', { ttlMs: 5000 });
    const res2 = await apiRequest('/cached-endpoint', { ttlMs: 5000 });

    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1); // Second call served from cache
  });

  it('deduplicates simultaneous in-flight GET requests', async () => {
    let resolvePromise;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    global.fetch = vi.fn().mockImplementation(() =>
      slowPromise.then(() => createMockResponse({ dedupe: true }))
    );

    const call1 = apiRequest('/slow-endpoint');
    const call2 = apiRequest('/slow-endpoint');

    resolvePromise();
    const [res1, res2] = await Promise.all([call1, call2]);

    expect(res1).toEqual({ dedupe: true });
    expect(res2).toEqual({ dedupe: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
