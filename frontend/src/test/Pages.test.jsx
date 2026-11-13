import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import TrainHubPage from '../pages/TrainHubPage';
import DelayPatternsPage from '../pages/DelayPatternsPage';
import SmartInsightsPage from '../pages/SmartInsightsPage';
import NotFoundPage from '../pages/NotFoundPage';

describe('Pages Mounting Suite', () => {
  it('renders WelcomePage successfully', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WelcomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Understand Train Delays Before You Travel')).toBeInTheDocument();
  });

  it('renders TrainHubPage catalog search view successfully', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TrainHubPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Train Hub')).toBeInTheDocument();
    expect(screen.getByText('Train Intelligence & Prediction')).toBeInTheDocument();
  });

  it('renders DelayPatternsPage successfully', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPatternsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Delay Patterns')).toBeInTheDocument();
    expect(screen.getByText('Historical Data')).toBeInTheDocument();
  });

  it('renders SmartInsightsPage successfully', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SmartInsightsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Smart Insights')).toBeInTheDocument();
    expect(screen.getByText('Natural Language Search')).toBeInTheDocument();
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
