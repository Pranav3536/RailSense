import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { clearApiCache } from '../api/client';

function createMockResponse(data, { status = 200, ok = true } = {}) {
  const jsonString = JSON.stringify(data);
  return {
    ok,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => jsonString,
    json: async () => data
  };
}

describe('Sidebar Layout & Truthful Status suite', () => {
  beforeEach(() => {
    clearApiCache();
    vi.restoreAllMocks();
  });

  it('renders all 6 navigation tabs in fixed order', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves to stay checking

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Train Explorer')).toBeInTheDocument();
    expect(screen.getByText('Delay Prediction')).toBeInTheDocument();
    expect(screen.getByText('Model Lab')).toBeInTheDocument();
    expect(screen.getByText('Delay Patterns')).toBeInTheDocument();
    expect(screen.getByText('Smart Insights')).toBeInTheDocument();
  });

  it('renders the dataset badge and brand version pill', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('RailSense')).toBeInTheDocument();
    expect(screen.getByText('v2.0.4 Community ML Edition')).toBeInTheDocument();
    expect(screen.getByText('Observed Railway Dataset')).toBeInTheDocument();
  });

  it('renders the creator attribution card with links', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getAllByText('PR').length).toBeGreaterThan(0);
    expect(screen.getByText('Creator & Maintainer')).toBeInTheDocument();

    const githubLink = screen.getByTitle('GitHub Profile');
    expect(githubLink).toHaveAttribute('href', expect.stringContaining('github.com'));

    const tidbLink = screen.getByTitle('TiDB Cloud');
    expect(tidbLink).toHaveAttribute('href', expect.stringContaining('tidbcloud.com'));
  });

  it('displays "API ready" when /api/health/ready reports healthy local components', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 'ready',
        model_version: '1.0.0',
        data_as_of: '2026-10-25',
        data_source: 'precomputed_local',
        components: {
          serving_store: 'ready',
          prediction_engine: 'ready',
          json_analytics: 'ready'
        }
      })
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('API ready')).toBeInTheDocument();
    });
    expect(screen.getByText('Data: precomputed local snapshot')).toBeInTheDocument();
  });

  it('displays "API degraded" when a component is not ready', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 'degraded',
        model_version: '1.0.0',
        data_as_of: '2026-10-25',
        data_source: 'precomputed_local',
        components: {
          serving_store: 'ready',
          prediction_engine: 'unavailable',
          json_analytics: 'ready'
        }
      })
    );

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('API degraded')).toBeInTheDocument();
    });
  });

  it('displays "API unreachable" when fetch fails after network or server offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('API unreachable')).toBeInTheDocument();
    });
  });
});
