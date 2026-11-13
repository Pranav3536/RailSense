
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
  if (!intent) return 'General Question';

  return intent
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatConfidence(level) {
  if (!level) return 'High Match';

  const normalized = level.toUpperCase();

  if (normalized === 'HIGH') return 'High Match';
  if (normalized === 'MEDIUM') return 'Medium Match';
  if (normalized === 'LOW') return 'Low Match';

  return 'Match Found';
}

export function SmartInsightsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Question and result state
  const initialQ = searchParams.get('q') || '';
  const [questionText, setQuestionText] = useState(initialQ);
  const [isLoading, setIsLoading] = useState(false);
  const [activeError, setActiveError] = useState(null);

  // Request cooldown
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Suggested questions
  const [examplesData, setExamplesData] = useState(null);
  const [examplesLoading, setExamplesLoading] = useState(true);

  // Expandable sections
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Session history
  const [sessionHistory, setSessionHistory] = useState([]);

  // Current result
  const [currentResult, setCurrentResult] = useState(null);

  const inputRef = useRef(null);

  // Fetch suggested questions
  useEffect(() => {
    let isMounted = true;

    async function loadExamples() {
      try {
        const data = await getInsightsExamples();

        if (isMounted) {
          setExamplesData(data);
        }
      } catch {
        // Suggested questions are optional.
      } finally {
        if (isMounted) {
          setExamplesLoading(false);
        }
      }
    }

    loadExamples();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Submit question
  const executeQuery = async (queryToRun, selectedEntities = null) => {
    const qClean = (queryToRun || questionText).trim();

    if (!qClean || isLoading || cooldownSeconds > 0) return;

    if (qClean.length > MAX_QUESTION_CHARS) {
      setActiveError({
        message: `Please keep your question within ${MAX_QUESTION_CHARS} characters.`,
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

      setSessionHistory((prev) => [
        res,
        ...prev.slice(0, MAX_HISTORY_ITEMS - 1),
      ]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLoading || cooldownSeconds > 0) return;

    executeQuery(questionText);
  };

  const handleExampleClick = (exampleQuestion) => {
    setQuestionText(exampleQuestion);
    executeQuery(exampleQuestion);
  };

  const handleClarificationSelect = (candidate) => {
    if (!currentResult) return;

    executeQuery(currentResult.query, {
      train_number: candidate.train_number,
      train_name: candidate.train_name,
      category: candidate.category,
    });
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    setCurrentResult(null);
  };

  const charCount = questionText.length;
  const isOverLimit = charCount > MAX_QUESTION_CHARS;

  return (
    <div className="space-y-8 pb-12">

      {/* Page Header */}
      <PageHeader
        title="Smart Insights"
        subtitle="Ask questions about trains, stations, delays and railway performance using simple language."
        badge={<Badge variant="primary">Natural Language Search</Badge>}
      />

      {/* How Smart Insights Works */}
      <Card className="border-blue-100 bg-white shadow-sm">
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
                How Smart Insights Works
              </h3>

              <p className="text-xs text-slate-500">
                Ask a question and explore relevant railway data and insights.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700"
            aria-label="Toggle details"
          >
            {howItWorksOpen ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>
        </CardHeader>

        {howItWorksOpen && (
          <CardContent className="pt-4 px-5 pb-5 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1 text-sm">
                  1. Ask a Question
                </span>
                <span className="text-xs text-slate-600">
                  Type your question in your own words about trains, stations or delays.
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1 text-sm">
                  2. Find Relevant Data
                </span>
                <span className="text-xs text-slate-600">
                  The system identifies what you are looking for and finds matching railway information.
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1 text-sm">
                  3. Explore Results
                </span>
                <span className="text-xs text-slate-600">
                  View the answer through summaries, statistics or tables.
                </span>
              </div>

            </div>
          </CardContent>
        )}
      </Card>

      {/* Question Input */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-3">

            <div className="flex items-center justify-between">
              <label
                htmlFor="smart-insights-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Ask a Question
              </label>

              <span className="text-xs text-slate-600 font-medium">
                {charCount}/{MAX_QUESTION_CHARS}
              </span>
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
                placeholder="Ask anything about train delays, stations or railway performance..."
                disabled={isLoading}
                maxLength={MAX_QUESTION_CHARS + 50}
                className="w-full pl-4 pr-28 py-3 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-50 disabled:opacity-60"
              />

              <button
                type="submit"
                aria-label="Submit question"
                disabled={
                  isLoading ||
                  !questionText.trim() ||
                  isOverLimit ||
                  cooldownSeconds > 0
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send size={13} />
                  </>
                )}
              </button>
            </div>

            {isOverLimit && (
              <p className="text-xs text-rose-600">
                Please shorten your question to 300 characters.
              </p>
            )}

            {cooldownSeconds > 0 && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5 pt-1">
                <AlertCircle size={14} />
                Please wait {cooldownSeconds} seconds before asking another question.
              </p>
            )}

          </form>

          {/* Suggested Questions */}
          <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Try These Questions
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
                    disabled={isLoading || cooldownSeconds > 0}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-xs text-slate-700 transition-colors text-left disabled:opacity-50"
                  >
                    {ex.question}
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {activeError && (
        <ErrorState
          title="Unable to Process Question"
          message={activeError.message}
          requestId={activeError.requestId}
          onRetry={() => executeQuery(questionText)}
        />
      )}

      {/* Current Result */}
      {currentResult && (() => {
        const hasEntities = Boolean(
          currentResult.entities &&
          (
            currentResult.entities.train_number ||
            currentResult.entities.train_name ||
            currentResult.entities.station_code ||
            currentResult.entities.category ||
            currentResult.entities.weekday ||
            currentResult.entities.time_of_day
          )
        );

        const confidenceVariant =
          currentResult.confidence_level === 'HIGH'
            ? 'success'
            : currentResult.confidence_level === 'MEDIUM'
              ? 'primary'
              : 'warning';

        return (
          <section
            role="region"
            aria-labelledby="answer-heading"
            aria-live="polite"
            className="space-y-4"
          >
            <SectionHeader
              id="answer-heading"
              title="Your Results"
              description="Insights based on available railway data."
              icon={Cpu}
              badge={
                <Badge variant={confidenceVariant}>
                  {formatConfidence(currentResult.confidence_level)}
                </Badge>
              }
            />

            <Card className="border-blue-200 bg-white shadow-sm overflow-hidden">

              {/* Question and Details */}
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Question: &ldquo;{currentResult.query}&rdquo;
                  </span>

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {formatIntentLabel(currentResult.understood_intent)}
                  </span>
                </div>

                {hasEntities && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-xs text-slate-500 font-medium mr-1">
                      Details Found:
                    </span>

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
                        {currentResult.entities.category}
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

                {/* Answer */}
                <p className="text-base font-medium text-slate-800 leading-relaxed">
                  {currentResult.answer?.answer_text}
                </p>

                {/* Clarification Options */}
                {currentResult.needs_clarification &&
                  currentResult.clarification_options?.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <span className="text-xs font-bold text-amber-900 block">
                        Which train are you referring to?
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentResult.clarification_options.map((cand) => (
                          <button
                            key={cand.train_number}
                            type="button"
                            onClick={() => handleClarificationSelect(cand)}
                            className="p-3 bg-white rounded-lg border border-amber-300 hover:border-blue-500 hover:bg-blue-50/30 text-left transition-all shadow-2xs"
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

                {/* Suggestions */}
                {currentResult.suggestions?.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <span className="text-xs font-bold text-slate-700 block">
                      You Can Also Ask
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {currentResult.suggestions.map((sug) => (
                        <button
                          key={sug.intent}
                          type="button"
                          onClick={() =>
                            executeQuery(
                              `Tell me about ${sug.intent.replace(/_/g, ' ')}`
                            )
                          }
                          disabled={isLoading || cooldownSeconds > 0}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-xs font-medium text-slate-700 transition-colors shadow-2xs disabled:opacity-50"
                        >
                          {sug.description || sug.intent.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* KPI Results */}
                {currentResult.answer?.visual_type === 'kpi' &&
                  Array.isArray(currentResult.answer.visual_data) &&
                  currentResult.answer.visual_data.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {currentResult.answer.visual_data.map((kpi, idx) => (
                        <div
                          key={`kpi-${idx}`}
                          className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200"
                        >
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

                {/* Table Results */}
                {currentResult.answer?.visual_type === 'table' &&
                  Array.isArray(currentResult.answer.visual_data) &&
                  currentResult.answer.visual_data.length > 0 && (
                    <div
                      className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl bg-white shadow-2xs"
                      tabIndex={0}
                      role="region"
                      aria-label="Query results table"
                    >
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-600 sticky top-0 border-b border-slate-200">
                          <tr>
                            {Object.keys(
                              currentResult.answer.visual_data[0] || {}
                            ).map((colKey) => (
                              <th
                                key={colKey}
                                className="py-2.5 px-3 whitespace-nowrap"
                              >
                                {colKey}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 font-mono">
                          {currentResult.answer.visual_data.map((row, rowIdx) => (
                            <tr
                              key={`row-${rowIdx}`}
                              className="hover:bg-slate-50/60"
                            >
                              {Object.values(row).map((cellVal, cellIdx) => (
                                <td
                                  key={`cell-${cellIdx}`}
                                  className="py-2 px-3 whitespace-nowrap text-slate-800"
                                >
                                  {String(cellVal)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {/* Deep Link */}
                {currentResult.answer?.deep_link && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(currentResult.answer.deep_link.path)
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                    >
                      <span>{currentResult.answer.deep_link.label}</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}

                {/* Important Notes */}
                {currentResult.answer?.caveats?.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    {currentResult.answer.caveats.map((cav, cIdx) => (
                      <p
                        key={`cav-${cIdx}`}
                        className="text-amber-800/90 font-medium"
                      >
                        • {cav}
                      </p>
                    ))}
                  </div>
                )}

{/* Query Processing Details */}
<details className="group border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-xs">
  <summary className="font-bold text-slate-700 cursor-pointer select-none flex items-center justify-between">
    <span>How Your Question Was Processed</span>
    <span className="text-slate-600 group-open:rotate-180 transition-transform">
      ▼
    </span>
  </summary>

  <div className="pt-3 mt-3 border-t border-slate-200 space-y-4 text-slate-600">

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {currentResult.explanation?.resolved_intent && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-slate-500 font-semibold block mb-1">
            Detected Query Type
          </span>
          <span className="font-semibold text-slate-800">
            {formatIntentLabel(
              currentResult.explanation.resolved_intent
            )}
          </span>
        </div>
      )}

      {currentResult.explanation?.confidence_score != null && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-slate-500 font-semibold block mb-1">
            Intent Match Score
          </span>

          <span className="font-semibold text-slate-800">
            {(currentResult.explanation.confidence_score * 100).toFixed(1)}%
          </span>

          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    currentResult.explanation.confidence_score * 100
                  )
                )}%`
              }}
            />
          </div>
        </div>
      )}
    </div>

    {currentResult.answer?.definition_note && (
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <span className="font-semibold text-slate-700 block mb-1">
          Metric Definition
        </span>
        <p className="leading-relaxed">
          {currentResult.answer.definition_note}
        </p>
      </div>
    )}

    {currentResult.explanation?.safety_note && (
      <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-3">
        <span className="font-semibold text-emerald-800 block mb-1">
          Data Context
        </span>
        <p className="text-emerald-700 leading-relaxed">
          {currentResult.explanation.safety_note}
        </p>
      </div>
    )}
  </div>
</details>

              </CardContent>
            </Card>
          </section>
        );
      })()}
      {/* Recent Questions */}
      {sessionHistory.length > 1 && (
        <section
          aria-labelledby="history-heading"
          className="space-y-4 pt-4 border-t border-slate-200"
        >
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              id="history-heading"
              title="Recent Questions"
              description="Questions asked during this visit."
              icon={History}
              badge={
                <Badge variant="default">
                  {sessionHistory.length} questions
                </Badge>
              }
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
              <button
                key={`hist-${hIdx}`}
                type="button"
                onClick={() => setCurrentResult(histItem)}
                className="w-full p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 transition-colors flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3 truncate">
                  <Search size={14} className="text-slate-400 flex-shrink-0" />

                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {histItem.query}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="hidden sm:inline-block text-xs font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                    {formatIntentLabel(histItem.understood_intent)}
                  </span>

                  <Badge variant="primary" size="sm">
                    {formatConfidence(histItem.confidence_level)}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

export default SmartInsightsPage;
