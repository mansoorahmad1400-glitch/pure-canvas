import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Wraps a phase's content with a consistent header, navigation buttons,
 * and a "Mark Complete" CTA.
 */
export default function PhaseWorkspace({
  phase,
  children,
  onBack,
  onNext,
  onComplete,
  isCompleted,
  isLastPhase,
  nextPhaseLabel,
  hideFooterActions = false,
}) {
  const Icon = phase.icon;

  return (
    <motion.div
      key={phase.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="space-y-5"
    >
      {/* Phase header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/30">
        <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Phase {phase.number}</p>
          <h2 className="text-base font-semibold text-foreground leading-tight">{phase.label}</h2>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1 shrink-0">
            <Check className="w-3 h-3" /> Completed
          </div>
        )}
      </div>

      {/* Content */}
      <div>{children}</div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/30">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-1.5 border-border/40 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>

        {!hideFooterActions && (
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <Button
                size="sm"
                variant="outline"
                onClick={onComplete}
                className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50"
              >
                <Check className="w-3.5 h-3.5" />
                Mark Complete
              </Button>
            )}
            {!isLastPhase && (
              <Button
                size="sm"
                onClick={onNext}
                className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {nextPhaseLabel || 'Next Phase'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
            {isLastPhase && (
              <Button
                size="sm"
                onClick={onComplete}
                className="gap-1.5 bg-green-600 hover:bg-green-500 text-white"
              >
                <Check className="w-3.5 h-3.5" /> Finish Production
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}