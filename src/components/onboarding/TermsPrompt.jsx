import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'terms_accepted';

export default function TermsPrompt() {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      // Show after tutorial prompt delay (tutorial shows at 1800ms, so we wait a bit more)
      const t = setTimeout(() => setVisible(true), 3200);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleAccept = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const handleDecline = () => {
    base44.auth.logout();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-card border border-border/50 rounded-2xl p-7 shadow-2xl"
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
              <ScrollText className="w-7 h-7 text-primary" />
            </div>

            {/* Content */}
            <h2 className="font-playfair text-xl font-bold mb-2 text-foreground">
              Terms & Conditions
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Before you continue, please read and agree to our{' '}
              <Link to="/terms" onClick={handleAccept} className="text-primary underline underline-offset-2">
                Terms and Conditions
              </Link>.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed mb-6">
              By tapping "I Agree", you confirm that you have read, understood, and agree to be bound by our Terms and Conditions. If you do not agree, you will be signed out.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleAccept}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                I Agree
              </Button>
              <Button
                variant="ghost"
                onClick={handleDecline}
                className="w-full text-muted-foreground text-sm hover:text-destructive"
              >
                I Do Not Agree — Sign Out
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}