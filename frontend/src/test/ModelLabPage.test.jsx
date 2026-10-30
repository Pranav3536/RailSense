import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ModelLabPage from '../pages/ModelLabPage';
import * as endpoints from '../api/endpoints';
import modelInfoFixture from './fixtures/modelInfoFixture.json';
import modelMetricsFixture from './fixtures/modelMetricsFixture.json';

vi.mock('../api/endpoints', () => ({
  getModelInfo: vi.fn(),
  getModelMetrics: vi.fn(),
}));

describe('ModelLabPage (Tab 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders architecture, benchmark metrics, curves, and confusion matrix truthfully', async () => {
    endpoints.getModelInfo.mockResolvedValue(modelInfoFixture);
    endpoints.getModelMetrics.mockResolvedValue(modelMetricsFixture);

    render(
      <MemoryRouter initialEntries={['/model-lab']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="model-lab" element={<ModelLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(endpoints.getModelInfo).toHaveBeenCalled();
      expect(endpoints.getModelMetrics).toHaveBeenCalled();
    });

    expect(screen.getByText('Model Evaluation & Transparency')).toBeInTheDocument();

    // Check header KPI values (rendered in both KPI card and comparison table)
    expect(screen.getAllByText('0.8482').length).toBeGreaterThan(0); // AP
    expect(screen.getAllByText('0.8592').length).toBeGreaterThan(0); // ROC-AUC
    expect(screen.getAllByText('0.7782').length).toBeGreaterThan(0); // F1-Score

    // Check Model Architecture info
    expect(screen.getByText(/LightGBM Gradient Boosted Decision Trees \+ Isotonic Regression/i)).toBeInTheDocument();

    // Check Multi-Model Comparison Table
    expect(screen.getByText('Majority Baseline')).toBeInTheDocument();
    expect(screen.getByText('Category Prior')).toBeInTheDocument();
    expect(screen.getByText('Train Historical Prior')).toBeInTheDocument();
    expect(screen.getByText('LightGBM (Calibrated)')).toBeInTheDocument();

    // Check Lifts
    expect(screen.getByText('+72.4%')).toBeInTheDocument();
    expect(screen.getByText('+42.0%')).toBeInTheDocument();

    // Check Curves
    expect(screen.getByText('Precision-Recall (PR) Curve')).toBeInTheDocument();
    expect(screen.getByText('Calibration Reliability Diagram')).toBeInTheDocument();

    // Check Confusion Matrix numbers (at reconciled threshold 0.410)
    expect(screen.getByText(/71,067/)).toBeInTheDocument(); // TN
    expect(screen.getByText(/78,276/)).toBeInTheDocument(); // TP

    // Check Feature Importance
    expect(screen.getByText('Feature Importance (Gain Metric)')).toBeInTheDocument();

    // Check Banned Features Card
    expect(screen.getByText(/Leakage Safeguards & Banned Features Protocol/i)).toBeInTheDocument();
    expect(screen.getByText('departure_delay_min')).toBeInTheDocument();
    expect(screen.getByText('actual_arrival')).toBeInTheDocument();

    // Check Formulation 2 (En-Route) Research card
    expect(screen.getByText(/Research Benchmark Only — Formulation 2/i)).toBeInTheDocument();
    expect(screen.getAllByText('0.9289').length).toBeGreaterThanOrEqual(1);
  });

  it('allows toggling between Test and Validation splits in comparison table', async () => {
    endpoints.getModelInfo.mockResolvedValue(modelInfoFixture);
    endpoints.getModelMetrics.mockResolvedValue(modelMetricsFixture);

    render(
      <MemoryRouter initialEntries={['/model-lab']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="model-lab" element={<ModelLabPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getModelInfo).toHaveBeenCalled();
    });

    const valBtn = screen.getByRole('button', { name: /Validation Split/i });
    fireEvent.click(valBtn);

    // Val AP values should now be rendered (e.g. 0.8608 for LightGBM Calibrated)
    expect(screen.getByText('0.8608')).toBeInTheDocument();
  });
});
