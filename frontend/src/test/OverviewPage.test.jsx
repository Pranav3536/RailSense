import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from '../pages/OverviewPage';
import * as endpoints from '../api/endpoints';
import overviewFixture from './fixtures/overviewFixture.json';

vi.mock('../api/endpoints', () => ({
  getOverview: vi.fn(),
}));

describe('OverviewPage (Tab 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    endpoints.getOverview.mockImplementation(() => new Promise(() => {})); // pending promise
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Railway at a Glance')).toBeInTheDocument();
  });

  it('renders error state on API failure and retries without blank screen', async () => {
    endpoints.getOverview.mockRejectedValueOnce(new Error('Network error connecting to backend'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Overview Intelligence')).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error connecting to backend/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('regression test: renders ErrorState with Retry when backend is completely offline', async () => {
    const offlineErr = new Error('Unable to connect to RailSense API server. Please verify backend is running on port 5000.');
    offlineErr.code = 'NETWORK_ERROR';
    offlineErr.status = 0;
    endpoints.getOverview.mockRejectedValueOnce(offlineErr);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Overview Intelligence')).toBeInTheDocument();
    });

    expect(screen.getByText(/Please verify backend is running on port 5000/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    // Trigger retry to ensure refetch action works
    endpoints.getOverview.mockResolvedValueOnce(overviewFixture);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('28,05,574')).toBeInTheDocument();
    });
  });

  it('renders live fleet KPIs and performance stats truthfully from response', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('28,05,574')).toBeInTheDocument();
    });

    // Check Volume KPIs (with new shorter titles)
    expect(screen.getByText('Total Stops')).toBeInTheDocument();
    expect(screen.getByText('Total Runs')).toBeInTheDocument();
    expect(screen.getByText('Train Services')).toBeInTheDocument();
    expect(screen.getByText('Stations')).toBeInTheDocument();
    expect(screen.getByText('Observation Span')).toBeInTheDocument();

    expect(screen.getByText('1,47,367')).toBeInTheDocument();
    expect(screen.getByText('10,743')).toBeInTheDocument();
    expect(screen.getByText('8,584')).toBeInTheDocument();
    expect(screen.getByText('19 Days')).toBeInTheDocument();

    // Check Delay Performance KPIs (with new shorter titles)
    expect(screen.getByText('Fleet Delay Rate')).toBeInTheDocument();
    expect(screen.getByText('Median Delay')).toBeInTheDocument();
    expect(screen.getByText('Mean Delay')).toBeInTheDocument();
    expect(screen.getByText('Early Arrivals')).toBeInTheDocument();
    expect(screen.getByText('Data Coverage')).toBeInTheDocument();

    expect(screen.getByText('49.9%')).toBeInTheDocument(); // Delayed rate
    expect(screen.getByText('+15 min')).toBeInTheDocument(); // Median delay
    expect(screen.getByText('+38 min')).toBeInTheDocument(); // Mean delay
    expect(screen.getByText('8.6%')).toBeInTheDocument(); // Early arrival pct
    expect(screen.getByText('63.2%')).toBeInTheDocument(); // Label coverage

    // Check Slim Context Bar
    expect(screen.getByText(/Observational Snapshot:/i)).toBeInTheDocument();
    expect(screen.getByText(/19 days snapshot/i)).toBeInTheDocument();

    // Check Chart concise header badges
    expect(screen.getByText(/Fleet baseline: 49.9%/i)).toBeInTheDocument();
    expect(screen.getByText(/≤15m tolerance: 50.1%/i)).toBeInTheDocument();
    expect(screen.getByText(/Lowest: SUB 17.1%/i)).toBeInTheDocument();

    // Check Partial day inline legend badge
    expect(screen.getByText('Partial day (boundary date)')).toBeInTheDocument();
  });

  it('allows toggling between chart and table views', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('28,05,574')).toBeInTheDocument();
    });

    // Toggle daily trend to table view
    const tableButtons = screen.getAllByRole('radio', { name: /table/i });
    expect(tableButtons.length).toBeGreaterThan(0);
    fireEvent.click(tableButtons[0]);

    // Check that table rendered with headers
    expect(screen.getByText('Observed Runs')).toBeInTheDocument();
    expect(screen.getByText('Eligible Stops')).toBeInTheDocument();
  });

  it('expands educational methodology collapsible', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('28,05,574')).toBeInTheDocument();
    });

    const guideHeader = screen.getByText(/How to Read Delay Intelligence & Scientific Boundary Principles/i);
    fireEvent.click(guideHeader);

    expect(screen.getByText(/Label Eligibility Filter/i)).toBeInTheDocument();
    expect(screen.getByText(/Preservation of Early Arrivals/i)).toBeInTheDocument();
    expect(screen.getByText(/Non-Causal Associational Language/i)).toBeInTheDocument();
  });
});
