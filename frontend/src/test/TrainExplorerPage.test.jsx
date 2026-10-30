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
    it('renders search input, category options, and train list', async () => {
      endpoints.getTrains.mockResolvedValue(trainsListFixture);

      render(
        <MemoryRouter initialEntries={['/explorer']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="explorer" element={<TrainExplorerPage />} />
            <Route path="explorer/:trainNumber" element={<TrainExplorerPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Single Train Deep Dive')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search train number/i)).toBeInTheDocument();

      // Wait for table items
      await waitFor(() => {
        expect(screen.getByText('12951')).toBeInTheDocument();
      });

      expect(screen.getByText('NDLS TEJAS RAJ')).toBeInTheDocument();
      expect(screen.getAllByText('12002').length).toBeGreaterThan(0);
      expect(screen.getByText('BHOPAL SHATABDI')).toBeInTheDocument();
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
    it('renders single train timetable and stops keyed by seq', async () => {
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

      // Check header info
      expect(screen.getByText('12951')).toBeInTheDocument();
      expect(screen.getAllByText('RAJ').length).toBeGreaterThan(0);
      expect(screen.getAllByText('MMCT').length).toBeGreaterThan(0);
      expect(screen.getAllByText('NDLS').length).toBeGreaterThan(0);

      // Check stops in timetable
      expect(screen.getByText('BVI')).toBeInTheDocument();
      expect(screen.getByText('ST')).toBeInTheDocument();

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
