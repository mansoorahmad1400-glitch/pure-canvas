import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'tutorial_prompt_seen';

export default function TutorialPrompt() {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(t);
    }
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const openTutorial = () => {
    dismiss();
    navigate('/tutorial');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-6 sm:pb-0"
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-card border border-border/50 rounded-2xl p-7 shadow-2xl"
          >
            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>

            {/* Content */}
            <h2 className="font-playfair text-xl font-bold mb-2 text-foreground">
              New? Start with the Tutorial
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Learn how to turn your blueprint into a full video using Grok Aurora, Suno AI, and ElevenLabs — step by step.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={dismiss}
                className="border-border/50 text-muted-foreground text-xs"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={openTutorial}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
              >
                <span className="flex items-center gap-1.5">
                  View Tutorial <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}