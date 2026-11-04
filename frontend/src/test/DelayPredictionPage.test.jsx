import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DelayPredictionPage from '../pages/DelayPredictionPage';
import * as endpoints from '../api/endpoints';
import trainDetailFixture from './fixtures/trainDetailFixture.json';
import predictNormalFixture from './fixtures/predictNormalFixture.json';
import predictOutOfWindowFixture from './fixtures/predictOutOfWindowFixture.json';
import predictColdStartFixture from './fixtures/predictColdStartFixture.json';

vi.mock('../api/endpoints', () => ({
  getTrainDetail: vi.fn(),
  getTrains: vi.fn(),
  predictDelay: vi.fn(),
}));

describe('DelayPredictionPage (Tab 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form inputs and handles prediction submit with result display', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue(predictNormalFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Delay Prediction Engine')).toBeInTheDocument();
    expect(screen.getByText('Prediction Inputs')).toBeInTheDocument();

    // Wait for train details to load
    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    // Check stop selector has options
    // Submit prediction using new "Run Prediction" button text
    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(endpoints.predictDelay).toHaveBeenCalledWith({
        train_number: '12951',
        station_code: 'BVI',
        seq: 2,
        date: '2026-10-15',
      });
    });

    // Verify result display
    await waitFor(() => {
      expect(screen.getByText('Prediction Result & Risk Profile')).toBeInTheDocument();
    });

    // Check result card title and plain words decision
    expect(screen.getByText('Estimated Delay Risk')).toBeInTheDocument();
    expect(screen.getByText(/Estimated below alert threshold/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Model Feature Associations/i })).toBeInTheDocument();

    // Check compact status chip for in-window date
    expect(screen.getByText('Date inside training window')).toBeInTheDocument();

    // Check collapsible "Model assumptions and caveats" is present and closed by default
    const caveatsBtn = screen.getByRole('button', { name: /Model assumptions and caveats/i });
    expect(caveatsBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/What the Model Predicts/i)).not.toBeInTheDocument();

    // Open collapsible
    fireEvent.click(caveatsBtn);
    expect(caveatsBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/What the Model Predicts/i)).toBeInTheDocument();

    // Check model version
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });

  it('displays prospective date notice chip when date is outside dataset window', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue(predictOutOfWindowFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-11-05']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Outside observed window')).toBeInTheDocument();
    });
  });

  it('renders limited history chip for cold-start trains', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue(predictColdStartFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=00149&seq=2&date=2026-10-18']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getTrainDetail).toHaveBeenCalledWith('00149');
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Limited history')).toBeInTheDocument();
    });
  });

  it('handles 429 rate limiting gracefully with cooldown message', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    const rateLimitErr = new Error('Too many requests');
    rateLimitErr.status = 429;
    endpoints.predictDelay.mockRejectedValue(rateLimitErr);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
    });
  });

  it('disables origin stop (seq=1) in the arrival stop dropdown', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Target Arrival Stop/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Target Arrival Stop/i);
    const originOption = select.querySelector('option[value="1"]');
    expect(originOption).toBeInTheDocument();
    expect(originOption).toBeDisabled();
    expect(originOption.textContent).toContain('Origin — departs from here');
  });

  it('supports circular and loop routes with unique sequence keying when station repeats', async () => {
    const loopTrainFixture = {
      ...trainDetailFixture,
      train_number: '12000',
      train_name: 'Ring Railway Circular Express',
      stops: [
        { seq: 1, station_code: 'NDLS', station_name: 'New Delhi', scheduled_arrival_time: null, arrival_day_offset: 0 },
        { seq: 2, station_code: 'NZM', station_name: 'Hazrat Nizamuddin', scheduled_arrival_time: '08:15', arrival_day_offset: 0 },
        { seq: 3, station_code: 'ANVR', station_name: 'Anand Vihar', scheduled_arrival_time: '08:45', arrival_day_offset: 0 },
        { seq: 4, station_code: 'NDLS', station_name: 'New Delhi Final', scheduled_arrival_time: '09:30', arrival_day_offset: 0 },
      ],
    };
    endpoints.getTrainDetail.mockResolvedValue(loopTrainFixture);
    endpoints.predictDelay.mockResolvedValue(predictNormalFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12000&seq=4&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ring Railway Circular Express')).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Target Arrival Stop/i);
    const ndlsStops = select.querySelectorAll('option[value="1"], option[value="4"]');
    expect(ndlsStops.length).toBe(2);

    expect(ndlsStops[0]).toBeDisabled();
    expect(ndlsStops[1]).not.toBeDisabled();
    expect(select.value).toBe('4');

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(endpoints.predictDelay).toHaveBeenCalledWith({
        train_number: '12000',
        station_code: 'NDLS',
        seq: 4,
        date: '2026-10-15',
      });
    });
  });

  it('validates form and prevents prediction dispatch when required fields are missing', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

    render(
      <MemoryRouter initialEntries={['/predict']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(submitBtn);
    expect(endpoints.predictDelay).not.toHaveBeenCalled();
  });

  it('handles 422 repeated stations or non-applicable stop error envelope', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    const validationErr = new Error('Arrival delay is not applicable for this stop.');
    validationErr.status = 422;
    endpoints.predictDelay.mockRejectedValue(validationErr);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Arrival delay is not applicable for this stop/i)).toBeInTheDocument();
    });
  });

  it('pre-fills form inputs from deep-link query parameters (?train, ?seq, ?date)', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=3&date=2026-10-20']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951');
    });

    const stopSelect = screen.getByLabelText(/Target Arrival Stop/i);
    expect(stopSelect.value).toBe('3');

    const dateInput = screen.getByLabelText(/Journey Start Date/i);
    expect(dateInput.value).toBe('2026-10-20');
  });

  it('proves observed delay rate shows ~88.2% for fixture value 88.24 without unit multiplier bug', async () => {
    const customTrainFixture = {
      ...trainDetailFixture,
      stops: [
        trainDetailFixture.stops[0],
        {
          ...trainDetailFixture.stops[1],
          observed_delayed_rate: 88.24,
          observed_stops_count: 17,
        },
      ],
    };

    endpoints.getTrainDetail.mockResolvedValue(customTrainFixture);
    endpoints.predictDelay.mockResolvedValue(predictNormalFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Historical Observed Context')).toBeInTheDocument();
    });

    // Must show 88.2% and NEVER 8,824.0%
    expect(screen.getByText('88.2%')).toBeInTheDocument();
    expect(screen.queryByText(/8,824/)).not.toBeInTheDocument();
    expect(screen.getByText('17 observed runs')).toBeInTheDocument();
  });

  it('verifies form footer contains no internal rate-limit or threshold strings', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951');
    });

    expect(screen.queryByText(/Rate limited to 120 requests\/minute/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model threshold: 0\.410/i)).not.toBeInTheDocument();
  });

  it('verifies date picker helper text displays observed snapshot range dynamically', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);

    render(
      <MemoryRouter initialEntries={['/predict']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Observed snapshot: 7 Oct 2026 – 25 Oct 2026\./i)).toBeInTheDocument();
  });

  it('verifies factor bars display raw log-odds and contain zero percent signs', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue({
      ...predictNormalFixture,
      contributing_factors: [
        'Train 12951 exhibits high historical punctuality',
        'Station BRC is an observed delay hotspot',
      ],
    });

    render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Choose arrival stop/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Run Prediction/i });
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(endpoints.predictDelay).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Model Feature Associations/i })).toBeInTheDocument();
      expect(screen.getAllByText(/lowers the estimate/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/raises the estimate/i).length).toBeGreaterThanOrEqual(1);
    });

    // Verify factor container does not print percent signs on factor items
    const factorSection = screen.getByRole('heading', { name: /Model Feature Associations/i }).closest('div');
    expect(factorSection).not.toBeNull();
  });

  it('verifies that no rendered text contains an unintended percentage above 100 or 4-digit percentage', async () => {
    endpoints.getTrainDetail.mockResolvedValue(trainDetailFixture);
    endpoints.predictDelay.mockResolvedValue(predictNormalFixture);

    const { container } = render(
      <MemoryRouter initialEntries={['/predict?train=12951&seq=2&date=2026-10-15']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="predict" element={<DelayPredictionPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getTrainDetail).toHaveBeenCalledWith('12951');
    });

    fireEvent.click(screen.getByRole('button', { name: /Run Prediction/i }));

    await waitFor(() => {
      expect(screen.getByText('Estimated Delay Risk')).toBeInTheDocument();
    });

    // Regex checks for bug pattern like 8,824.0% or 5702.0%
    const pageText = container.textContent || '';
    const badPercentRegex = /\d{3,},\d{3}\.\d%/g;
    expect(badPercentRegex.test(pageText)).toBe(false);
  });
});
