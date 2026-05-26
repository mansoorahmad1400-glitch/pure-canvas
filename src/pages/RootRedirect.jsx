import Home from '@/pages/Home';

/**
 * Root `/` route renders the Home page directly for all users.
 * Logged-in users are NOT auto-redirected to /projects — they must click
 * Projects explicitly. This keeps the Home nav button predictable.
 */
export default function RootRedirect() {
  return <Home />;
}
