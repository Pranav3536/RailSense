import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Route, CheckCircle2, Server } from 'lucide-react';

/**
 * TrainExplorerPage — Tab 2 Placeholder (Phase 7)
 * Truthful placeholder explaining upcoming Phase 7 scope.
 * Contains ZERO fake numbers and ZERO mock charts.
 */
export function TrainExplorerPage() {
  const plannedEndpoints = [
    { method: 'GET', path: '/api/trains', desc: 'Search and filter canonical train list by number, name, category, or station' },
    { method: 'GET', path: '/api/trains/<train_number>', desc: 'Single train timetable, canonical stop sequence, distance, and historical performance' }
  ];

  const plannedFeatures = [
    'Train catalog search with instant typeahead filter by train number or train name',
    'Canonical stop sequence visualization showing journey progression and station codes',
    'Stop-level historical delay probabilities and median arrival delay profile',
    'Run performance timeline displaying recent runs in the observed dataset',
    'Interactive route selector with rapid deep-linking support'
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Single Train Deep Dive"
        subtitle="Individual train exploration, route timetables, and canonical stop-level delay probabilities."
        badge={<Badge variant="primary">Planned in Phase 7</Badge>}
      />

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <Route size={24} />
            </div>
            <div>
              <CardTitle>Phase 7 Milestone: Train Route & Timetable Explorer</CardTitle>
              <CardDescription>
                This tab will provide granular single-train diagnostics and canonical stop timetables upon execution of Phase 7.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3.5">
              Planned Analytical Features
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
              Backend API Endpoints (Preflight Audited)
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
              Real train schedules and stop metrics are stored in the verified backend serving store.
              No static mock trains are hardcoded in the frontend.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default TrainExplorerPage;
