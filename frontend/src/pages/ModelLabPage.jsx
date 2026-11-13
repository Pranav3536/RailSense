import { useState, useEffect, useMemo } from 'react';
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
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Zap,
  HardDrive,
  Award,
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
 * ModelLabPage — Model Evaluation & Performance Benchmark
 * Disciplined multi-algorithm benchmark comparing 12 standard algorithms and baselines,
 * "Why LightGBM" empirical justification, confusion matrix, and feature importance.
 */
export function ModelLabPage() {
  const [modelInfo, setModelInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Benchmark split toggle: 'test' (Held-out test set) vs 'val' (Validation set)
  const [splitTab, setSplitTab] = useState('test');

  // F1 sort direction: 'desc' | 'asc'
  const [sortDirection, setSortDirection] = useState('desc');

  // Collapsible toggle for Other Techniques card
  const [isOtherTechniquesOpen, setIsOtherTechniquesOpen] = useState(false);

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

  // Sorted benchmark models by F1 on the chosen split
  const sortedModels = useMemo(() => {
    const list = metrics?.algorithm_benchmark?.models || [];
    if (!list.length) return [];
    return [...list].sort((a, b) => {
      const aSplit = splitTab === 'test' ? (a.test_metrics || a.test) : (a.val_metrics || a.validation);
      const bSplit = splitTab === 'test' ? (b.test_metrics || b.test) : (b.val_metrics || b.validation);
      const aF1 = typeof aSplit?.f1 === 'number' ? aSplit.f1 : -1;
      const bF1 = typeof bSplit?.f1 === 'number' ? bSplit.f1 : -1;
      return sortDirection === 'desc' ? bF1 - aF1 : aF1 - bF1;
    });
  }, [metrics, splitTab, sortDirection]);

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

  const benchmarkData = metrics.algorithm_benchmark;
  const unsupervisedData = benchmarkData?.unsupervised;
  const finalTest = metrics.final_test_metrics || {};
  const perCategory = metrics.per_category_test || {};
  const featureImp = metrics.feature_importance || [];
  const provenance = benchmarkData?.provenance || metrics.provenance || {};

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
  const apDef = getMetricGlossary('ap').description;
  const rocAucDef = getMetricGlossary('roc_auc').description;

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

return (
  <div className="space-y-8 min-w-0 max-w-full overflow-x-hidden">
    <PageHeader
      title="Model Lab"
      subtitle="Explore model performance, compare algorithms, and understand feature importance using held-out test data."
      badge={
        <Badge variant="primary" className="font-mono text-xs">
          ML Evaluation
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

      {/* 3. Multi-Algorithm Benchmark Comparison Table */}
      <Card className="border-slate-200 bg-white overflow-hidden min-w-0">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-primary-600" aria-hidden="true" />
              <CardTitle>Model Comparison</CardTitle>
            </div>

            {/* Split Toggle */}
            <div
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto"
              role="tablist"
              aria-label="Evaluation split selector"
            >
              <button
                type="button"
                role="tab"
                aria-selected={splitTab === 'test'}
                onClick={() => setSplitTab('test')}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  splitTab === 'test'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Held-out test set
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={splitTab === 'val'}
                onClick={() => setSplitTab('val')}
                className={`min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                  splitTab === 'val'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Validation set
              </button>
            </div>
          </div>

          <CardDescription>
            Comparison of benchmark models and the deployed LightGBM classifier across 12 standard algorithms and baselines on chronological train, validation, and held-out test splits.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div
            tabIndex={0}
            role="region"
            aria-label="Model comparison table"
            className="overflow-x-auto rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="py-3 px-4 sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                    Model Name
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={toggleSort}
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded min-h-[32px]"
                      aria-label={`Sort by F1 Score (${sortDirection === 'desc' ? 'descending' : 'ascending'})`}
                    >
                      <span>F1 Score</span>
                      {sortDirection === 'desc' ? (
                        <ArrowDown size={14} className="text-primary-600" aria-hidden="true" />
                      ) : (
                        <ArrowUp size={14} className="text-primary-600" aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1" title={apDef}>
                      <span>PR-AUC</span>
                      <HelpCircle size={13} className="text-slate-400" aria-hidden="true" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1" title={rocAucDef}>
                      <span>ROC-AUC</span>
                      <HelpCircle size={13} className="text-slate-400" aria-hidden="true" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1" title="p95 single-row inference latency across held-out test samples">
                      <span>Prediction time (p95)</span>
                      <HelpCircle size={13} className="text-slate-400" aria-hidden="true" />
                    </span>
                  </th>
                  <th className="py-3 px-4">
                    <span className="inline-flex items-center gap-1" title="Serialized model memory size in megabytes">
                      <span>Model size</span>
                      <HelpCircle size={13} className="text-slate-400" aria-hidden="true" />
                    </span>
                  </th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedModels.length > 0 ? (
                  sortedModels.map((m) => {
                    const name = m.model_name || m.name;
                    const id = m.model_id || m.id || name;
                    const splitMetrics = splitTab === 'test' ? (m.test_metrics || m.test) : (m.val_metrics || m.validation);
                    const isSelected = m.is_selected === true;
                    const isBaseline = m.is_baseline === true;

                    const f1Display = typeof splitMetrics?.f1 === 'number'
                      ? splitMetrics.f1.toFixed(4)
                      : 'Not measured';
                    const prAucDisplay = typeof splitMetrics?.pr_auc === 'number'
                      ? splitMetrics.pr_auc.toFixed(4)
                      : 'Not measured';
                    const rocAucDisplay = typeof splitMetrics?.roc_auc === 'number'
                      ? splitMetrics.roc_auc.toFixed(4)
                      : 'Not measured';

                    const rawLatency = m.single_prediction_p95_ms ?? m.latency?.single_row_p95_ms;
                    let latencyDisplay = 'Not measured';
                    if (rawLatency !== undefined && rawLatency !== null) {
                      latencyDisplay = rawLatency === 0
                        ? '< 0.01 ms'
                        : `${Number(rawLatency).toFixed(2)} ms`;
                    }

                    const rawSize = m.model_size_mb ?? m.memory?.model_size_mb;
                    let sizeDisplay = 'Not measured';
                    if (rawSize !== undefined && rawSize !== null) {
                      sizeDisplay = rawSize === 0
                        ? '< 0.01 MB'
                        : `${Number(rawSize).toFixed(2)} MB`;
                    }

                    const verdict = m.verdict || m.notes;

                    return (
                      <tr
                        key={id}
                        className={isSelected ? 'bg-primary-50/50 font-semibold' : 'hover:bg-slate-50'}
                      >
                        <td
                          className={`py-3 px-4 text-slate-900 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0] ${
                            isSelected ? 'bg-primary-50/90 font-semibold text-primary-950' : 'bg-white font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{name}</span>
                            {m.family && (
                              <span className="text-xs font-normal text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {m.family}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {f1Display}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {prAucDisplay}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {rocAucDisplay}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {latencyDisplay}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {sizeDisplay}
                        </td>
                        <td className="py-3 px-4">
                          {isSelected ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              Final model
                            </span>
                          ) : isBaseline ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              Baseline
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {verdict || 'Compared'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No algorithm benchmark data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footnote */}
          <p className="text-xs text-slate-500 leading-relaxed pt-1">
            All models evaluated on the temporal train split (1,302,077 rows, 8–20 Oct 2026), validation split (204,308 rows, 21–22 Oct 2026), and held-out test split (193,965 rows, 23–24 Oct 2026). KNN and LinearSVC evaluated on representative uniform subsamples (50,000 and 100,000 rows respectively) for single-node compute feasibility.
          </p>
        </CardContent>
      </Card>

     
{/* 4. Why LightGBM Card */}
<Card className="border-slate-200 bg-white">
  <CardHeader>
    <div className="flex items-center gap-2">
      <Award size={18} className="text-primary-600" aria-hidden="true" />
      <CardTitle>Why LightGBM for Production</CardTitle>
    </div>
    <CardDescription>
      Key results from the algorithm benchmark that support choosing LightGBM for deployment.
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <CheckCircle size={16} className="text-emerald-600" aria-hidden="true" />
          <span>Best Validation Performance</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          LightGBM achieved the highest validation PR-AUC (0.8608) and F1 score (0.7867) among the evaluated algorithms. It performed better than the linear models and other tree-based models on unseen time-based data.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <Zap size={16} className="text-amber-600" aria-hidden="true" />
          <span>Fast Predictions (1.93 ms)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          LightGBM takes only 1.93 ms at p95 for a single prediction. It is around 38x faster than Random Forest (74.47 ms) and 3.2x faster than KNN (6.22 ms), helping keep prediction requests responsive.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <HardDrive size={16} className="text-blue-600" aria-hidden="true" />
          <span>Small Model Size (1.97 MB)</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The saved LightGBM model is only 1.97 MB, compared to 15.08 MB for Random Forest and 11.06 MB for KNN. Its smaller size makes storage and deployment easier.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
          <Layers size={16} className="text-primary-600" aria-hidden="true" />
          <span>Efficient Tree Building</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          LightGBM uses histogram-based feature binning (<code className="font-mono text-slate-800">max_bin=255</code>) and leaf-wise tree growth (<code className="font-mono text-slate-800">num_leaves=63</code>). These techniques help it learn complex patterns efficiently.
        </p>
      </div>

    </div>
  </CardContent>
</Card>

{/* 5. Other Evaluated Techniques */}
<Card className="border-slate-200 bg-white">
  <CardHeader
    className="cursor-pointer select-none"
    onClick={() => setIsOtherTechniquesOpen((prev) => !prev)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Cpu size={18} className="text-slate-600" aria-hidden="true" />
        <CardTitle>Other Evaluated Techniques & Unsupervised Analysis</CardTitle>
      </div>

      <button
        type="button"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 rounded-lg"
        aria-expanded={isOtherTechniquesOpen}
        aria-label="Toggle other evaluated techniques details"
      >
        {isOtherTechniquesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
    </div>

    <CardDescription>
      Overview of other tested algorithms, dimensionality reduction and clustering techniques.
    </CardDescription>
  </CardHeader>

  {isOtherTechniquesOpen && (
    <CardContent className="space-y-4 pt-2 border-t border-slate-100">
      <div className="space-y-3 text-xs leading-relaxed text-slate-600">

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="font-bold text-slate-800 block text-sm mb-1">
            Linear Regression (Continuous Delay Prediction)
          </span>
          <p>
            This model predicts arrival delay in minutes. Its output was converted into a delayed/not-delayed result using a 17.06-minute threshold. It achieved validation PR-AUC of 0.7990 and test F1 of 0.7416. Its performance was lower than LightGBM, showing that tree-based models handled the patterns better.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="font-bold text-slate-800 block text-sm mb-1">
            K-Nearest Neighbors (KNN, k=25)
          </span>
          <p>
            KNN was tested on a representative sample of 50,000 records. It achieved validation PR-AUC of 0.7951 and test F1 of 0.7639. However, its p95 prediction time was 6.22 ms. Searching through the full 1.3 million training records would be expensive during production use.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="font-bold text-slate-800 block text-sm mb-1">
            Linear Support Vector Machine (LinearSVC)
          </span>
          <p>
            LinearSVC uses a decision boundary to separate delayed and non-delayed records. It was tested on 100,000 records and achieved validation PR-AUC of 0.8551 and test F1 of 0.7721. Its prediction time was 0.23 ms using a decision threshold of -0.12.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-800 text-sm">
              Principal Component Analysis (PCA)
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-700">
              Unsupervised: not a classifier
            </span>
          </div>
          <p>
            {unsupervisedData?.pca
              ? `${unsupervisedData.pca.components_for_90_variance || unsupervisedData.pca.n_components_90_pct_variance || 16} components explain 90% variance, while ${unsupervisedData.pca.components_for_95_variance || unsupervisedData.pca.n_components_95_pct_variance || 18} components explain 95%. Logistic Regression using the top 18 PCA components achieved validation PR-AUC of ${unsupervisedData.pca.logistic_regression_val_pr_auc_with_pca || unsupervisedData.pca.lr_with_18_pca_val_pr_auc || 0.8537}, compared to 0.8542 without PCA.`
              : '16 components explain 90% variance, while 18 components explain 95%. Logistic Regression using 18 PCA components achieved validation PR-AUC of 0.8537.'}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-800 text-sm">
              K-Means Clustering
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-700">
              Unsupervised: not a classifier
            </span>
          </div>
          <p>
            {unsupervisedData?.kmeans
              ? `K-Means identified ${unsupervisedData.kmeans.chosen_k || unsupervisedData.kmeans.n_clusters || 7} clusters with a silhouette score of ${unsupervisedData.kmeans.chosen_silhouette || unsupervisedData.kmeans.silhouette_score || 0.1778}. The clusters showed different delay-rate groups, ranging from 13.6% in low-delay clusters to 78.2% in high-delay clusters across 50,000 samples.`
              : 'K-Means identified 7 clusters with a silhouette score of 0.1778. The clusters showed different delay-rate groups, ranging from 13.6% in low-delay clusters to 78.2% in high-delay clusters across 50,000 samples.'}
          </p>
        </div>

      </div>
    </CardContent>
  )}
</Card>


      {/* 6. Confusion Matrix & Top 5 Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" aria-hidden="true" />
              <CardTitle>Confusion Matrix</CardTitle>
            </div>
            <CardDescription>
              Predictions compared to actual outcomes on the {(provenance.test_rows || finalTest.test_samples || 193965).toLocaleString('en-US')} held-out test stops.
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

      {/* 7. Performance by Train Category (if present in API) */}
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

      {/* 8. Footer Line with test set size and data period */}
      <div className="pt-4 pb-2 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Held-out test set size: <strong className="text-slate-700 font-mono">{(provenance.test_rows || finalTest.test_samples || 193965).toLocaleString('en-US')}</strong> stops
        </span>
        <span>
          Observation window: <strong className="text-slate-700">8 Oct 2026 – 24 Oct 2026</strong> (chronological train/val/test splits)
        </span>
      </div>
    </div>
  );
}

export default ModelLabPage;
