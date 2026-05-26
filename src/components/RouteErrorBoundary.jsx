import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, FolderOpen, Home } from 'lucide-react';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[RouteErrorBoundary]', error, info);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Something went wrong loading StudioOne AI.</h1>
            <p className="text-sm text-muted-foreground mt-2 break-words">
              {String(this.state.error?.message || this.state.error || 'Unexpected error')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => { this.setState({ hasError: false, error: null }); }} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/projects"><FolderOpen className="w-4 h-4" /> Go to Projects</Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/"><Home className="w-4 h-4" /> Go Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
