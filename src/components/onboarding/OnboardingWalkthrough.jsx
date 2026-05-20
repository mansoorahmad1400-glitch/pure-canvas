import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FolderOpen, Gem, Crown, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to StudioOne AI',
    desc: 'Turn any idea into a full cinematic production blueprint — scene scripts, visual prompts, music cues, and YouTube packaging, all in one generation.',
    color: 'text-primary',
    bg: 'bg-primary/15',
  },
  {
    icon: Gem,
    title: 'You Have 2 Free Gems',
    desc: 'Each generation uses 1 gem. You start with 2 free gems — enough to create 2 complete blueprints. Upgrade anytime for monthly gem allowances.',
    color: 'text-primary',
    bg: 'bg-primary/15',
  },
  {
    icon: Sparkles,
    title: 'Use the Studio',
    desc: 'Go to Studio, enter your idea, pick your story type, style, audience, and language — then hit Generate. Your full production blueprint is ready in seconds.',
    color: 'text-primary',
    bg: 'bg-primary/15',
  },
  {
    icon: FolderOpen,
    title: 'Save & Revisit Projects',
    desc: 'All your generated blueprints are saved in Projects. Copy, download, or revisit them anytime from any device.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
  {
    icon: Crown,
    title: 'Unlock More with Premium',
    desc: 'Creator Pro gives you 500 gems/month. Studio Elite gives you 1200 gems/month with priority generation and extended scenes. Upgrade when you\'re ready.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
  },
];

const STORAGE_KEY = 'onboarding_completed';

export default function OnboardingWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay to let app load first
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

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
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-sm bg-card border border-border/50 rounded-2xl p-7 shadow-2xl"
          >
            {/* Skip */}
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl ${current.bg} flex items-center justify-center mb-5`}>
              <Icon className={`w-7 h-7 ${current.color}`} />
            </div>

            {/* Content */}
            <h2 className="font-playfair text-xl font-bold mb-2 text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.desc}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>

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
                onClick={next}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
              >
                {isLast ? 'Get Started' : (
                  <span className="flex items-center gap-1.5">Next <ArrowRight className="w-3.5 h-3.5" /></span>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}