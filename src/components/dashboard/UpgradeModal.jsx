import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X, Check, Zap, Film, Wrench, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const HIGHLIGHTS = [
  { icon: Zap,    text: 'Unlimited generations' },
  { icon: Film,   text: 'Extended scene depth & longer stories' },
  { icon: Wrench, text: 'Advanced AI tool mapping & exports' },
  { icon: Globe,  text: 'Priority processing, multi-pack output' },
];

export default function UpgradeModal({ open, onClose, featureName }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-sm bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
              {/* Glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative p-6">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-primary" />
                </div>

                {/* Heading */}
                <h2 className="font-playfair text-xl font-bold mb-1">Premium Feature</h2>
                {featureName && (
                  <p className="text-sm text-primary font-medium mb-2">"{featureName}"</p>
                )}
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  Upgrade to Premium to unlock this feature and get unlimited access to everything StudioOne AI has to offer.
                </p>

                {/* Highlights */}
                <ul className="space-y-2 mb-6">
                  {HIGHLIGHTS.map(h => (
                    <li key={h.text} className="flex items-center gap-2.5 text-sm text-foreground/80">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {h.text}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/upgrade" onClick={onClose}>
                  <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm">
                    <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Premium — $9/mo
                  </Button>
                </Link>
                <button
                  onClick={onClose}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}