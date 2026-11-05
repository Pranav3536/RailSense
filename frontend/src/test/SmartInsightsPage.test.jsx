import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SmartInsightsPage from '../pages/SmartInsightsPage';
import * as endpoints from '../api/endpoints';

import insightsExamplesFixture from './fixtures/insightsExamplesFixture.json';
import insightsQueryFixture from './fixtures/insightsQueryFixture.json';
import insightsClarificationFixture from './fixtures/insightsClarificationFixture.json';

vi.mock('../api/endpoints', () => ({
  getInsightsExamples: vi.fn(),
  queryInsights: vi.fn(),
}));

describe('SmartInsightsPage (Tab 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    endpoints.getInsightsExamples.mockResolvedValue(insightsExamplesFixture);
    endpoints.queryInsights.mockResolvedValue(insightsQueryFixture);
  });

  it('renders page header, deterministic query banner, and query telemetry input without character counter', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Natural Language Analytics')).toBeInTheDocument();
    expect(screen.getByText('Local NLP Engine')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic natural language query engine/i)).toBeInTheDocument();
    expect(screen.getByText('Query Telemetry & Historical Trends')).toBeInTheDocument();
    expect(screen.queryByText(/0\s*\/\s*300/)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%\s*free/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/zero paid APIs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/without runtime LLM dependencies/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/probability/i)).not.toBeInTheDocument();
  });

  it('renders example question chips and populates input when clicked', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(endpoints.getInsightsExamples).toHaveBeenCalled();
    });

    const exampleChip = await screen.findByText('What is the overall delay rate across Indian Railways?');
    expect(exampleChip).toBeInTheDocument();

    fireEvent.click(exampleChip);

    // Clicking example chip automatically executes query
    await waitFor(() => {
      expect(endpoints.queryInsights).toHaveBeenCalledWith({
        question: 'What is the overall delay rate across Indian Railways?',
      });
    });
  });

  it('does NOT auto-submit when ?q= URL query param is present, only populates', async () => {
    render(
      <MemoryRouter initialEntries={['/insights?q=delays%20at%20NDLS']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    expect(input.value).toBe('delays at NDLS');
    // Ensure query endpoint was NOT called automatically
    expect(endpoints.queryInsights).not.toHaveBeenCalled();
  });

  it('submits query on Enter key press and renders answer card with visual table', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Which train category is most delayed?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(endpoints.queryInsights).toHaveBeenCalledWith({ question: 'Which train category is most delayed?' });
    });

    // Check answer text from fixture
    await waitFor(() => {
      expect(screen.getByText(/Across service classifications, Suburban \(SUB\)/i)).toBeInTheDocument();
    });

    // Check table visual items
    expect(screen.getByText('76.10%')).toBeInTheDocument();
    expect(screen.getByText(/High Confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Query Type:\s*Category Ranking/i)).toBeInTheDocument();
    expect(screen.getByText(/Query:\s*«Which train category is most delayed\?»/i)).toBeInTheDocument();
  });

  it('handles clarification response with interactive candidate chips', async () => {
    endpoints.queryInsights.mockResolvedValueOnce(insightsClarificationFixture);

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'How is Rajdhani delayed?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Multiple trains match/i)).toBeInTheDocument();
    });

    // Verify candidates are rendered as clickable buttons
    const candidateBtn = screen.getByRole('button', { name: /NDLS TEJAS RAJ/i });
    expect(candidateBtn).toBeInTheDocument();

    // Clicking candidate re-queries with selected entities
    fireEvent.click(candidateBtn);
    await waitFor(() => {
      expect(endpoints.queryInsights).toHaveBeenCalledWith({
        question: 'How is Rajdhani delayed?',
        selected_entities: {
          train_number: '12951',
          train_name: 'NDLS TEJAS RAJ',
          category: 'RAJ',
        },
      });
    });
  });

  it('displays session history and allows clearing', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    // First query
    fireEvent.change(input, { target: { value: 'Query 1' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(endpoints.queryInsights).toHaveBeenCalledWith({ question: 'Query 1' });
    });

    // Second query to populate history list (> 1 item)
    fireEvent.change(input, { target: { value: 'Query 2' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(endpoints.queryInsights).toHaveBeenCalledWith({ question: 'Query 2' });
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Questions This Session')).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(screen.queryByText('Recent Questions This Session')).not.toBeInTheDocument();
  });

  it('handles 429 rate limit cooldown timer', async () => {
    endpoints.queryInsights.mockRejectedValueOnce({
      status: 429,
      data: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit of 30 queries per minute exceeded.',
          retry_after: 10,
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'spam query' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Rate limit cooldown active/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/10s/i)).toBeInTheDocument();
  });
});
