import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import RequireAuth from '@/components/auth/RequireAuth';
import InitUserGems from '@/components/auth/InitUserGems';
// REQUIRED platform imports — do NOT remove or rename
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const Home          = lazy(() => import('@/pages/Home'));
const Projects      = lazy(() => import('@/pages/Projects'));
const ViewBlueprint = lazy(() => import('@/pages/ViewBlueprint'));
const Upgrade       = lazy(() => import('@/pages/Upgrade'));
const Dashboard     = lazy(() => import('@/pages/Dashboard'));
const Account       = lazy(() => import('@/pages/Account'));
const Admin         = lazy(() => import('@/pages/Admin'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('@/pages/TermsAndConditions'));
const Tutorial     = lazy(() => import('@/pages/Tutorial'));
const Roadmap      = lazy(() => import('@/pages/Roadmap'));
const GemHistory   = lazy(() => import('@/pages/GemHistory'));
const Storyboard        = lazy(() => import('@/pages/Storyboard'));
const ProductionStudio  = lazy(() => import('@/pages/ProductionStudio'));
const Login             = lazy(() => import('@/pages/Login'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}

// Slide-in transition wrapper for each page
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
          <p className="text-muted-foreground">Something went wrong. Please try again.</p>
          <button
            className="select-none px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}
          >
            Return Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// AnimatePresence needs to be inside Router to access location
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/upgrade" element={<PageTransition><Upgrade /></PageTransition>} />
          <Route path="/studio" element={<PageTransition><RequireAuth><Dashboard /></RequireAuth></PageTransition>} />
          <Route path="/projects" element={<PageTransition><RequireAuth><Projects /></RequireAuth></PageTransition>} />
          <Route path="/project/:id" element={<PageTransition><RequireAuth><ProductionStudio /></RequireAuth></PageTransition>} />
          <Route path="/project/:id/advanced" element={<PageTransition><RequireAuth><ViewBlueprint /></RequireAuth></PageTransition>} />
          <Route path="/account" element={<PageTransition><RequireAuth><Account /></RequireAuth></PageTransition>} />
          <Route path="/admin" element={<PageTransition><RequireAuth><Admin /></RequireAuth></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><TermsAndConditions /></PageTransition>} />
          <Route path="/tutorial" element={<PageTransition><Tutorial /></PageTransition>} />
          <Route path="/roadmap" element={<PageTransition><RequireAuth><Roadmap /></RequireAuth></PageTransition>} />
          <Route path="/gem-history" element={<PageTransition><RequireAuth><GemHistory /></RequireAuth></PageTransition>} />
          <Route path="/storyboard" element={<PageTransition><RequireAuth><Storyboard /></RequireAuth></PageTransition>} />
          <Route path="/dashboard" element={<Navigate to="/studio" replace />} />
          <Route path="/new" element={<Navigate to="/studio" replace />} />
          <Route path="/project/:id/generate" element={<Navigate to="/projects" replace />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <PageLoader />;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatedRoutes />
    </Suspense>
  );
};

function App() {
  return (
    <AuthErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
            <InitUserGems />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </AuthErrorBoundary>
  );
}

export default App;