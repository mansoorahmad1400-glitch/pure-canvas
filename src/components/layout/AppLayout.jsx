import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Sparkles, Gem, Crown, LogOut, LogIn, ChevronDown, Settings, User, Shield, Sun, Moon, BookOpen, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useDarkMode } from '@/hooks/useDarkMode';
import OnboardingWalkthrough from '@/components/onboarding/OnboardingWalkthrough';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import TutorialPrompt from '@/components/onboarding/TutorialPrompt';
import TermsPrompt from '@/components/onboarding/TermsPrompt';


const navItems = [
  { path: '/', labelKey: 'nav.home', icon: Home },
  { path: '/studio', labelKey: 'nav.studio', icon: Sparkles, requireAuth: true },
  { path: '/projects', labelKey: 'nav.projects', icon: FolderOpen, requireAuth: true },
  { path: '/tutorial', labelKey: 'nav.tutorial', icon: BookOpen },
];

export default function AppLayout() {
  const location = useLocation();
  const { user, isLoading, isStarter, isPremium, isElite, isAdmin, gems, isLowGems } = useCurrentUser();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear();
    base44.auth.logout();
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  const bottomTabs = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/studio', label: 'Studio', icon: Sparkles, requireAuth: true },
    { path: '/projects', label: 'Projects', icon: FolderOpen, requireAuth: true },
    { path: '/account', label: 'Account', icon: User, requireAuth: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 select-none">
              <img
                src="https://media.base44.com/images/public/69beca883f9aef74a54f435d/dacd777bf_icons1.png"
                alt="StudioOne AI"
                className="w-9 h-9 rounded-lg object-cover"
              />
              <div className="hidden sm:block">
                <span className="font-playfair text-lg font-semibold text-foreground">StudioOne</span>
                <span className="text-primary ml-1.5 text-xs font-medium tracking-widest uppercase">AI</span>
              </div>
            </Link>

            {/* Nav Links + Auth */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                if (item.requireAuth && !user) return null;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`select-none relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t(item.labelKey)}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Gems badge (logged in users) */}
              {user && (
                <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium mx-1 ${
                  isAdmin
                    ? 'bg-secondary border-border/50 text-muted-foreground'
                    : isElite
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : isPremium
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : isStarter
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : isLowGems
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : gems === 0
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-secondary border-border/50 text-foreground'
                }`}>
                  {isAdmin ? (
                  <><Sparkles className="w-3.5 h-3.5" /> {t('nav.admin')}</>
                  ) : isElite ? (
                  <><Crown className="w-3.5 h-3.5" /> {gems}/1100 {t('nav.gems')}</>
                  ) : isPremium ? (
                  <><Crown className="w-3.5 h-3.5" /> {gems}/500 {t('nav.gems')}</>
                  ) : isStarter ? (
                  <><Crown className="w-3.5 h-3.5" /> {gems}/200 {t('nav.gems')}</>
                  ) : (
                  <><Gem className="w-3.5 h-3.5" /> {gems}/2 {t('nav.gems')}</>
                  )}
                </div>
              )}

              {/* Download Code — admin only */}
              {isAdmin && (
                <a
                  href="#"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const { base44: b44 } = await import('@/api/base44Client');
                      const res = await b44.functions.invoke('exportCode', { action: 'prepare_download' });
                      if (!res.data?.data) return;
                      const bytes = new Uint8Array([...atob(res.data.data)].map(c => c.charCodeAt(0)));
                      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
                      Object.assign(document.createElement('a'), { href: url, download: res.data.fileName }).click();
                      URL.revokeObjectURL(url);
                    } catch {}
                  }}
                  className="hidden sm:flex p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title="Download code structure (Admin)"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* User menu / Login */}
              {!isLoading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="select-none ml-1 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-card border-border/50">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate">{user.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-border/50" />
                      {!isStarter && !isPremium && !isElite && !isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/upgrade" className="flex items-center gap-2 text-primary cursor-pointer">
                            <Crown className="w-4 h-4" /> {t('nav.upgrade')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                          <Settings className="w-4 h-4" /> {t('nav.account')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/privacy" className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                          <Shield className="w-4 h-4" /> {t('nav.privacy')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem onClick={handleLogout} className="text-muted-foreground cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" /> {t('nav.signOut')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button onClick={handleLogin} variant="outline" size="sm" className="select-none ml-2 border-border/50 text-sm">
                    <LogIn className="w-4 h-4 mr-2" /> {t('nav.signIn')}
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content — extra bottom padding on mobile for bottom tab bar */}
      <main className="pt-16 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Onboarding walkthrough for new users */}
      <OnboardingWalkthrough />
      {/* Tutorial prompt after first login */}
      <TutorialPrompt />
      {/* Terms & Conditions acceptance prompt */}
      <TermsPrompt />

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-4 text-center">
        <p className="text-xs text-muted-foreground/50">
          © 2026 StudioOne AI ·{' '}
          <Link to="/privacy" className="hover:text-muted-foreground transition-colors underline underline-offset-2">
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/terms" className="hover:text-muted-foreground transition-colors underline underline-offset-2">
            Terms & Conditions
          </Link>
        </p>
      </footer>

      {/* Bottom Tab Bar — mobile only */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/50 bg-background/90 backdrop-blur-xl pb-safe">
          <div className="flex items-stretch">
            {bottomTabs.map((item) => {
            if (item.requireAuth && !user) return null;
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                replace={isActive}
                onClick={() => {
                  if (isActive) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    // Restore saved scroll position for this tab
                    const saved = sessionStorage.getItem(`scroll:${item.path}`);
                    if (saved) requestAnimationFrame(() => window.scrollTo({ top: Number(saved), behavior: 'instant' }));
                  }
                  // Save current scroll before leaving
                  sessionStorage.setItem(`scroll:${location.pathname}`, String(window.scrollY));
                }}
                className={`select-none flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors active:scale-95 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
            })}
            </div>
            </nav>
            )}
    </div>
  );
}