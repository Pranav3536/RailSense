import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TrainExplorerPage from '../pages/TrainExplorerPage';
import * as endpoints from '../api/endpoints';
import trainsListFixture from './fixtures/trainsListFixture.json';
import trainDetailFixture from './fixtures/trainDetailFixture.json';

vi.mock('../api/endpoints', () => ({
  getTrains: vi.fn(),
  getTrainDetail: vi.fn(),
}));

describe('TrainExplorerPage (Tab 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Catalog Search View (/explorer)', () => {
    it('renders search input, category filter, sort dropdown, and train list with pluralized runs', async () => {
      endpoints.getTrains.mockResolvedValue(trainsListFixture);

      render(
        <MemoryRouter initialEntries={['/explorer']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Train Explorer' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search train number/i)).toBeInTheDocument();

      // Check Sort dropdown presence and options
      const sortSelect = screen.getByLabelText('Sort trains');
      expect(sortSelect).toBeInTheDocument();
      expect(sortSelect.value).toBe('runs_desc');
      expect(screen.getByRole('option', { name: 'Most runs' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Train number' })).toBeInTheDocument();

      // Wait for table items
      await waitFor(() => {
        expect(screen.getByText('12951')).toBeInTheDocument();
      });

      expect(screen.getByText('NDLS TEJAS RAJ')).toBeInTheDocument();
      expect(screen.getAllByText('12002').length).toBeGreaterThan(0);
      expect(screen.getByText('BHOPAL SHATABDI')).toBeInTheDocument();

      // Verify action button text is "View Route" (not "Inspect")
      expect(screen.getAllByText('View Route').length).toBeGreaterThan(0);
      expect(screen.queryByText('Inspect')).not.toBeInTheDocument();

      // Verify pluralized runs and stops in catalog
      expect(screen.getAllByText(/observed run/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/stop/i).length).toBeGreaterThan(0);
    });

    it('changes sort order when sort dropdown is changed', async () => {
      endpoints.getTrains.mockResolvedValue(trainsListFixture);

      render(
        <MemoryRouter initialEntries={['/explorer']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(endpoints.getTrains).toHaveBeenCalled();
      });

      const sortSelect = screen.getByLabelText('Sort trains');
      fireEvent.change(sortSelect, { target: { value: 'number_asc' } });

      await waitFor(() => {
        expect(endpoints.getTrains).toHaveBeenCalledWith(
          expect.objectContaining({ sort: 'number_asc', page: 1 }),
          expect.anything()
        );
      });
    });

    it('handles search input filtering', async () => {
      endpoints.getTrains.mockResolvedValue(trainsListFixture);

      render(
        <MemoryRouter initialEntries={['/explorer']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/Search train number/i);
      fireEvent.change(searchInput, { target: { value: '129' } });
      expect(searchInput.value).toBe('129');
    });

    it('displays error state with retry button when catalog request times out', async () => {
      endpoints.getTrains.mockRejectedValueOnce(new Error('Request timed out after 15 seconds'));

      render(
        <MemoryRouter initialEntries={['/explorer']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Search Trains')).toBeInTheDocument();
      });

      expect(screen.getByText(/Request timed out after 15 seconds/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /try again/i });
      expect(retryBtn).toBeInTheDocument();

      endpoints.getTrains.mockResolvedValueOnce(trainsListFixture);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(endpoints.getTrains).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Single Train Detail View (/explorer/:trainNumber)', () => {
    it('renders single train timetable and stops keyed by seq with clean support formatting', async () => {
      endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

      render(
        <MemoryRouter initialEntries={['/explorer/12951']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      // Wait for train details to load
      await waitFor(() => {
        expect(screen.getByText(/NDLS TEJAS RAJ/i)).toBeInTheDocument();
      });

      // Check header info & pluralization
      expect(screen.getByText('12951')).toBeInTheDocument();
      expect(screen.getAllByText('RAJ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MMCT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NDLS').length).toBeGreaterThan(0);
      expect(screen.getByText(/18 observed runs/i)).toBeInTheDocument();
      expect(screen.getByText(/\(8 scheduled halts\)/i)).toBeInTheDocument();

      // Check stops in timetable
      expect(screen.getByText('BVI')).toBeInTheDocument();
      expect(screen.getByText('ST')).toBeInTheDocument();

      // Verify timetable rows do NOT render yellow repeated pill badges
      expect(screen.queryByText(/Low Support \(<30\)/i)).not.toBeInTheDocument();

      // Verify boundary notice rendered when history has partial dates (2026-10-07 / 2026-10-25)
      expect(screen.getByText('Partial day')).toBeInTheDocument();

      // Verify collapsible "About these numbers" is present and expandable
      const aboutBtn = screen.getByRole('button', { name: /About these numbers/i });
      expect(aboutBtn).toBeInTheDocument();
      expect(aboutBtn).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(aboutBtn);
      expect(aboutBtn).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText(/Methodological Note on Observed Stop Rates:/i)).toBeInTheDocument();

      // Check prediction button is enabled and links to Phase 8 ML inference
      const predictBtn = screen.getByRole('button', { name: /Predict Delay/i });
      expect(predictBtn).toBeInTheDocument();
      expect(predictBtn).not.toBeDisabled();

      // Toggle stops to table view
      const tableRadios = screen.getAllByRole('radio', { name: /Table/i });
      fireEvent.click(tableRadios[0]);

      // Check timetable has action predict buttons
      const timetablePredictBtns = screen.getAllByRole('button', { name: /^Predict$/i });
      expect(timetablePredictBtns.length).toBeGreaterThan(0);

      // Check Back to Search button
      expect(screen.getByRole('button', { name: /Back to Train Search/i })).toBeInTheDocument();
    });

    it('renders NO boundary notice when train ran only on non-boundary dates', async () => {
      const nonBoundaryFixture = {
        ...trainDetailFixture,
        history_by_date: [
          {
            start_date: '2026-10-10',
            stops_count: 7,
            delayed_rate: 10.0,
            mean_delay: 12.0,
          },
          {
            start_date: '2026-10-11',
            stops_count: 7,
            delayed_rate: 15.0,
            mean_delay: 14.0,
          },
        ],
      };
      endpoints.getTrainDetail.mockResolvedValue(nonBoundaryFixture);

      render(
        <MemoryRouter initialEntries={['/explorer/12951']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/NDLS TEJAS RAJ/i)).toBeInTheDocument();
      });

      // No Partial day legend rendered
      expect(screen.queryByText('Partial day')).not.toBeInTheDocument();
    });

    it('renders error state when train is not found', async () => {
      endpoints.getTrainDetail.mockRejectedValueOnce(new Error('Train 99999 not found'));

      render(
        <MemoryRouter initialEntries={['/explorer/99999']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Train Not Found or Unreachable')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
