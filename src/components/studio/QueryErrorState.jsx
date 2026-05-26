import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QueryErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  className = '',
}) {
  const message =
    (error && (error.message || error.error_description)) ||
    'We could not load this content. Please try again.';
  return (
    <div
      className={`rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center text-center gap-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-destructive" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md break-words">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}
