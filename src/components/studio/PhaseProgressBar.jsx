import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

export default function PhaseProgressBar({ phases, currentPhase, completedPhases, onPhaseClick }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-none">
      <div className="flex items-center min-w-max px-1 py-2 gap-0">
        {phases.map((phase, idx) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === phase.id;
          const isLocked = !isCompleted && !isCurrent && idx > 0 && !completedPhases.includes(phases[idx - 1]?.id) && phases[idx - 1]?.id !== currentPhase;
          const isClickable = isCompleted || isCurrent || (idx > 0 && (completedPhases.includes(phases[idx - 1]?.id) || phases[idx - 1]?.id === currentPhase));

          return (
            <div key={phase.id} className="flex items-center">
              {/* Connector line */}
              {idx > 0 && (
                <div className={`w-6 sm:w-10 h-px transition-colors duration-500 ${
                  completedPhases.includes(phases[idx - 1]?.id) ? 'bg-primary/60' : 'bg-border/40'
                }`} />
              )}

              <button
                onClick={() => isClickable && onPhaseClick(phase.id)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center gap-1 group transition-all duration-200 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                {/* Circle */}
                <div className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isCurrent
                    ? 'border-primary bg-primary/20 shadow-[0_0_14px_rgba(250,176,5,0.35)]'
                    : isCompleted
                    ? 'border-green-500/70 bg-green-500/15'
                    : 'border-border/40 bg-card/40 opacity-50'
                }`}>
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : isLocked ? (
                    <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
                  ) : (
                    <span className={`text-[9px] font-bold ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {phase.number}
                    </span>
                  )}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/40"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[9px] font-medium whitespace-nowrap max-w-[52px] text-center leading-tight transition-colors ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-green-400/80' : 'text-muted-foreground/40'
                }`}>
                  {phase.shortLabel}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}