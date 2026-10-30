import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LayoutDashboard, CheckCircle2, Server } from 'lucide-react';

/**
 * OverviewPage — Tab 1 Placeholder (Phase 7)
 * Truthful placeholder explaining upcoming Phase 7 scope.
 * Contains ZERO fake numbers and ZERO mock charts.
 */
export function OverviewPage() {
  const plannedEndpoints = [
    { method: 'GET', path: '/api/overview', desc: 'Precomputed fleet-level macro KPIs, delay distributions, category breakdown, and daily rates' },
    { method: 'GET', path: '/api/health/ready', desc: 'Live TiDB database readiness ping and connection health' }
  ];

  const plannedFeatures = [
    'Fleet-level key performance indicators: overall delayed stop rate, median delay, and total observed runs',
    'Macro arrival delay distribution with empirical percentiles across all operational records',
    'Category-level delay breakdown comparing train service classifications',
    'Daily delay rate trendline over the entire observed multi-week observation window',
    'Active data refresh controls with graceful error and loading states'
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Railway at a Glance"
        subtitle="Fleet-level operational delay intelligence and high-level performance metrics."
        badge={<Badge variant="primary">Planned in Phase 7</Badge>}
      />

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <CardTitle>Phase 7 Milestone: Overview Dashboard</CardTitle>
              <CardDescription>
                This tab will display live aggregated metrics from the RailSense backend API upon execution of Phase 7.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Planned Analytical Features
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
              Backend API Endpoints (Preflight Audited)
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
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
              In accordance with project principles, no fake numbers or synthetic placeholder charts are displayed.
              All statistics will be dynamically rendered directly from verified backend endpoints during Phase 7.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default OverviewPage;
