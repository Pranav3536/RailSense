import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from '../pages/OverviewPage';
import TrainExplorerPage from '../pages/TrainExplorerPage';
import DelayPredictionPage from '../pages/DelayPredictionPage';
import ModelLabPage from '../pages/ModelLabPage';
import DelayPatternsPage from '../pages/DelayPatternsPage';
import SmartInsightsPage from '../pages/SmartInsightsPage';
import NotFoundPage from '../pages/NotFoundPage';

describe('Placeholder Pages Suite', () => {
  it('renders OverviewPage with honest Phase 7 badge and planned endpoints', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OverviewPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Railway at a Glance')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 7')).toBeInTheDocument();
    expect(screen.getByText('/api/overview')).toBeInTheDocument();
    expect(screen.getByText('Integrity Note:')).toBeInTheDocument();
  });

  it('renders TrainExplorerPage with honest Phase 7 badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TrainExplorerPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Single Train Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 7')).toBeInTheDocument();
    expect(screen.getByText('/api/trains')).toBeInTheDocument();
  });

  it('renders DelayPredictionPage with honest Phase 8 badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DelayPredictionPage />
      </MemoryRouter>
    );

    expect(screen.getByText('ML Inference Engine')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 8')).toBeInTheDocument();
    expect(screen.getByText('/api/predict')).toBeInTheDocument();
  });

  it('renders ModelLabPage with honest Phase 8 badge', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ModelLabPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Model Evaluation & Transparency')).toBeInTheDocument();
    expect(screen.getByText('Planned in Phase 8')).toBeInTheDocument();
    expect(screen.getByText('/api/model/info')).toBeInTheDocument();
  });

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

    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('Return to Overview')).toBeInTheDocument();
  });
});
