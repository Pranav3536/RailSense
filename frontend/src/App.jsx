import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './pages/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';

// Lazy-loaded pages for bundle efficiency
const WelcomePage = lazy(() => import('./pages/WelcomePage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const TrainHubPage = lazy(() => import('./pages/TrainHubPage'));
const ModelLabPage = lazy(() => import('./pages/ModelLabPage'));
const DelayPatternsPage = lazy(() => import('./pages/DelayPatternsPage'));
const SmartInsightsPage = lazy(() => import('./pages/SmartInsightsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
      <Spinner size={32} />
      <span className="text-sm text-slate-500 font-medium">Loading view...</span>
    </div>
  );
}

/**
 * Backward-compatible redirect for legacy /explorer and /explorer/:trainNumber routes.
 */
function ExplorerRedirect() {
  const { trainNumber } = useParams();
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  const to = trainNumber
    ? `/trains/${encodeURIComponent(trainNumber)}${qs ? `?${qs}` : ''}`
    : `/trains${qs ? `?${qs}` : ''}`;
  return <Navigate to={to} replace />;
}

/**
 * Backward-compatible redirect for legacy /predict route.
 * Preserves train, seq, and date query parameters into the unified Train Hub.
 */
function PredictRedirect() {
  const [searchParams] = useSearchParams();
  const train = searchParams.get('train');
  const seq = searchParams.get('seq');
  const date = searchParams.get('date');

  const nextParams = new URLSearchParams();
  if (seq) nextParams.set('seq', seq);
  if (date) nextParams.set('date', date);

  const qs = nextParams.toString();
  const to = train
    ? `/trains/${encodeURIComponent(train)}${qs ? `?${qs}` : ''}`
    : `/trains${qs ? `?${qs}` : ''}`;

  return <Navigate to={to} replace />;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<AppShell />}>
            {/* Primary Navigation Routes */}
            <Route
              index
              element={
                <Suspense fallback={<PageFallback />}>
                  <WelcomePage />
                </Suspense>
              }
            />
            <Route
              path="overview"
              element={
                <Suspense fallback={<PageFallback />}>
                  <OverviewPage />
                </Suspense>
              }
            />
            <Route
              path="trains"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TrainHubPage />
                </Suspense>
              }
            />
            <Route
              path="trains/:trainNumber"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TrainHubPage />
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

            {/* Backward Compatibility Redirects */}
            <Route path="explorer" element={<ExplorerRedirect />} />
            <Route path="explorer/:trainNumber" element={<ExplorerRedirect />} />
            <Route path="predict" element={<PredictRedirect />} />

            {/* Dev-only styleguide route */}
            <Route
              path="design-system"
              element={
                <Suspense fallback={<PageFallback />}>
                  <DesignSystemPage />
                </Suspense>
              }
            />

            {/* 404 Not Found Catch-All */}
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
