import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BarChart3, CheckCircle2, Server } from 'lucide-react';

/**
 * DelayPatternsPage — Tab 5 Placeholder (Phase 9)
 * Truthful placeholder explaining upcoming Phase 9 Historical Analytics scope.
 * Contains ZERO fake numbers and ZERO mock charts.
 */
export function DelayPatternsPage() {
  const plannedEndpoints = [
    { method: 'GET', path: '/api/patterns/hourly', desc: 'Precomputed delay rates broken down by scheduled departure hour' },
    { method: 'GET', path: '/api/patterns/daily', desc: 'Empirical delay rates broken down by day of week' },
    { method: 'GET', path: '/api/patterns/category', desc: 'Delay rates and median arrival delays across train classifications' },
    { method: 'GET', path: '/api/patterns/sequence', desc: 'Delay progression as route sequence number increases' },
    { method: 'GET', path: '/api/stations', desc: 'Observed station stop frequencies and delay statistics' }
  ];

  const plannedFeatures = [
    'Hourly departure profile analyzing delay variations across time of day',
    'Day-of-week breakdown revealing operational variances between weekdays and weekends',
    'Category delay comparison highlighting differences across train service classes',
    'Journey progression analysis showing cumulative delay evolution as stops advance',
    'Station hotspot explorer displaying observed stop frequencies across the network'
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historical Analytics"
        subtitle="Empirical delay distributions decomposed by scheduled hour, day of week, train category, and sequence depth."
        badge={<Badge variant="primary">Planned in Phase 9</Badge>}
      />

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <CardTitle>Phase 9 Milestone: Empirical Delay Patterns</CardTitle>
              <CardDescription>
                This tab will display multi-dimensional historical delay patterns upon execution of Phase 9.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3.5">
              Planned Analytical Views
            </h4>
            <ul className="space-y-3">
              {plannedFeatures.map((feat) => (
                <li key={feat} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3.5 flex items-center gap-2">
              <Server size={18} />
              Backend Pattern Endpoints (Precomputed Serving Store)
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {plannedEndpoints.map((ep) => (
                <div key={ep.path} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="font-mono font-bold text-blue-600">{ep.method}</span>
                    <span className="font-mono text-slate-800 font-medium">{ep.path}</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-sm flex items-start gap-3">
            <span className="font-semibold flex-shrink-0">Integrity Note:</span>
            <span className="leading-relaxed">
              All pattern breakdowns are empirical aggregations from observed records.
              No causal claims or synthetic curves are created in the frontend.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default DelayPatternsPage;
