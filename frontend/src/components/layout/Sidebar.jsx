import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrainFront,
  Home,
  LayoutDashboard,
  Route,
  Clock,
  FlaskConical,
  BarChart3,
  MessageSquareText,
  RefreshCw,
  Github,
  Database,
} from 'lucide-react';
import { APP_CONFIG, NAV_ITEMS } from '../../config/app';
import { CREATOR_CONFIG } from '../../config/creator';
import { useReadiness, READINESS_STATES } from '../../hooks/useReadiness';
import { formatDate } from '../../utils/format';

const ICON_MAP = {
  Home,
  LayoutDashboard,
  Route,
  Clock,
  FlaskConical,
  BarChart3,
  MessageSquareText
};

/**
 * Truthful Service Status Card
 * Evaluates live health from /api/health/ready into unambiguous operational states.
 */
function ApiStatusCard() {
  const { status, degradedReason, rawError, checkNow, latencyMs, dataAsOf } = useReadiness();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkNow();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isChecking = status === READINESS_STATES.CHECKING || isRefreshing;
  const formattedDate = dataAsOf ? formatDate(dataAsOf) : '25 Oct 2026';

  let statusConfig = {
    title: 'Checking...',
    line1: 'Connecting to server...',
    dot: (
      <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
      </span>
    ),
    tooltip: 'Checking server status...',
    textColor: 'text-slate-300',
  };

  if (status === READINESS_STATES.READY) {
    statusConfig = {
      title: 'System online',
      line1: `Data as of ${formattedDate}`,
      dot: (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
      ),
      tooltip: latencyMs !== null && latencyMs !== undefined ? `Server response: ${latencyMs} ms` : 'System online',
      textColor: 'text-emerald-400',
    };
  } else if (status === READINESS_STATES.DEGRADED) {
    statusConfig = {
      title: 'Partly available',
      line1: degradedReason || 'Some components unready',
      dot: (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
      ),
      tooltip: degradedReason || 'Partly available',
      textColor: 'text-amber-400',
    };
  } else if (status === READINESS_STATES.UNREACHABLE) {
    statusConfig = {
      title: 'Server unreachable',
      line1: rawError?.message || 'Server unreachable',
      dot: (
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden="true">
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      ),
      tooltip: 'Server unreachable',
      textColor: 'text-red-400',
    };
  }

  return (
    <div
      className="p-3.5 rounded-xl bg-navy-800/90 border border-slate-700/80 shadow-inner"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div
          className="flex items-center gap-2 min-w-0"
          title={statusConfig.tooltip}
        >
          {statusConfig.dot}
          <span className={`font-semibold text-sm truncate ${status === READINESS_STATES.READY ? 'text-slate-100' : statusConfig.textColor}`}>
            {statusConfig.title}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isChecking}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/60 transition-colors disabled:opacity-50 flex-shrink-0"
          aria-label="Refresh status"
          title={statusConfig.tooltip ? `${statusConfig.tooltip} (click to refresh)` : 'Refresh status'}
        >
          <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
        </button>
      </div>

      <p className="text-xs text-slate-300 font-medium truncate">
        {statusConfig.line1}
      </p>
    </div>
  );
}

/**
 * Sidebar Navigation Component
 * Single unified navigation drawer matching the fixed Navy #0B132B theme.
 */
export function Sidebar({ onNavigate, className = '' }) {
  return (
    <aside
      className={`w-72 xl:w-80 bg-navy-900 border-r border-slate-800 flex flex-col h-full text-slate-100 ${className}`}
      aria-label="Primary Navigation"
    >
      {/* Brand & Dataset Header (Fixed Top) */}
      <div className="p-5 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
            <TrainFront size={24} aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white leading-none truncate">
            {APP_CONFIG.name}
          </span>
        </div>

        {/* Dataset Pill */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-300 border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="truncate">{APP_CONFIG.datasetBadge}</span>
        </div>
      </div>

      {/* Nav Items List (Middle Scrollable) */}
      <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.iconName] || LayoutDashboard;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `min-h-[48px] flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon size={22} aria-hidden="true" className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Pinned Footer (API Readiness + Creator Cards) */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-navy-950/40">
        {/* Truthful Telemetry Status Card */}
        <div className="p-3.5">
          <ApiStatusCard />
        </div>

        {/* Creator & Maintainer Card */}
        <div className="p-4 border-t border-slate-800/80 bg-navy-950/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
                {CREATOR_CONFIG.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {CREATOR_CONFIG.initials}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {CREATOR_CONFIG.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={CREATOR_CONFIG.githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800/90 rounded-xl transition-colors"
                aria-label="GitHub Profile"
                title="GitHub Profile"
              >
                <Github size={18} />
              </a>
              <a
                href={CREATOR_CONFIG.tidbCloudUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800/90 rounded-xl transition-colors"
                aria-label="TiDB Cloud"
                title="TiDB Cloud"
              >
                <Database size={18} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
