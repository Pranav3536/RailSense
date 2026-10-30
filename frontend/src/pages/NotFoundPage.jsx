import { Link } from 'react-router-dom';
import { TrainFront, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';

/**
 * NotFoundPage Component
 * Clean, branded 404 error page.
 */
export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <Card className="max-w-md w-full text-center py-10 px-6">
        <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-4">
          <TrainFront size={28} aria-hidden="true" />
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
          Error 404
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-1 mb-2">
          Page Not Found
        </h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          The requested station or view does not exist on this route. Please return to the overview dashboard.
        </p>
        <div>
          <Link
            to="/overview"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <ArrowLeft size={14} />
            Return to Overview
          </Link>
        </div>
      </Card>
    </div>
  );
}
export default NotFoundPage;
