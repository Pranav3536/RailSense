import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FlaskConical, CheckCircle2, Server } from 'lucide-react';

/**
 * ModelLabPage — Tab 4 Placeholder (Phase 8)
 * Truthful placeholder explaining upcoming Phase 8 Model Transparency & Evaluation Lab.
 * Contains ZERO fake numbers and ZERO mock metrics.
 */
export function ModelLabPage() {
  const plannedEndpoints = [
    { method: 'GET', path: '/api/model/info', desc: 'Active model architecture, training configuration, hyperparameters, and feature list' },
    { method: 'GET', path: '/api/model/metrics', desc: 'Precomputed multi-model benchmark evaluation table and calibration curves' }
  ];

  const plannedFeatures = [
    'Benchmark comparison across all 8 evaluated models and operational baselines',
    'Comprehensive discrimination metrics: PR-AUC, Average Precision, ROC-AUC',
    'Calibration rigor metrics: Brier score, Expected Calibration Error (ECE), and calibration plots',
    'Global feature importance rankings extracted from the trained LightGBM model',
    'Interactive threshold slider demonstrating precision-recall trade-offs'
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Evaluation & Transparency"
        subtitle="Full benchmark comparison, calibration curves, and feature importance rankings."
        badge={<Badge variant="primary">Planned in Phase 8</Badge>}
      />

      <Card className="border-blue-100 bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 flex-shrink-0">
              <FlaskConical size={24} />
            </div>
            <div>
              <CardTitle>Phase 8 Milestone: Model Evaluation Lab</CardTitle>
              <CardDescription>
                This tab will present complete transparency into the ML experimentation and validation results upon execution of Phase 8.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3.5">
              Planned Evaluation Tools
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
              Backend Benchmark Endpoints (Measured in Phase 4)
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
              All evaluation metrics will load directly from the measured test-set results JSON generated during Phase 4.
              No static claims or fabricated benchmark rows exist in the client.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default ModelLabPage;
