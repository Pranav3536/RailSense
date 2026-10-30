import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './pages/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';

// Lazy-loaded pages for bundle efficiency
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const TrainExplorerPage = lazy(() => import('./pages/TrainExplorerPage'));
const DelayPredictionPage = lazy(() => import('./pages/DelayPredictionPage'));
const ModelLabPage = lazy(() => import('./pages/ModelLabPage'));
const DelayPatternsPage = lazy(() => import('./pages/DelayPatternsPage'));
const SmartInsightsPage = lazy(() => import('./pages/SmartInsightsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Spinner size={28} />
      <span className="text-xs text-slate-500 font-medium">Loading view...</span>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route
              path="overview"
              element={
                <Suspense fallback={<PageFallback />}>
                  <OverviewPage />
                </Suspense>
              }
            />
            <Route
              path="explorer"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TrainExplorerPage />
                </Suspense>
              }
            />
            <Route
              path="predict"
              element={
                <Suspense fallback={<PageFallback />}>
                  <DelayPredictionPage />
                </Suspense>
              }
            />
            <Route
              path="model-lab"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ModelLabPage />
                </Suspense>
              }
            />
            <Route
              path="patterns"
              element={
                <Suspense fallback={<PageFallback />}>
                  <DelayPatternsPage />
                </Suspense>
              }
            />
            <Route
              path="insights"
              element={
                <Suspense fallback={<PageFallback />}>
                  <SmartInsightsPage />
                </Suspense>
              }
            />
            {/* Dev-only styleguide route */}
            <Route
              path="design-system"
              element={
                <Suspense fallback={<PageFallback />}>
                  <DesignSystemPage />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<PageFallback />}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
export default App;
