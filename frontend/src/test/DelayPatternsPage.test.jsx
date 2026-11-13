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

    expect(screen.getByText('Delay Patterns')).toBeInTheDocument();
    expect(screen.getByText('Historical Data')).toBeInTheDocument();
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
      expect(screen.getByText('Delays by Hour of Day')).toBeInTheDocument();
    });

    expect(screen.getByText('Delays by Day of Week')).toBeInTheDocument();
    expect(screen.getByText('Delays by Train Category')).toBeInTheDocument();
    expect(screen.getByText('Delays Across Journey Positions')).toBeInTheDocument();
    expect(screen.getByText('Delay Hotspots Explorer')).toBeInTheDocument();
  });

  it('toggles between chart and table views for Hour section', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delays by Hour of Day')).toBeInTheDocument();
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

  it('displays day of week comparison text', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delays by Day of Week')).toBeInTheDocument();
    });

    expect(screen.getByText(/Weekday Delay Comparison/i)).toBeInTheDocument();
  });

  it('handles hotspot controls and only queries API on Apply click', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delay Hotspots Explorer')).toBeInTheDocument();
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
      expect(screen.getByText('Delay Hotspots Explorer')).toBeInTheDocument();
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
      expect(screen.getByText('Station Details')).toBeInTheDocument();
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

  it('renders cleaned section headers without false Low Support (<30) badges on aggregate groupings', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delays by Day of Week')).toBeInTheDocument();
    });

    // Check that there is NO "7 weekdays Low Support" or "Low Support (<30)" on any section header
    expect(screen.queryByText(/7 weekdays Low Support/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/20 classes Low Support/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 position buckets Low Support/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Low Support \(<30\)/i)).not.toBeInTheDocument();
  });

  it('renders formatted Wilson CI without raw Python brackets and clean journey subtitle', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Delay Hotspots Explorer')).toBeInTheDocument();
    });

    // Subtitle should be clean product copy, not prompt leak
    await waitFor(() => {
      expect(screen.getAllByText(/How the observed delay rate changes along a train's route/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/Worded as observed empirical association/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/never causation/i)).not.toBeInTheDocument();

    // Wilson CI formatting check: should contain "98.0% - 100.0%" and NO square brackets
    await waitFor(() => {
      expect(screen.getAllByText(/98\.0%\s*[-–]\s*100\.0%/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/\[98\.0%, 100\.0%\]/)).not.toBeInTheDocument();
    expect(screen.getAllByText('95% interval').length).toBeGreaterThan(0);

    // Check footer provenance
    expect(screen.getByText(/Data as of 25 Oct 2026 - Observed Railway Dataset/i)).toBeInTheDocument();
    expect(screen.queryByText(/Serving store: SQLite/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Historical Railway Records/)).not.toBeInTheDocument();
  });

  it('applies low-support logic per bucket/row (muted fill and "few samples" note) with zero section-level badges', async () => {
    const customCategoryFixture = {
      data: [
        {
          category: 'EXP',
          category_name: 'Express',
          delayed_rate: 45.0,
          mean_delay_min: 20.0,
          median_delay_min: 10.0,
          eligible_stops: 15, // Below threshold (< 30) -> low support
          total_stops: 15,
        },
        {
          category: 'SF',
          category_name: 'Superfast',
          delayed_rate: 30.0,
          mean_delay_min: 15.0,
          median_delay_min: 5.0,
          eligible_stops: 5000, // Above threshold -> high support
          total_stops: 5000,
        },
      ],
    };

    endpoints.getPatterns.mockImplementation((dim) => {
      if (dim === 'category') return Promise.resolve(customCategoryFixture);
      if (dim === 'hour') return Promise.resolve(patternsHourFixture);
      if (dim === 'dow') return Promise.resolve(patternsDowFixture);
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
      expect(screen.getByText('Delays by Train Category')).toBeInTheDocument();
    });

    // 1. Verify NO section-level header support badges exist
    expect(screen.queryByText(/Low Support \(<30\)/i)).not.toBeInTheDocument();

    // 2. Switch to table view for category
    const catSection = screen.getByText('Delays by Train Category').closest('section');
    await waitFor(() => {
      const tableBtn = catSection.querySelector('button[role="radio"]:nth-child(2)');
      expect(tableBtn).toBeTruthy();
      fireEvent.click(tableBtn);
    });

    // 3. Verify the low-support bucket shows "(few samples)"
    await waitFor(() => {
      expect(screen.getByText(/few samples/i)).toBeInTheDocument();
    });
  });
});
