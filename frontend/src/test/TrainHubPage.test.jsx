import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TrainHubPage from '../pages/TrainHubPage';
import * as endpoints from '../api/endpoints';
import trainsListFixture from './fixtures/trainsListFixture.json';
import trainDetailFixture from './fixtures/trainDetailFixture.json';
import predictNormalFixture from './fixtures/predictNormalFixture.json';

vi.mock('../api/endpoints', () => ({
  getTrains: vi.fn(),
  getTrainDetail: vi.fn(),
  predictDelay: vi.fn(),
}));

function renderTrainHub(initialRoute = '/trains') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="trains" element={<TrainHubPage />} />
        <Route path="trains/:trainNumber" element={<TrainHubPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TrainHubPage (Phase 11.7 Unified Train Hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpoints.getTrains.mockResolvedValue(trainsListFixture);
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue(predictNormalFixture);
  });

  describe('Catalog View (/trains)', () => {
    it('renders page header, search input, category filter, and catalog cards', async () => {
      renderTrainHub('/trains');

      // Page Header
      expect(screen.getByText('Train Hub')).toBeInTheDocument();
      expect(screen.getByText('Train Intelligence & Prediction')).toBeInTheDocument();

      // Search and Filters
      expect(screen.getByPlaceholderText(/Search train number or service name/i)).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Filter by service category/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Sort trains by/i })).toBeInTheDocument();

      // Catalog items loaded from fixture
      await waitFor(() => {
        expect(endpoints.getTrains).toHaveBeenCalled();
      });

      // Train 12951 from fixture
      expect(screen.getByText('12951')).toBeInTheDocument();
      expect(screen.getByText('NDLS TEJAS RAJ')).toBeInTheDocument();
      expect(screen.getAllByText('View Route & Timetable').length).toBeGreaterThan(0);
    });

    it('debounces search query and calls getTrains with search param', async () => {
      renderTrainHub('/trains');

      const searchInput = screen.getByPlaceholderText(/Search train number or service name/i);
      fireEvent.change(searchInput, { target: { value: '12951' } });

      await waitFor(
        () => {
          expect(endpoints.getTrains).toHaveBeenCalledWith(
            expect.objectContaining({ q: '12951' }),
            expect.anything()
          );
        },
        { timeout: 1000 }
      );
    });

    it('filters by category when category dropdown changes', async () => {
      renderTrainHub('/trains');

      const categorySelect = screen.getByRole('combobox', { name: /Filter by service category/i });
      fireEvent.change(categorySelect, { target: { value: 'RAJ' } });

      await waitFor(() => {
        expect(endpoints.getTrains).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'RAJ' }),
          expect.anything()
        );
      });
    });

    it('displays error state with retry on catalog API failure', async () => {
      endpoints.getTrains.mockRejectedValueOnce(new Error('Backend connection failed'));

      renderTrainHub('/trains');

      await waitFor(() => {
        expect(screen.getByText('Unable to Load Train Catalog')).toBeInTheDocument();
      });

      expect(screen.getByText('Backend connection failed')).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /try again/i });
      expect(retryBtn).toBeInTheDocument();

      // Clicking retry refetches
      endpoints.getTrains.mockResolvedValueOnce(trainsListFixture);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('12951')).toBeInTheDocument();
      });
    });
  });

  describe('Single Train Detail View (/trains/:trainNumber)', () => {
    it('renders train header with service metadata, origin->terminus codes only, and stats', async () => {
      renderTrainHub('/trains/12951');

      await waitFor(() => {
        expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951', expect.anything());
      });

      expect(screen.getByText('Back to Train Search')).toBeInTheDocument();
      expect(screen.getAllByText('12951').length).toBeGreaterThan(0);
      expect(screen.getByText('NDLS TEJAS RAJ')).toBeInTheDocument();

      // Station codes ONLY: origin MMCT, terminus NDLS
      expect(screen.getAllByText('MMCT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NDLS').length).toBeGreaterThan(0);

      // Stat cards
      expect(screen.getByText('Observed Runs')).toBeInTheDocument();
      expect(screen.getByText('Mean Arrival Delay')).toBeInTheDocument();
      expect(screen.getByText('Eligible Halts')).toBeInTheDocument();
      expect(screen.getByText('Dataset Span')).toBeInTheDocument();
    });

    it('renders timetable ordered strictly by seq with station codes only', async () => {
      renderTrainHub('/trains/12951');

      await waitFor(() => {
        expect(screen.getByText('Canonical Timetable & Stop Delay Rates')).toBeInTheDocument();
      });

      // Stop #1 (MMCT) is origin: arrival delay not applicable, estimate disabled
      expect(screen.getByText('Not applicable (origin)')).toBeInTheDocument();

      // Intermediate stops BVI, ST
      expect(screen.getByText('BVI')).toBeInTheDocument();
      expect(screen.getByText('ST')).toBeInTheDocument();

      // Estimate buttons for intermediate stops
      const estimateButtons = screen.getAllByRole('button', { name: /Estimate delay risk for stop/i });
      expect(estimateButtons.length).toBeGreaterThan(0);
    });

    it('clicking "Estimate" in timetable updates selected stop in prediction panel without auto-submitting', async () => {
      renderTrainHub('/trains/12951');

      await waitFor(() => {
        expect(screen.getByText('Canonical Timetable & Stop Delay Rates')).toBeInTheDocument();
      });

      // Find estimate button for Stop #2 (BVI)
      const bviEstimateBtn = screen.getByRole('button', { name: /Estimate delay risk for stop 2 at BVI/i });
      fireEvent.click(bviEstimateBtn);

      // Target Stop Select in prediction panel should now have value 2
      const stopSelect = screen.getByLabelText(/Target Arrival Stop/i);
      expect(stopSelect.value).toBe('2');

      // Verify that predictDelay was NOT called (no auto-submit)
      expect(endpoints.predictDelay).not.toHaveBeenCalled();
    });

    it('pre-fills stop and date from query parameters WITHOUT auto-submitting', async () => {
      renderTrainHub('/trains/12951?seq=2&date=2026-10-15');

      await waitFor(() => {
        expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951', expect.anything());
      });

      const stopSelect = screen.getByLabelText(/Target Arrival Stop/i);
      expect(stopSelect.value).toBe('2');

      const dateInput = screen.getByLabelText(/Journey Start Date/i);
      expect(dateInput.value).toBe('2026-10-15');

      // NO auto-submit on mount
      expect(endpoints.predictDelay).not.toHaveBeenCalled();
      expect(screen.queryByTestId('prediction-result-panel')).not.toBeInTheDocument();
    });

    it('submitting prediction form executes predictDelay and displays results correctly', async () => {
      renderTrainHub('/trains/12951?seq=2&date=2026-10-15');

      await waitFor(() => {
        expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951', expect.anything());
      });

      const submitButton = screen.getByRole('button', { name: 'Estimate Delay Risk' });
      expect(submitButton).not.toBeDisabled();

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(endpoints.predictDelay).toHaveBeenCalledWith({
          train_number: '12951',
          station_code: 'BVI',
          seq: 2,
          date: '2026-10-15',
        });
      });

      // Result card renders
      await waitFor(() => {
        expect(screen.getByTestId('prediction-result-panel')).toBeInTheDocument();
      });

      // Classification & calibrated probability
      expect(screen.getByText('Likely On Time')).toBeInTheDocument();
      expect(screen.getByText('15.8%')).toBeInTheDocument(); // 0.1584 formatFractionAsPercent
      expect(screen.getByText(/Delayed means arriving more than 15 minutes after scheduled time/i)).toBeInTheDocument();

      // Status chip inside training window
      expect(screen.getByText('Date inside training window')).toBeInTheDocument();

      // Station delay history card
      expect(screen.getByText('Station Delay History')).toBeInTheDocument();

      // About this prediction collapsible
      expect(screen.getByText('About this prediction')).toBeInTheDocument();
    });

    it('displays error state when train is not found', async () => {
      endpoints.getTrainDetail.mockRejectedValueOnce(new Error('Train #99999 was not found'));

      renderTrainHub('/trains/99999');

      await waitFor(() => {
        expect(screen.getByText('Train Not Found or Unreachable')).toBeInTheDocument();
      });

      expect(screen.getByText('Train #99999 was not found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
