import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Card } from '../components/ui/Card';

/**
 * ErrorBoundary Component
 * Top-level application error boundary protecting against rendering crashes.
 * Displays a friendly recovery UI without exposing sensitive internal stack traces.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error internally for development diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.error('RailSense ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <Card className="max-w-md w-full text-center py-10 px-6 border-red-200">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={28} aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Application Error
            </h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              An unexpected interface error occurred. You can reload the page to restore normal operation.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <RotateCcw size={14} />
              Reload Application
            </button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
