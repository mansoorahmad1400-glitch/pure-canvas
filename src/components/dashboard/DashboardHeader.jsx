import { Gem, Crown, Zap, LogOut, FolderOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function DashboardHeader() {
  const { user, isPremium, isAdmin, gems } = useCurrentUser();

  const roleLabel = isAdmin ? 'Admin' : isPremium ? 'Premium' : 'Free';
  const roleBg = isAdmin
    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    : isPremium
    ? 'bg-primary/15 text-primary border-primary/30'
    : 'bg-secondary text-muted-foreground border-border/50';

  return (
    <div className="sticky top-0 z-30 border-b border-border/50 bg-background/90 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-playfair text-base font-bold tracking-tight hidden sm:block">StudioOne AI</span>
        </Link>

        {/* Center: nav */}
        <nav className="flex items-center gap-1">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs h-8 text-foreground/80 hover:text-foreground">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Studio
            </Button>
          </Link>
          <Link to="/projects">
            <Button variant="ghost" size="sm" className="text-xs h-8 text-foreground/80 hover:text-foreground">
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" /> Projects
            </Button>
          </Link>
        </nav>

        {/* Right: user info */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Role badge */}
          <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${roleBg}`}>
            <Crown className="w-3 h-3" /> {roleLabel}
          </span>

          {/* Gems */}
          {!isPremium && (
            <Link to="/upgrade">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                <Gem className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">{gems}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">gems</span>
              </div>
            </Link>
          )}
          {isPremium && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-primary font-semibold hidden sm:block">Unlimited</span>
            </div>
          )}

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => base44.auth.logout()}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}