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
 * Truthful Database & API Status Card
 * Evaluates live connectivity from /api/health/ready into 4 unambiguous states.
 */
function DatabaseStatusCard() {
  const { status, rawError, checkNow } = useReadiness();
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
    desc: 'Verifying backend & database...',
    color: 'text-slate-400',
    dotBg: 'bg-slate-400',
    icon: Loader2,
    badgeVariant: 'neutral'
  };

  if (status === READINESS_STATES.CONNECTED) {
    statusConfig = {
      title: 'Database connected',
      desc: 'TiDB Cloud online',
      color: 'text-emerald-400',
      dotBg: 'bg-emerald-400',
      icon: CheckCircle2,
      badgeVariant: 'success'
    };
  } else if (status === READINESS_STATES.DB_UNAVAILABLE) {
    statusConfig = {
      title: 'Database unavailable',
      desc: rawError?.details?.components?.tidb_cloud || 'Database offline',
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
      className="p-3 rounded-lg bg-navy-800/80 border border-slate-700/60 text-xs shadow-inner"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <StatusIcon size={13} className={statusConfig.color} aria-hidden="true" />
          <span className="font-semibold text-slate-200">
            {statusConfig.title}
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isChecking}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          aria-label="Refresh database status"
          title="Refresh connection status"
        >
          <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 truncate font-mono">
        {statusConfig.desc}
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
      className={`w-64 bg-navy-900 border-r border-slate-800 flex flex-col h-full text-slate-100 ${className}`}
      aria-label="Primary Navigation"
    >
      {/* Brand & Dataset Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <TrainFront size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              {APP_CONFIG.name}
            </h1>
            <span className="text-[10px] text-blue-400 font-mono tracking-tight inline-block mt-1">
              {APP_CONFIG.versionPill}
            </span>
          </div>
        </div>

        {/* Dataset Pill */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>{APP_CONFIG.datasetBadge}</span>
        </div>
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.iconName] || LayoutDashboard;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Truthful Status Card */}
      <div className="p-3 border-t border-slate-800">
        <DatabaseStatusCard />
      </div>

      {/* Creator & Maintainer Card */}
      <div className="p-4 border-t border-slate-800 bg-navy-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
              {CREATOR_CONFIG.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {CREATOR_CONFIG.initials}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {CREATOR_CONFIG.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={CREATOR_CONFIG.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label="GitHub Profile"
              title="GitHub Profile"
            >
              <Github size={14} />
            </a>
            <a
              href={CREATOR_CONFIG.tidbCloudUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              aria-label="TiDB Cloud"
              title="TiDB Cloud"
            >
              <Database size={14} />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
