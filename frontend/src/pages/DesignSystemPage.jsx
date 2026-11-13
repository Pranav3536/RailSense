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
import { CHART_THEME } from '../components/charts/chartTheme';

/**
 * DesignSystemPage — Dev-only Living Style Guide
 * Verifies all UI components, tokens, accessibility attributes, and responsive layouts at the Phase 6.1 scale.
 */
export function DesignSystemPage() {
  const [demoLoading, setDemoLoading] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="RailSense Design System"
        subtitle="Living component showcase, theme token verification, and typography scale for Phase 6.1."
        badge={<Badge variant="navy">Scale: 112.5% (18px Base)</Badge>}
        action={
          <button
            type="button"
            onClick={() => setDemoLoading((l) => !l)}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
          >
            Toggle Loading State ({demoLoading ? 'ON' : 'OFF'})
          </button>
        }
      />

      {/* Typography Scale Table */}
      <section className="space-y-3">
        <SectionHeader
          title="Typography Scale (112.5% / 18px Base)"
          subtitle="Proportional rem typography scale with minimum 15.75px body threshold."
        />
        <Card className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm font-semibold text-slate-700">
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4">Size (at 18px Base)</th>
                <th className="py-3 px-4">Role / Purpose</th>
                <th className="py-3 px-4">Sample Display</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-4xl</td>
                <td className="py-3 px-4 text-slate-600">2.25rem = 40.5px</td>
                <td className="py-3 px-4 text-slate-600">Primary StatCard Values</td>
                <td className="py-3 px-4 text-4xl font-bold text-slate-900 tabular-nums">48.5%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-3xl</td>
                <td className="py-3 px-4 text-slate-600">1.875rem = 33.75px</td>
                <td className="py-3 px-4 text-slate-600">Page View Headers</td>
                <td className="py-3 px-4 text-3xl font-bold text-slate-900 tracking-tight">Railway at a Glance</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-2xl</td>
                <td className="py-3 px-4 text-slate-600">1.5rem = 27.0px</td>
                <td className="py-3 px-4 text-slate-600">Sub-headers & Dialog Titles</td>
                <td className="py-3 px-4 text-2xl font-bold text-slate-900">Section Subtitle</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-xl</td>
                <td className="py-3 px-4 text-slate-600">1.25rem = 22.5px</td>
                <td className="py-3 px-4 text-slate-600">Section Headers</td>
                <td className="py-3 px-4 text-xl font-bold text-slate-900">Fleet Performance Metrics</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-lg</td>
                <td className="py-3 px-4 text-slate-600">1.125rem = 20.25px</td>
                <td className="py-3 px-4 text-slate-600">Card Titles</td>
                <td className="py-3 px-4 text-lg font-semibold text-slate-900">Single Train Diagnostics</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-base</td>
                <td className="py-3 px-4 text-slate-600">1.0rem = 18.0px</td>
                <td className="py-3 px-4 text-slate-600">Standard Body & Nav Items</td>
                <td className="py-3 px-4 text-base text-slate-700">Fleet-level operational delay intelligence and metrics.</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-blue-600 font-semibold">text-sm</td>
                <td className="py-3 px-4 text-slate-600">0.875rem = 15.75px</td>
                <td className="py-3 px-4 text-slate-600">Captions, Stat Labels, Badges (Min Threshold)</td>
                <td className="py-3 px-4 text-sm font-medium text-slate-600">Delayed = arrival delay &gt; 15 min</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-slate-400 font-semibold">text-xs</td>
                <td className="py-3 px-4 text-slate-500">0.75rem = 13.5px</td>
                <td className="py-3 px-4 text-slate-500">Decorative Micro-Labels & Mono Badges</td>
                <td className="py-3 px-4 text-xs font-mono text-slate-500">GET /api/overview</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </section>

      {/* Palette Tokens */}
      <section className="space-y-3">
        <SectionHeader
          title="Color Palette Tokens"
          subtitle="Fixed design system theme tokens adhering to Phase 6 specifications."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-navy-900 text-white text-sm shadow-sm">
            <div className="font-bold">Sidebar Navy</div>
            <div className="text-xs text-slate-400 font-mono mt-1">#0B132B</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm shadow-sm">
            <div className="font-bold">Main Canvas</div>
            <div className="text-xs text-slate-500 font-mono mt-1">#F8FAFC</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-600 text-white text-sm shadow-sm">
            <div className="font-bold">Primary Blue</div>
            <div className="text-xs text-blue-200 font-mono mt-1">#2563EB</div>
          </div>
          <div className="p-4 rounded-xl bg-red-600 text-white text-sm shadow-sm">
            <div className="font-bold">Danger / Delayed</div>
            <div className="text-xs text-red-200 font-mono mt-1">#EF4444</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500 text-white text-sm shadow-sm">
            <div className="font-bold">Warning / Medium</div>
            <div className="text-xs text-amber-100 font-mono mt-1">#F59E0B</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-600 text-white text-sm shadow-sm">
            <div className="font-bold">Success / On-Time</div>
            <div className="text-xs text-emerald-100 font-mono mt-1">#10B981</div>
          </div>
        </div>
      </section>

      {/* Badges & Inline Notes */}
      <section className="space-y-3">
        <SectionHeader
          title="Status Badges & Definitions"
          subtitle="Semantic categorization pills and interactive popover definitions."
        />
        <Card className="flex flex-wrap gap-4 items-center p-6">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success" dot>Connected</Badge>
          <Badge variant="warning" dot pulse>Checking</Badge>
          <Badge variant="danger" dot>Unreachable</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="navy">v2.0.4 Community</Badge>
          <Badge variant="outline">Outline</Badge>
          <div className="inline-flex items-center gap-2 pl-4 border-l border-slate-200 text-sm text-slate-600">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Compound Card Container</CardTitle>
              <CardDescription>Structured header, content, and footer layout.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed">
                White surface with slate-200 border, rounded-xl geometry, and subtle drop shadow.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-xs text-slate-500 font-mono">Footer Metadata</span>
              <Badge variant="neutral" size="sm">Active</Badge>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-slate-700">Loading Primitives</span>
                <Spinner size={20} />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            </div>
            <div className="pt-5 border-t border-slate-100 flex items-center gap-3">
              <Skeleton variant="pill" className="w-24 h-7" />
              <Skeleton variant="circular" className="w-7 h-7" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Sample Delay Rate"
            value="48.5%"
            unit="of stops"
            icon={Activity}
            loading={demoLoading}
            definition="Percentage of label-eligible stops (seq > 1, arrival_reported = 1) where arrival delay exceeded 15 minutes."
            delta={<span className="text-emerald-600 font-medium flex items-center gap-1.5"><CheckCircle size={15} /> Test metric</span>}
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

      {/* ChartCard & Chart Theme */}
      <section className="space-y-3">
        <SectionHeader
          title="ChartCard Visualization Wrapper"
          subtitle="Standard container for analytical charts with loading skeletons and accessibility fallbacks."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Sample Visualization Container"
            subtitle="Demonstrating active state with inline content and standard 360px height"
            loading={demoLoading}
            definition="Sample chart container definition for demonstration."
          >
            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
              <TrainFront size={40} className="text-slate-400 mb-3" />
              <span className="font-medium text-slate-700">Recharts Canvas Target</span>
              <span className="text-xs text-slate-500 mt-1">Theme tick font size: {CHART_THEME.fontSize.tick}px • Tooltip font size: {CHART_THEME.fontSize.tooltip}px</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
