import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useAuthReady from '@/hooks/useAuthReady';
import Home from '@/pages/Home';

/**
 * Root `/` route. While auth hydrates, show a loading state. When ready,
 * redirect signed-in users to /projects and render the public landing for
 * everyone else. Never leaves `/` blank.
 */
export default function RootRedirect() {
  const { user, isReady } = useAuthReady();

  if (!isReady) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">Loading StudioOne AI…</p>
      </div>
    );
  }

  if (user) return <Navigate to="/projects" replace />;
  return <Home />;
}
