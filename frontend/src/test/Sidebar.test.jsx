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

  it('renders the brand title and dataset badge without version pill', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText('RailSense')).toBeInTheDocument();
    expect(screen.queryByText('v2.0.4 Community ML Edition')).not.toBeInTheDocument();
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

  it('displays "Systems Operational" when /api/health/ready reports healthy local components', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 'ready',
        model_version: '2.0.4',
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
      expect(screen.getByText('Systems Operational')).toBeInTheDocument();
    });
    expect(screen.getByText('Engine: RailSense Telemetry Core')).toBeInTheDocument();
    expect(screen.getByText('v2.0.4')).toBeInTheDocument();
    expect(screen.queryByText(/Ingestion: 28L\+ Stops/)).not.toBeInTheDocument();
    expect(screen.queryByText(/local snapshot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/precomputed/i)).not.toBeInTheDocument();
  });

  it('displays "Systems Degraded" when a component is not ready', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createMockResponse({
        status: 'degraded',
        model_version: '2.0.4',
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
      expect(screen.getByText('Systems Degraded')).toBeInTheDocument();
    });
    expect(screen.getByText('Engine: RailSense Telemetry Core')).toBeInTheDocument();
  });

  it('displays "Systems Offline" when fetch fails after network or server offline', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/overview']}>
        <Sidebar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Systems Offline')).toBeInTheDocument();
    });
    expect(screen.getByText('Engine: RailSense Telemetry Core')).toBeInTheDocument();
  });
});
