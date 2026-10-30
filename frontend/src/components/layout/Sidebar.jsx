import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrainFront,
  LayoutDashboard,
  Route,
  Clock,
  FlaskConical,
  BarChart3,
  MessageSquareText,
  RefreshCw,
  Github,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import { APP_CONFIG, NAV_ITEMS } from '../../config/app';
import { CREATOR_CONFIG } from '../../config/creator';
import { useReadiness, READINESS_STATES } from '../../hooks/useReadiness';

const ICON_MAP = {
  LayoutDashboard,
  Route,
  Clock,
  FlaskConical,
  BarChart3,
  MessageSquareText
};

/**
 * Truthful Local API & Artifact Status Card
 * Evaluates live health from /api/health/ready into 4 unambiguous states.
 */
function ApiStatusCard() {
  const { status, modelVersion, dataAsOf, degradedReason, rawError, checkNow } = useReadiness();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkNow();
    } finally {
      setIsRefreshing(false);
    }
  };

  let statusConfig = {
    title: 'Checking...',
    desc: 'Verifying local artifacts...',
    color: 'text-slate-400',
    dotBg: 'bg-slate-400',
    icon: Loader2,
    badgeVariant: 'neutral'
  };

  if (status === READINESS_STATES.READY) {
    statusConfig = {
      title: 'API ready',
      desc: 'Data: precomputed local snapshot',
      color: 'text-emerald-400',
      dotBg: 'bg-emerald-400',
      icon: CheckCircle2,
      badgeVariant: 'success'
    };
  } else if (status === READINESS_STATES.DEGRADED) {
    statusConfig = {
      title: 'API degraded',
      desc: degradedReason || 'Component degraded',
      color: 'text-amber-400',
      dotBg: 'bg-amber-400',
      icon: AlertTriangle,
      badgeVariant: 'warning'
    };
  } else if (status === READINESS_STATES.UNREACHABLE) {
    statusConfig = {
      title: 'API unreachable',
      desc: rawError?.message || 'Backend server offline',
      color: 'text-red-400',
      dotBg: 'bg-red-400',
      icon: XCircle,
      badgeVariant: 'danger'
    };
  }

  const StatusIcon = statusConfig.icon;
  const isChecking = status === READINESS_STATES.CHECKING || isRefreshing;

  return (
    <div
      className="p-3.5 rounded-xl bg-navy-800/90 border border-slate-700/80 shadow-inner"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon size={16} className={`${statusConfig.color} flex-shrink-0`} aria-hidden="true" />
          <span className="font-semibold text-slate-200 text-sm truncate">
            {statusConfig.title}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isChecking}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/60 transition-colors disabled:opacity-50 flex-shrink-0"
          aria-label="Refresh API readiness status"
          title="Refresh readiness status"
        >
          <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
        </button>
      </div>

      <p className="text-xs text-slate-400 truncate font-mono">
        {statusConfig.desc}
      </p>
      {status === READINESS_STATES.READY && (
        <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
          v{modelVersion || '1.0.0'} • As of {dataAsOf || '2026-10-25'}
        </p>
      )}
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
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-white leading-none truncate">
              {APP_CONFIG.name}
            </h1>
            <span className="text-xs text-blue-300 font-mono tracking-tight inline-block mt-1.5 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/60">
              {APP_CONFIG.versionPill}
            </span>
          </div>
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
        {/* Truthful Status Card */}
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
