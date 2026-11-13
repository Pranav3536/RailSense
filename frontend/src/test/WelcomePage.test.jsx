import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import * as endpoints from '../api/endpoints';
import overviewFixture from './fixtures/overviewFixture.json';

vi.mock('../api/endpoints', () => ({
  getOverview: vi.fn(),
}));

describe('WelcomePage (Phase 11.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, hero text, and primary CTAs', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    // Header & Hero
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Understand Train Delays Before You Travel')).toBeInTheDocument();
    expect(
      screen.getByText(/RailSense studies an observed record of past train journeys/i)
    ).toBeInTheDocument();

    // 3 CTAs
    const trainCta = screen.getByRole('link', { name: /Open Train Hub/i });
    expect(trainCta).toBeInTheDocument();
    expect(trainCta).toHaveAttribute('href', '/trains');

    const overviewCta = screen.getByRole('link', { name: /View Network Trends/i });
    expect(overviewCta).toBeInTheDocument();
    expect(overviewCta).toHaveAttribute('href', '/overview');

    const modelLabCta = screen.getByRole('link', { name: /Check Model Performance/i });
    expect(modelLabCta).toBeInTheDocument();
    expect(modelLabCta).toHaveAttribute('href', '/model-lab');
  });

  it('renders 4-step "How It Works" guide with numbered cards and links', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Select your train')).toBeInTheDocument();
    expect(screen.getByText('Check the route')).toBeInTheDocument();
    expect(screen.getByText('Estimate delay risk')).toBeInTheDocument();
    expect(screen.getByText('Explore trends and ask questions')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Find trains/i })).toHaveAttribute('href', '/trains');
    expect(screen.getByRole('link', { name: /Inspect timetable/i })).toHaveAttribute('href', '/trains');
    expect(screen.getByRole('link', { name: /Estimate risk/i })).toHaveAttribute('href', '/trains');
    expect(screen.getByRole('link', { name: /Ask Smart Insights/i })).toHaveAttribute('href', '/insights');
  });

  it('renders loading skeleton and loads truthful highlights from API', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    // Initial loading skeleton
    expect(screen.getByTestId('highlights-skeleton')).toBeInTheDocument();

    // After resolution
    await waitFor(() => {
      expect(screen.getByTestId('highlights-grid')).toBeInTheDocument();
    });

    expect(screen.getByText('Trains Observed')).toBeInTheDocument();
    expect(screen.getByText('Stations Analyzed')).toBeInTheDocument();
    expect(screen.getByText('Stop Records')).toBeInTheDocument();
    expect(screen.getByText('Snapshot Period')).toBeInTheDocument();

    // Compact values from formatCompact
    expect(screen.getByText('10.7K')).toBeInTheDocument(); // distinctTrainNumbers (10743)
    expect(screen.getByText('8.6K')).toBeInTheDocument();  // distinctStations (8584)
    expect(screen.getByText('28.1L')).toBeInTheDocument(); // totalStopsObserved (2805574 in en-IN compact notation)
    expect(screen.getByText('19 Days')).toBeInTheDocument();
  });

  it('hides highlights silently with small retry button on API failure', async () => {
    endpoints.getOverview.mockRejectedValue(new Error('Connection failure'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Snapshot highlights currently unavailable.')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Zero hardcoded numbers displayed on failure
    expect(screen.queryByText('10.7K')).not.toBeInTheDocument();
    expect(screen.queryByText('2.8M')).not.toBeInTheDocument();

    // Clicking retry refetches
    endpoints.getOverview.mockResolvedValueOnce(overviewFixture);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('highlights-grid')).toBeInTheDocument();
    });
    expect(screen.getByText('10.7K')).toBeInTheDocument();
  });

  it('contains zero instances of "probability", "live", "instant", "real-time", or causal terms', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('highlights-grid')).toBeInTheDocument();
    });

    const text = container.textContent.toLowerCase();

    // "probability" must NOT appear on Welcome/Home page
    expect(text).not.toContain('probability');

    // No real-time or causal claims
    expect(text).not.toContain('real-time');
    expect(text).not.toContain('instant');
    expect(text).not.toContain('bottleneck');
    expect(text).not.toContain('congestion');
  });

  it('displays the honest snapshot disclaimer note at the bottom', async () => {
    endpoints.getOverview.mockResolvedValue(overviewFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/Data is an observed 19-day snapshot \(7 Oct – 25 Oct 2026\); estimates are statistical associations, not guarantees/i)
    ).toBeInTheDocument();
  });
});
