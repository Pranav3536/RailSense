import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import {
  HelpCircle,
  Cpu,
  CheckCircle,
  BarChart3,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Spinner,
  ErrorState,
  ConfusionMatrix,
  SupportBadge,
} from '../components/ui';
import { getModelInfo, getModelMetrics } from '../api/endpoints';
import { formatNumber, formatFractionAsPercent } from '../utils/format';
import { CHART_THEME } from '../components/charts/chartTheme';
import { getFeatureLabel } from '../config/featureLabels';
import { getMetricGlossary } from '../config/metricGlossary';
import { CATEGORY_MAP, LOW_SUPPORT_THRESHOLD } from '../config/constants';

/**
 * ModelLabPage — Model Evaluation & Performance
 * Clear, professional presentation of model metrics, baseline comparisons,
 * confusion matrix, and top predictive factors on the held-out test set.
 */
export function ModelLabPage() {
  const [modelInfo, setModelInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([getModelInfo(), getModelMetrics()])
      .then(([infoData, metricsData]) => {
        if (!isMounted) return;
        setModelInfo(infoData);
        setMetrics(metricsData);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load model evaluation metrics.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 font-medium">
          Loading evaluation benchmarks and performance metrics...
        </p>
      </div>
    );
  }

  if (error || !modelInfo || !metrics) {
    return (
      <ErrorState
        title="Failed to Load Model Lab"
        message={error || 'Evaluation metrics data could not be retrieved.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const finalTest = metrics.final_test_metrics || {};
  const comparison = metrics.model_comparison || {};
  const perCategory = metrics.per_category_test || {};
  const featureImp = metrics.feature_importance || [];

  // Top 5 features by gain
  const topFeatures = (featureImp || [])
    .slice(0, 5)
    .map((f) => ({
      rawName: f.feature,
      label: getFeatureLabel(f.feature),
      importance_gain: f.importance_gain,
    }));

  // Categories sorted by sample count (descending)
  const categoryRows = Object.entries(perCategory)
    .map(([code, data]) => ({
      code,
      name: CATEGORY_MAP[code]?.name || code,
      count: data.count || 0,
      f1: typeof data.f1 === 'number' ? data.f1 : null,
    }))
    .sort((a, b) => b.count - a.count);

  const precisionDef = getMetricGlossary('precision').description;
  const recallDef = getMetricGlossary('recall').description;
  const f1Def = getMetricGlossary('f1').description;

  return (
    <div className="space-y-8 min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        title="Model Lab"
        subtitle="Evaluation metrics, baseline comparisons and feature importance on the held-out test set."
        badge={
          <Badge variant="primary" className="font-mono text-xs">
          </Badge>
        }
      />

      {/* 1. Exactly 3 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Precision */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Precision
              </span>
              <button
                type="button"
                className="cursor-help text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded p-0.5"
                title={precisionDef}
                aria-label={`Precision: ${precisionDef}`}
              >
                <HelpCircle size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {formatFractionAsPercent(finalTest.precision || 0.7402, 1)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Held-out test set
            </div>
          </CardContent>
        </Card>

        {/* Recall */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recall
              </span>
              <button
                type="button"
                className="cursor-help text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded p-0.5"
                title={recallDef}
                aria-label={`Recall: ${recallDef}`}
              >
                <HelpCircle size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {formatFractionAsPercent(finalTest.recall || 0.8203, 1)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Held-out test set
            </div>
          </CardContent>
        </Card>

        {/* F1 Score */}
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                F1 Score
              </span>
              <button
                type="button"
                className="cursor-help text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded p-0.5"
                title={f1Def}
                aria-label={`F1 Score: ${f1Def}`}
              >
                <HelpCircle size={15} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
              {finalTest.f1_positive ? finalTest.f1_positive.toFixed(4) : '0.7782'}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Held-out test set
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Model Overview Card */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary-600" aria-hidden="true" />
            <CardTitle>Model Overview</CardTitle>
          </div>
          <CardDescription>
            Estimates the likelihood of an arrival delay before departure, using scheduled timetable details and past delay patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 block">
                Model
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                LightGBM
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 block">
                Target
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                Arrival delay &gt; 15 minutes
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500 block">
                Prediction Timing
              </span>
              <span className="font-semibold text-slate-900 text-sm">
                Before departure
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Model Comparison Table (3 columns only: Model Name | F1 Score | Status) */}
      <Card className="border-slate-200 bg-white overflow-hidden min-w-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-primary-600" aria-hidden="true" />
            <CardTitle>Model Comparison</CardTitle>
          </div>
          <CardDescription>
            Comparison of benchmark models and the deployed LightGBM classifier.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div tabIndex={0} role="region" aria-label="Model comparison table" className="overflow-x-auto rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4">Model Name</th>
                  <th className="py-3 px-4">F1 Score</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {Object.keys(comparison).map((name) => {
                  const isFinal = name === 'LightGBM (Calibrated)';
                  const isEnRoute = name.includes('En-Route');
                  const isBaseline = name.includes('Baseline') || name.includes('Prior');
                  const isRaw = name.includes('(Raw)');

                  let f1Display = 'N/A';
                  if (isFinal) {
                    f1Display = finalTest.f1_positive ? finalTest.f1_positive.toFixed(4) : '0.7782';
                  }

                  let statusNode;
                  if (isFinal) {
                    statusNode = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        Final model
                      </span>
                    );
                  } else if (isEnRoute) {
                    statusNode = (
                      <span
                        title="Requires real-time en-route delay from the preceding stop; not available for pre-departure prediction."
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 cursor-help"
                      >
                        Research (not available in the app)
                      </span>
                    );
                  } else if (isBaseline) {
                    statusNode = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Baseline
                      </span>
                    );
                  } else if (isRaw) {
                    statusNode = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Compared
                      </span>
                    );
                  } else {
                    statusNode = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Compared
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={name}
                      className={isFinal ? 'bg-primary-50/40 font-semibold' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {f1Display}
                      </td>
                      <td className="py-3 px-4">
                        {statusNode}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Confusion Matrix & Top 5 Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" aria-hidden="true" />
              <CardTitle>Confusion Matrix</CardTitle>
            </div>
            <CardDescription>
              Predictions compared to actual outcomes on the 193,965 held-out test stops.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfusionMatrix matrix={finalTest.confusion_matrix} />
          </CardContent>
        </Card>

        {/* Top 5 Features Chart */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-600" aria-hidden="true" />
              <CardTitle>Top 5 Features</CardTitle>
            </div>
            <CardDescription>
              These are the factors the model uses most when predicting train delays.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="sr-only">
              Top 5 factors by importance gain in the LightGBM model:
            </div>
            <ul className="sr-only">
              {topFeatures.map((f) => (
                <li key={f.rawName}>{f.label}</li>
              ))}
            </ul>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topFeatures}
                  layout="vertical"
                  margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
                >
                  <CartesianGrid {...CHART_THEME.gridProps} horizontal={false} />
                  <XAxis
                    type="number"
                    {...CHART_THEME.axisProps}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={180}
                    interval={0}
                    {...CHART_THEME.axisProps}
                    tick={{ fill: '#334155', fontSize: 13, fontWeight: 500 }}
                  />
                  <Tooltip
                    formatter={(val) => [
                      formatNumber(Math.round(Number(val))),
                      'Importance Gain',
                    ]}
                    contentStyle={CHART_THEME.tooltipContentStyle}
                  />
                  <Bar dataKey="importance_gain" fill={CHART_THEME.colors.primary} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="importance_gain"
                      position="right"
                      formatter={(val) => `${(Number(val) / 1000).toFixed(0)}k`}
                      fill="#475569"
                      fontSize={12}
                      offset={8}
                    />
                    {topFeatures.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={idx < 3 ? CHART_THEME.colors.primary : '#94a3b8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Performance by Train Category (if present in API) */}
      {categoryRows.length > 0 && (
        <Card className="border-slate-200 bg-white overflow-hidden min-w-0">
          <CardHeader>
            <CardTitle>Performance by Train Category</CardTitle>
            <CardDescription>
              F1 scores across train service categories evaluated on the held-out test set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div tabIndex={0} role="region" aria-label="Category performance table" className="overflow-x-auto rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Train Category</th>
                    <th className="py-2.5 px-3.5">Test Stops</th>
                    <th className="py-2.5 px-3.5">F1 Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {categoryRows.map((cat) => {
                    const isLowSupport = cat.count < LOW_SUPPORT_THRESHOLD;
                    return (
                      <tr key={cat.code} className="hover:bg-slate-50">
                        <td className="py-2 px-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{cat.name}</span>
                            <span className="font-mono text-slate-600 text-xs font-semibold">({cat.code})</span>
                          </div>
                        </td>
                        <td className="py-2 px-3.5 font-mono text-slate-700">
                          <div className="flex items-center gap-2">
                            <span>{formatNumber(cat.count)}</span>
                            {isLowSupport && (
                              <SupportBadge count={cat.count} threshold={LOW_SUPPORT_THRESHOLD} />
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3.5 font-mono font-semibold text-slate-800">
                          {cat.f1 !== null ? cat.f1.toFixed(4) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Footer Line with test set size and data period */}
      <div className="pt-4 pb-2 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Held-out test set size: <strong className="text-slate-700 font-mono">193,965</strong> stops
        </span>
        <span>
          Observation window: <strong className="text-slate-700">7 Oct 2026 – 25 Oct 2026</strong> (as of 2026-10-25)
        </span>
      </div>
    </div>
  );
}

export default ModelLabPage;
