import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ModelLabPage from '../pages/ModelLabPage';
import * as endpoints from '../api/endpoints';
import modelInfoFixture from './fixtures/modelInfoFixture.json';
import modelMetricsFixture from './fixtures/modelMetricsFixture.json';

vi.mock('../api/endpoints', () => ({
  getModelInfo: vi.fn(),
  getModelMetrics: vi.fn(),
}));

describe('ModelLabPage (Phase 11.6 Simplified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly 3 key metric cards: Precision, Recall, and F1 Score', async () => {
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
      expect(endpoints.getModelMetrics).toHaveBeenCalled();
    });

    expect(screen.getByText('Model Lab')).toBeInTheDocument();

    // 3 metric cards
    expect(screen.getByText('Precision')).toBeInTheDocument();
    expect(screen.getByText('74.0%')).toBeInTheDocument();

    expect(screen.getByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('82.0%')).toBeInTheDocument();

    expect(screen.getAllByText('F1 Score').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('0.7782').length).toBeGreaterThanOrEqual(1);

    // Verify "Held-out test set" captions exist
    expect(screen.getAllByText('Held-out test set').length).toBeGreaterThanOrEqual(3);

    // Removed complex curves and latency cards
    expect(screen.queryByText('Average Precision (AP)')).not.toBeInTheDocument();
    expect(screen.queryByText('ROC-AUC Score')).not.toBeInTheDocument();
    expect(screen.queryByText(/Inference time/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Precision-Recall (PR) Curve')).not.toBeInTheDocument();
    expect(screen.queryByText('Calibration Reliability Diagram')).not.toBeInTheDocument();
  });

  it('renders model overview and 3-column benchmark comparison table truthfully', async () => {
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
      expect(screen.getByText('Model Comparison')).toBeInTheDocument();
    });

    // Overview details
    expect(screen.getByText('Model Overview')).toBeInTheDocument();
    expect(screen.getByText(/Estimates the likelihood of an arrival delay before departure/i)).toBeInTheDocument();

    // 3 Table Column headers
    expect(screen.getByText('Model Name')).toBeInTheDocument();
    expect(screen.getAllByText('F1 Score').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Status')).toBeInTheDocument();

    // Rows and truthfulness
    expect(screen.getByText('Majority Baseline')).toBeInTheDocument();
    expect(screen.getByText('Category Prior')).toBeInTheDocument();
    expect(screen.getByText('Train Historical Prior')).toBeInTheDocument();
    expect(screen.getByText('LightGBM (Calibrated)')).toBeInTheDocument();
    expect(screen.getByText('Final model')).toBeInTheDocument();

    // Research benchmark with tooltip
    expect(screen.getByText('En-Route LightGBM')).toBeInTheDocument();
    expect(screen.getByText('Research (not available in the app)')).toBeInTheDocument();
  });

  it('renders confusion matrix with 4 plain-English labels and exact counts', async () => {
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
      expect(screen.getByText('Confusion Matrix')).toBeInTheDocument();
    });

    // 4 plain-English categories
    expect(screen.getByText('Delays correctly identified')).toBeInTheDocument();
    expect(screen.getByText('False delay alerts')).toBeInTheDocument();
    expect(screen.getByText('On-time correctly identified')).toBeInTheDocument();
    expect(screen.getByText('Missed delays')).toBeInTheDocument();

    // Counts
    expect(screen.getByText('78,276')).toBeInTheDocument();
    expect(screen.getByText('27,470')).toBeInTheDocument();
    expect(screen.getByText('71,067')).toBeInTheDocument();
    expect(screen.getByText('17,152')).toBeInTheDocument();

    // Total test evaluations
    expect(screen.getByText('193,965')).toBeInTheDocument();
  });

  it('renders top 5 features with plain-English labels and no table toggle', async () => {
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
      expect(screen.getByText('Top 5 Features')).toBeInTheDocument();
    });

    expect(screen.getByText(/These are the factors the model uses most when predicting train delays/i)).toBeInTheDocument();

    // Plain English feature labels
    expect(screen.getByText("Train's past delay rate")).toBeInTheDocument();
    expect(screen.getByText("Train's past average delay")).toBeInTheDocument();
    expect(screen.getByText("Station's past delay rate")).toBeInTheDocument();
    expect(screen.getByText("Journey stop number")).toBeInTheDocument();
    expect(screen.getByText("Station's past average delay")).toBeInTheDocument();

    // No chart/table toggle
    expect(screen.queryByRole('button', { name: /Table/i })).not.toBeInTheDocument();
  });

  it('renders performance by category when present in API metrics', async () => {
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
      expect(screen.getByText('Performance by Train Category')).toBeInTheDocument();
    });

    expect(screen.getByText('Mail / Express')).toBeInTheDocument();
    expect(screen.getByText('(MEX)')).toBeInTheDocument();
  });
});
