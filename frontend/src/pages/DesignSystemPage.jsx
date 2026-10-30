import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { DefinitionNote } from '../components/ui/DefinitionNote';
import { ChartCard } from '../components/ui/ChartCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Activity, Clock, TrainFront, CheckCircle } from 'lucide-react';

/**
 * DesignSystemPage — Dev-only Living Style Guide
 * Verifies all UI components, tokens, accessibility attributes, and responsive layouts.
 */
export function DesignSystemPage() {
  const [demoLoading, setDemoLoading] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="RailSense Design System"
        subtitle="Living component showcase and theme token verification for Phase 6."
        badge={<Badge variant="navy">Dev Preview</Badge>}
        action={
          <button
            type="button"
            onClick={() => setDemoLoading((l) => !l)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            Toggle Loading State ({demoLoading ? 'ON' : 'OFF'})
          </button>
        }
      />

      {/* Palette Tokens */}
      <section className="space-y-3">
        <SectionHeader
          title="Color Palette Tokens"
          subtitle="Fixed design system theme tokens adhering to Phase 6 specifications."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-navy-900 text-white text-xs shadow-sm">
            <div className="font-bold">Sidebar Navy</div>
            <div className="text-[10px] text-slate-400 font-mono">#0B132B</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs shadow-sm">
            <div className="font-bold">Main Canvas</div>
            <div className="text-[10px] text-slate-500 font-mono">#F8FAFC</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-600 text-white text-xs shadow-sm">
            <div className="font-bold">Primary Blue</div>
            <div className="text-[10px] text-blue-200 font-mono">#2563EB</div>
          </div>
          <div className="p-3 rounded-xl bg-red-600 text-white text-xs shadow-sm">
            <div className="font-bold">Danger / Delayed</div>
            <div className="text-[10px] text-red-200 font-mono">#EF4444</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500 text-white text-xs shadow-sm">
            <div className="font-bold">Warning / Medium</div>
            <div className="text-[10px] text-amber-100 font-mono">#F59E0B</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs shadow-sm">
            <div className="font-bold">Success / On-Time</div>
            <div className="text-[10px] text-emerald-100 font-mono">#10B981</div>
          </div>
        </div>
      </section>

      {/* Badges & Inline Notes */}
      <section className="space-y-3">
        <SectionHeader
          title="Status Badges & Definitions"
          subtitle="Semantic categorization pills and interactive popover definitions."
        />
        <Card className="flex flex-wrap gap-3 items-center">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success" dot>Connected</Badge>
          <Badge variant="warning" dot pulse>Checking</Badge>
          <Badge variant="danger" dot>Unreachable</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="navy">v2.0.4 Community</Badge>
          <Badge variant="outline">Outline</Badge>
          <div className="inline-flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs text-slate-600">
            <span>Inline Metric Note:</span>
            <DefinitionNote title="Label Eligibility">
              Only stops with sequence &gt; 1 and arrival_reported = 1 are evaluated.
            </DefinitionNote>
          </div>
        </Card>
      </section>

      {/* Surface Cards & Loading Indicators */}
      <section className="space-y-3">
        <SectionHeader
          title="Surface Containers & Loading Indicators"
          subtitle="Modular Card compound structure, pulse Skeletons, and Spinners."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Compound Card Container</CardTitle>
              <CardDescription>Structured header, content, and footer layout.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 leading-relaxed">
                White surface with slate-200 border, rounded-xl geometry, and subtle drop shadow.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-[11px] text-slate-500 font-mono">Footer Metadata</span>
              <Badge variant="neutral">Active</Badge>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-700">Loading Primitives</span>
                <Spinner size={16} />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <Skeleton variant="pill" className="w-20 h-6" />
              <Skeleton variant="circular" className="w-6 h-6" />
            </div>
          </Card>
        </div>
      </section>

      {/* StatCards */}
      <section className="space-y-3">
        <SectionHeader
          title="StatCard Metrics"
          subtitle="Key performance indicators with definitions, units, and loading/error/empty fallbacks."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Sample Delay Rate"
            value="48.5%"
            unit="of stops"
            icon={Activity}
            loading={demoLoading}
            definition="Percentage of label-eligible stops (seq > 1, arrival_reported = 1) where arrival delay exceeded 15 minutes."
            delta={<span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Test metric</span>}
          />
          <StatCard
            label="Median Arrival Delay"
            value="14.0"
            unit="min"
            icon={Clock}
            loading={demoLoading}
            definition="50th percentile of arrival delay across all observed eligible stops. Early arrivals are retained as negative numbers."
          />
          <StatCard
            label="Missing Measurement"
            value={null}
            empty
            icon={TrainFront}
            loading={demoLoading}
            definition="Metric is missing or unmeasured for this selection."
          />
          <StatCard
            label="Failed Query Metric"
            error="Network Timeout (15s)"
            loading={demoLoading}
          />
        </div>
      </section>

      {/* ChartCard */}
      <section className="space-y-3">
        <SectionHeader
          title="ChartCard Visualization Wrapper"
          subtitle="Standard container for analytical charts with loading skeletons and accessibility fallbacks."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard
            title="Sample Visualization Container"
            subtitle="Demonstrating active state with inline content"
            loading={demoLoading}
            definition="Sample chart container definition for demonstration."
          >
            <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
              <TrainFront size={32} className="text-slate-400 mb-2" />
              <span>Chart Visual Canvas Area (Recharts mount target)</span>
            </div>
          </ChartCard>

          <ChartCard
            title="Empty Chart Fallback"
            subtitle="Demonstrating empty state handling"
            empty
            emptyMessage="No time-series observations exist for the specified date range."
            loading={demoLoading}
          />
        </div>
      </section>

      {/* Error & Empty States */}
      <section className="space-y-3">
        <SectionHeader
          title="State Containers"
          subtitle="Truthful, graceful handling of error and empty query conditions."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ErrorState
            code="503"
            requestId="req_ds_test_992"
            message="Database connection pool was temporarily unavailable. Check backend health."
            onRetry={() => alert('Retry triggered')}
          />
          <EmptyState
            title="No Matching Trains Found"
            description="No canonical train records matched your filter criteria in the observed dataset."
          />
        </div>
      </section>
    </div>
  );
}
export default DesignSystemPage;
