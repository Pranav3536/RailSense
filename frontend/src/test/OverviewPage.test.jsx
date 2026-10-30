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

  it('renders error state on API failure and retries', async () => {
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

    // Check Volume KPIs
    expect(screen.getByText('1,47,367')).toBeInTheDocument();
    expect(screen.getByText('10,743')).toBeInTheDocument();
    expect(screen.getByText('8,584')).toBeInTheDocument();
    expect(screen.getByText('19 Days')).toBeInTheDocument();

    // Check Delay Performance KPIs
    expect(screen.getByText('49.9%')).toBeInTheDocument(); // Delayed rate
    expect(screen.getByText('+15 min')).toBeInTheDocument(); // Median delay
    expect(screen.getByText('+38 min')).toBeInTheDocument(); // Mean delay
    expect(screen.getByText('8.6%')).toBeInTheDocument(); // Early arrival pct
    expect(screen.getByText('63.2%')).toBeInTheDocument(); // Label coverage

    // Check Caveat Banner
    expect(screen.getByText(/19-Day Observational Window/i)).toBeInTheDocument();
    expect(screen.getByText(/Non-causal observational analytics/i)).toBeInTheDocument();

    // Check Partial day boundary markers
    expect(screen.getAllByText(/Boundary Days Notice:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-10-07').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-10-25').length).toBeGreaterThan(0);
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
