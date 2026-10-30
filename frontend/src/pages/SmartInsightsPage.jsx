import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MessageSquareText, CheckCircle2, Server } from 'lucide-react';

/**
 * SmartInsightsPage — Tab 6 Placeholder (Phase 9)
 * Truthful placeholder explaining upcoming Phase 9 Natural Language Querying scope.
 * Contains ZERO fake numbers and ZERO mock NLP results.
 */
export function SmartInsightsPage() {
  const plannedEndpoints = [
    { method: 'POST', path: '/api/insights/query', desc: 'Local parameterised NLP query engine matching train numbers, stations, and delay analytics' }
  ];

  const plannedFeatures = [
    'Natural language querying using local TF-IDF text representations and RapidFuzz matching',
    'Zero paid APIs, zero hosted LLM calls, and zero external runtime dependencies',
    'Predefined structured query intent templates with instant parameter extraction',
    'Direct links from NLP answers to deep-dive train and pattern views',
    'Strict input sanitization and graceful unparsed query fallbacks'
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Natural Language Analytics"
        subtitle="Local parameterised natural language query interface (TF-IDF + RapidFuzz) with zero runtime API costs."
        badge={<Badge variant="primary">Planned in Phase 9</Badge>}
      />

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MessageSquareText size={20} />
            </div>
            <div>
              <CardTitle>Phase 9 Milestone: Smart Insights NLP Interface</CardTitle>
              <CardDescription>
                This tab will host the interactive query box and parameterised NLP engine upon execution of Phase 9.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Planned NLP Capabilities
            </h4>
            <ul className="space-y-2.5">
              {plannedFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Server size={14} />
              Backend NLP Endpoint (Local Python Implementation)
            </h4>
            <div className="grid gap-2 sm:grid-cols-1">
              {plannedEndpoints.map((ep) => (
                <div key={ep.path} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-blue-600">{ep.method}</span>
                    <span className="font-mono text-slate-800">{ep.path}</span>
                  </div>
                  <p className="text-slate-500 text-[11px]">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
            <span className="font-semibold flex-shrink-0">Integrity Note:</span>
            <span>
              The NLP query engine operates strictly on local scikit-learn and string matching models.
              No synthetic chat responses or external LLM tokens are utilized.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default SmartInsightsPage;
