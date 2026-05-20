import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

export default function AlertsBanner({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/20 bg-green-500/5 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        No active alerts — all signals look healthy.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${
            a.level === 'error'
              ? 'border-red-500/25 bg-red-500/8 text-red-400'
              : 'border-amber-500/25 bg-amber-500/8 text-amber-400'
          }`}
        >
          {a.level === 'error'
            ? <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
          {a.msg}
        </div>
      ))}
    </div>
  );
}