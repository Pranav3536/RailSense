import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  ExternalLink,
  Cpu,
  Search,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardContent,
  SectionHeader,
  Skeleton,
  ErrorState,
  Badge,
} from '../components/ui';
import { queryInsights, getInsightsExamples } from '../api/endpoints';

const MAX_QUESTION_CHARS = 300;
const MAX_HISTORY_ITEMS = 20;

function formatIntentLabel(intent) {
  if (!intent) return 'Telemetry Query';
  return intent
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatConfidence(level) {
  if (!level) return 'High';
  return level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
}

/**
 * SmartInsightsPage — Tab 6 Natural Language Analytics (Phase 9 & 11.7)
 * Parameterized analytical query interface powered by TF-IDF and RapidFuzz.
 * Evaluates queries via rule-based semantic slot mapping and template resolution.
 */
export function SmartInsightsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Input & Query State
  const initialQ = searchParams.get('q') || '';
  const [questionText, setQuestionText] = useState(initialQ);
  const [isLoading, setIsLoading] = useState(false);
  const [activeError, setActiveError] = useState(null);

  // Cooldown for 429 rate limit prevention
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Dynamic Examples & Capabilities from API
  const [examplesData, setExamplesData] = useState(null);
  const [examplesLoading, setExamplesLoading] = useState(true);

  // How It Works Collapsible State
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Session-only in-memory history (max 20 items, never persisted to localStorage)
  const [sessionHistory, setSessionHistory] = useState([]);

  // Active answer view (latest result)
  const [currentResult, setCurrentResult] = useState(null);

  const inputRef = useRef(null);

  // Fetch dynamic examples on mount
  useEffect(() => {
    let isMounted = true;
    async function loadExamples() {
      try {
        const data = await getInsightsExamples();
        if (isMounted) {
          setExamplesData(data);
        }
      } catch {
        // Graceful fallback if examples endpoint unavailable
      } finally {
        if (isMounted) setExamplesLoading(false);
      }
    }
    loadExamples();
    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Execute query submission
  const executeQuery = async (queryToRun, selectedEntities = null) => {
    const qClean = (queryToRun || questionText).trim();
    if (!qClean) return;

    if (qClean.length > MAX_QUESTION_CHARS) {
      setActiveError({
        message: `Question exceeds ${MAX_QUESTION_CHARS} character limit (${qClean.length} characters).`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    setIsLoading(true);
    setActiveError(null);

    try {
      const payload = { question: qClean };
      if (selectedEntities) {
        payload.selected_entities = selectedEntities;
      }

      const res = await queryInsights(payload);

      // Prepend to session history (capped at 20)
      setSessionHistory((prev) => [res, ...prev.slice(0, MAX_HISTORY_ITEMS - 1)]);
      setCurrentResult(res);
      setQuestionText('');
    } catch (err) {
      if (err.status === 429) {
        setCooldownSeconds(10);
      }
      setActiveError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit button handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading || cooldownSeconds > 0) return;
    executeQuery(questionText);
  };

  // Handle clicking an example chip
  const handleExampleClick = (exampleQuestion) => {
    setQuestionText(exampleQuestion);
    executeQuery(exampleQuestion);
  };

  // Handle clarification selection
  const handleClarificationSelect = (candidate) => {
    if (!currentResult) return;
    executeQuery(currentResult.query, {
      train_number: candidate.train_number,
      train_name: candidate.train_name,
      category: candidate.category,
    });
  };

  // Clear session history
  const handleClearHistory = () => {
    setSessionHistory([]);
    setCurrentResult(null);
  };

  const charCount = questionText.length;
  const isOverLimit = charCount > MAX_QUESTION_CHARS;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Page Header */}
      <PageHeader
        title="Natural Language Analytics"
        subtitle="Deterministic natural language query engine for instant delay diagnostics, route histories, and fleet-wide benchmarks."
        badge={<Badge variant="primary">Local NLP Engine</Badge>}
      />

      {/* 2. "How This Works" Honest Collapsible */}
      <Card className="border-blue-100 bg-gradient-to-br from-white via-blue-50/10 to-white shadow-xs">
        <CardHeader
          className="cursor-pointer select-none py-3.5 px-5 flex-row items-center justify-between"
          onClick={() => setHowItWorksOpen((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                How Smart Insights Works: Deterministic Local NLP
              </h3>
              <p className="text-xs text-slate-500">
                Deterministic Query Engine: Evaluates queries via rule-based semantic slot mapping and parameterized analytical templates to guarantee zero hallucination.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Toggle details"
          >
            {howItWorksOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </CardHeader>

        {howItWorksOpen && (
          <CardContent className="pt-0 px-5 pb-5 border-t border-slate-100 space-y-3.5 text-xs text-slate-600 leading-relaxed">
            <p>
              Smart Insights uses a <strong className="text-slate-800">TF-IDF vectorizer (word 1-2 grams + character 3-5 grams)</strong> paired with a{' '}
              <strong className="text-slate-800">Logistic Regression classifier</strong> trained on structured railway intent patterns. Entities (train numbers, station codes, service categories, time-of-day buckets) are deterministically extracted using regex and RapidFuzz over our local precomputed SQLite catalog.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Zero Hallucinations</span>
                <span>Answers fill verified templates populated strictly from precomputed SQLite tables and JSON analytics.</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Privacy Preserving</span>
                <span>Your full query text is never written to log files. Only a SHA-256 hash prefix and character length are logged.</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Pre-Departure Boundary</span>
                <span>Forward journey prediction queries are redirected to Tab 3; conversational answers display historical analytics only.</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 3. Question Input Form */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="smart-insights-input" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Query Telemetry & Historical Trends
              </label>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                id="smart-insights-input"
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="e.g. Which train category is most delayed? or What are the worst stops for train 12951?"
                disabled={isLoading}
                maxLength={MAX_QUESTION_CHARS + 50}
                className="w-full pl-4 pr-28 py-3 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-50 disabled:opacity-60"
              />
              <button
                type="submit"
                aria-label="Submit telemetry query"
                disabled={isLoading || !questionText.trim() || isOverLimit || cooldownSeconds > 0}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send size={13} />
                    <span className="hidden sm:inline-block text-2xs opacity-75 font-mono ml-0.5" aria-hidden="true">↵</span>
                  </>
                )}
              </button>
            </div>

            {cooldownSeconds > 0 && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5 pt-1">
                <AlertCircle size={14} />
                Rate limit cooldown active. Please wait {cooldownSeconds}s before submitting another question.
              </p>
            )}
          </form>

          {/* Curated Example Chips */}
          <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Suggested Questions
            </span>
            <div className="flex flex-wrap gap-2">
              {examplesLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-48 rounded-lg" />
                  <Skeleton className="h-7 w-36 rounded-lg" />
                  <Skeleton className="h-7 w-52 rounded-lg" />
                </div>
              ) : (
                examplesData?.examples?.slice(0, 6).map((ex) => (
                  <button
                    key={ex.question}
                    type="button"
                    onClick={() => handleExampleClick(ex.question)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-xs text-slate-700 transition-colors text-left"
                  >
                    {ex.question}
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Active Error State */}
      {activeError && (
        <ErrorState
          title="Query Evaluation Error"
          message={activeError.message}
          requestId={activeError.requestId}
          onRetry={() => executeQuery(questionText)}
        />
      )}

      {/* 5. Primary Answer Card */}
      {currentResult && (() => {
        const hasEntities = Boolean(
          currentResult.entities &&
          (currentResult.entities.train_number ||
           currentResult.entities.train_name ||
           currentResult.entities.station_code ||
           currentResult.entities.category ||
           currentResult.entities.weekday ||
           currentResult.entities.time_of_day)
        );

        return (
          <section role="region" aria-labelledby="answer-heading" aria-live="polite" className="space-y-4">
            <SectionHeader
              id="answer-heading"
              title="Analysis Result"
              description="Truthfully compiled response from observed historical records."
              icon={Cpu}
              badge={
                <Badge
                  variant={
                    currentResult.confidence_level === 'HIGH'
                      ? 'success'
                      : currentResult.confidence_level === 'MEDIUM'
                      ? 'primary'
                      : 'warning'
                  }
                >
                  {formatConfidence(currentResult.confidence_level)} Confidence ({Math.round(currentResult.confidence * 100)}%)
                </Badge>
              }
            />

            <Card className="border-blue-200 bg-white shadow-sm overflow-hidden">
              {/* Header: User Question + Understood Entities */}
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Query: «{currentResult.query}»
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    Query Type: {formatIntentLabel(currentResult.understood_intent)}
                  </span>
                </div>

                {/* Resolved Entity Chips */}
                {hasEntities && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-xs text-slate-500 font-medium mr-1">Entities:</span>
                    {currentResult.entities?.train_number && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-mono font-semibold">
                        Train #{currentResult.entities.train_number}
                      </span>
                    )}
                    {currentResult.entities?.train_name && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                        {currentResult.entities.train_name}
                      </span>
                    )}
                    {currentResult.entities?.station_code && (
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-mono font-semibold">
                        Station {currentResult.entities.station_code}
                      </span>
                    )}
                    {currentResult.entities?.category && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-mono">
                        Category {currentResult.entities.category}
                      </span>
                    )}
                    {currentResult.entities?.weekday && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                        {currentResult.entities.weekday}
                      </span>
                    )}
                    {currentResult.entities?.time_of_day && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs capitalize">
                        {currentResult.entities.time_of_day}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {/* Answer Text */}
              <p className="text-base font-medium text-slate-800 leading-relaxed">
                {currentResult.answer?.answer_text}
              </p>

              {/* Clarification Options Flow */}
              {currentResult.needs_clarification && currentResult.clarification_options?.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <span className="text-xs font-bold text-amber-900 block uppercase tracking-wider">
                    Please select one of the following train services:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentResult.clarification_options.map((cand) => (
                      <button
                        key={cand.train_number}
                        type="button"
                        onClick={() => handleClarificationSelect(cand)}
                        className="p-3 bg-white rounded-lg border border-amber-300 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all shadow-2xs group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-blue-700 text-sm">
                            {cand.train_number}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                            {cand.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium truncate">
                          {cand.train_name}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions for Low Confidence / Fallback */}
              {currentResult.suggestions?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Suggested Topics You Can Explore
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentResult.suggestions.map((sug) => (
                      <button
                        key={sug.intent}
                        type="button"
                        onClick={() => executeQuery(`Tell me about ${sug.intent.replace(/_/g, ' ')}`)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                      >
                        {sug.description || sug.intent.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Result: KPI Cards */}
              {currentResult.answer?.visual_type === 'kpi' && Array.isArray(currentResult.answer.visual_data) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {currentResult.answer.visual_data.map((kpi, idx) => (
                    <div key={`kpi-${idx}`} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-medium block truncate">
                        {kpi.label}
                      </span>
                      <span className="text-xl font-bold font-mono text-slate-900 block my-0.5">
                        {kpi.value}
                      </span>
                      {kpi.hint && (
                        <span className="text-2xs text-slate-400 block truncate">
                          {kpi.hint}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Visual Result: Table View */}
              {currentResult.answer?.visual_type === 'table' && Array.isArray(currentResult.answer.visual_data) && (
                <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl bg-white shadow-2xs" tabIndex={0} role="region" aria-label="Query results data table">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                      <tr>
                        {Object.keys(currentResult.answer.visual_data[0] || {}).map((colKey) => (
                          <th key={colKey} className="py-2.5 px-3 whitespace-nowrap">
                            {colKey}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {currentResult.answer.visual_data.map((row, rowIdx) => (
                        <tr key={`row-${rowIdx}`} className="hover:bg-slate-50/60">
                          {Object.values(row).map((cellVal, cellIdx) => (
                            <td key={`cell-${cellIdx}`} className="py-2 px-3 whitespace-nowrap text-slate-800">
                              {String(cellVal)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Deep Link Button */}
              {currentResult.answer?.deep_link && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(currentResult.answer.deep_link.path)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <span>{currentResult.answer.deep_link.label}</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
              )}

              {/* Caveats & Integrity Notes */}
              {currentResult.answer?.caveats?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  {currentResult.answer.caveats.map((cav, cIdx) => (
                    <p key={`cav-${cIdx}`} className="text-amber-800/90 font-medium">
                      • {cav}
                    </p>
                  ))}
                </div>
              )}

              {/* "How This Was Answered" Collapsible */}
              <details className="group border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-xs">
                <summary className="font-bold text-slate-700 cursor-pointer select-none flex items-center justify-between">
                  <span>How This Answer Was Generated (Technical Provenance)</span>
                  <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="pt-3 mt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 font-mono">
                  <div>
                    <span className="font-bold text-slate-700 font-sans block">Template:</span>
                    <span>{currentResult.explanation?.template_id}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 font-sans block">Classified Intent:</span>
                    <span>{currentResult.explanation?.resolved_intent}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 font-sans block">Confidence & Margin:</span>
                    <span>
                      {(currentResult.explanation?.confidence_score * 100).toFixed(1)}% (margin: {(currentResult.explanation?.confidence_margin * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 font-sans block">Data Source:</span>
                    <span className="font-sans">{currentResult.explanation?.data_source}</span>
                  </div>
                  {currentResult.answer?.definition_note && (
                    <div className="sm:col-span-2 pt-1 font-sans text-slate-600">
                      <span className="font-bold text-slate-700 block">Analytical Definition:</span>
                      <span>{currentResult.answer.definition_note}</span>
                    </div>
                  )}
                  <div className="sm:col-span-2 pt-1 font-sans text-emerald-700 font-semibold">
                    ✓ {currentResult.explanation?.safety_note}
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>
        </section>
      );
    })()}

      {/* 6. Session History Section */}
      {sessionHistory.length > 1 && (
        <section aria-labelledby="history-heading" className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <SectionHeader
              id="history-heading"
              title="Recent Questions This Session"
              description="Temporary in-memory history (latest 20 queries, cleared on page refresh)."
              icon={History}
              badge={<Badge variant="default">{sessionHistory.length} queries</Badge>}
            />
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>

          <div className="space-y-2">
            {sessionHistory.slice(1).map((histItem, hIdx) => (
              <div
                key={`hist-${hIdx}`}
                className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 transition-colors flex items-center justify-between cursor-pointer"
                onClick={() => setCurrentResult(histItem)}
              >
                <div className="flex items-center gap-3 truncate">
                  <Search size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {histItem.query}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {formatIntentLabel(histItem.understood_intent)}
                  </span>
                  <Badge variant="primary" size="sm">
                    {formatConfidence(histItem.confidence_level)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SmartInsightsPage;
