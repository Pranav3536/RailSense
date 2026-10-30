import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DelayPatternsPage from '../pages/DelayPatternsPage';
import SmartInsightsPage from '../pages/SmartInsightsPage';
import NotFoundPage from '../pages/NotFoundPage';

describe('Placeholder Pages Suite (Phase 9 Future Scope)', () => {
  it('renders DelayPatternsPage with honest Phase 9 badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Historical Analytics')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 9')).toBeInTheDocument();
    expect(screen.getByText('/api/patterns/hourly')).toBeInTheDocument();
  });

  it('renders SmartInsightsPage with honest Phase 9 badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Natural Language Analytics')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 9')).toBeInTheDocument();
    expect(screen.getByText('/api/insights/query')).toBeInTheDocument();
  });

  it('renders NotFoundPage with error code 404 and return link', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/404/i)).toBeInTheDocument();
    expect(screen.getByText(/Page not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Overview/i })).toBeInTheDocument();
  });
});
