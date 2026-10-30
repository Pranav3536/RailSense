import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DelayPatternsPage from '../pages/DelayPatternsPage';
import * as endpoints from '../api/endpoints';

import patternsHourFixture from './fixtures/patternsHourFixture.json';
import patternsDowFixture from './fixtures/patternsDowFixture.json';
import patternsCategoryFixture from './fixtures/patternsCategoryFixture.json';
import patternsPositionFixture from './fixtures/patternsPositionFixture.json';
import patternsHotspotsStationFixture from './fixtures/patternsHotspotsStationFixture.json';
import patternsHotspotsTrainFixture from './fixtures/patternsHotspotsTrainFixture.json';
import stationDetailFixture from './fixtures/stationDetailFixture.json';

vi.mock('../api/endpoints', () => ({
  getPatterns: vi.fn(),
  getStationDetail: vi.fn(),
}));

describe('DelayPatternsPage (Tab 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpoints.getPatterns.mockImplementation((dim, params) => {
      if (dim === 'hour') return Promise.resolve(patternsHourFixture);
      if (dim === 'dow') return Promise.resolve(patternsDowFixture);
      if (dim === 'category') return Promise.resolve(patternsCategoryFixture);
      if (dim === 'position') return Promise.resolve(patternsPositionFixture);
      if (dim === 'hotspots') {
        if (params && params.level === 'train') {
          return Promise.resolve(patternsHotspotsTrainFixture);
        }
        return Promise.resolve(patternsHotspotsStationFixture);
      }
      return Promise.resolve({});
    });
    endpoints.getStationDetail.mockResolvedValue(stationDetailFixture);
  });

  it('renders page header and descriptive copy without probability or causal wording', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Historical Analytics')).toBeInTheDocument();
    expect(screen.getByText('Observed Dataset')).toBeInTheDocument();
    expect(screen.queryByText(/probability/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bottleneck/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/congestion/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/due to/i)).not.toBeInTheDocument();
  });

  it('renders all 5 core analytical sections', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Observed Delays by Scheduled Hour of Day')).toBeInTheDocument();
    });

    expect(screen.getByText('Observed Delays by Day of Week')).toBeInTheDocument();
    expect(screen.getByText('Observed Delays by Service Category')).toBeInTheDocument();
    expect(screen.getByText('Observed Delays by Journey Sequence Position')).toBeInTheDocument();
    expect(screen.getByText('Observed Delay Hotspots Explorer')).toBeInTheDocument();
  });

  it('toggles between chart and table views for Hour section', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Observed Delays by Scheduled Hour of Day')).toBeInTheDocument();
    });

    // Toggle radio button for hour table view
    const toggleRadios = screen.getAllByRole('radio', { name: /table/i });
    expect(toggleRadios.length).toBeGreaterThan(0);
    fireEvent.click(toggleRadios[0]);

    // In table view, 00:00 or hour headers should appear
    await waitFor(() => {
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  it('displays day of week calendar days caution note', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Observed Delays by Day of Week')).toBeInTheDocument();
    });

    expect(screen.getByText(/Caution: Each weekday rests on only 2-3 calendar days/i)).toBeInTheDocument();
  });

  it('handles hotspot controls and only queries API on Apply click', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Observed Delay Hotspots Explorer')).toBeInTheDocument();
    });

    // Check initial API call
    expect(endpoints.getPatterns).toHaveBeenCalledWith('hotspots', {
      level: 'station',
      order: 'top',
      min_support: 100,
      limit: 10,
    });

    // Change level to Train via button
    const trainLevelBtn = screen.getByRole('button', { name: 'Trains' });
    fireEvent.click(trainLevelBtn);

    // Ensure endpoint NOT called immediately on change
    expect(endpoints.getPatterns).toHaveBeenCalledTimes(5); // hour, dow, category, position, initial hotspots

    // Click Apply
    const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(endpoints.getPatterns).toHaveBeenCalledWith('hotspots', {
        level: 'train',
        order: 'top',
        min_support: 100,
        limit: 10,
      });
    });
  });

  it('renders inline station detail drawer when a hotspot row is clicked', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Observed Delay Hotspots Explorer')).toBeInTheDocument();
    });

    // Find and click the top station code (BTL in fixture)
    await waitFor(() => {
      const stnBtn = screen.getByRole('button', { name: /BTL/i });
      expect(stnBtn).toBeInTheDocument();
      fireEvent.click(stnBtn);
    });

    await waitFor(() => {
      expect(endpoints.getStationDetail).toHaveBeenCalledWith('BTL');
    });

    // Verify station drawer appears
    await waitFor(() => {
      expect(screen.getByText('Station Historical Profile')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully on pattern fetch failure', async () => {
    endpoints.getPatterns.mockImplementation((dim) => {
      if (dim === 'hour') return Promise.reject(new Error('Failed to fetch hourly data'));
      if (dim === 'dow') return Promise.resolve(patternsDowFixture);
      if (dim === 'category') return Promise.resolve(patternsCategoryFixture);
      if (dim === 'position') return Promise.resolve(patternsPositionFixture);
      if (dim === 'hotspots') return Promise.resolve(patternsHotspotsStationFixture);
      return Promise.resolve({});
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load hourly patterns')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: /Try Again/i }).length).toBeGreaterThan(0);
  });
});
