import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X, TrainFront } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { RailwayWatermarks } from '../watermarks/RailwayWatermarks';
import { APP_CONFIG } from '../../config/app';

/**
 * AppShell Component
 * Primary application layout with desktop fixed sidebar, responsive mobile drawer,
 * skip links, and subtle railway watermark textures.
 */
export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative selection:bg-blue-100 selection:text-blue-900">
      {/* Skip to Main Content Link for Screen Readers & Keyboard Nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Decorative Railway Watermarks in Main Canvas */}
      <RailwayWatermarks />

      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile Top Header (Fixed Top on small viewports) */}
      <header className="lg:hidden sticky top-0 z-40 bg-navy-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <TrainFront size={18} aria-hidden="true" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight">{APP_CONFIG.name}</span>
            <span className="block text-[9px] text-blue-400 font-mono leading-none">
              {APP_CONFIG.versionPill}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Sidebar Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer Container */}
          <div className="fixed inset-y-0 left-0 w-64 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <main
          id="main-content"
          tabIndex="-1"
          className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto outline-none"
        >
          <Outlet />
        </main>

        {/* Global Footer Note */}
        <footer className="border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500 bg-white/60 backdrop-blur-sm">
          <p>
            {APP_CONFIG.name} • {APP_CONFIG.versionPill} • {APP_CONFIG.delayDefinition}
          </p>
        </footer>
      </div>
    </div>
  );
}
