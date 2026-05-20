import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PhaseCard({ phase, isCompleted, isCurrent, isUnlocked, onClick, index }) {
  const Icon = phase.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
      onClick={() => isUnlocked && onClick(phase.id)}
      className={`relative group rounded-2xl border overflow-hidden transition-all duration-300 ${
        isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'
      } ${
        isCurrent
          ? 'border-primary/40 bg-primary/5 shadow-[0_0_24px_rgba(250,176,5,0.08)]'
          : isCompleted
          ? 'border-green-500/20 bg-green-500/3'
          : isUnlocked
          ? 'border-border/40 bg-card/40 hover:border-border/70 hover:bg-card/60'
          : 'border-border/20 bg-card/20 opacity-50'
      }`}
    >
      {/* Completed glow line */}
      {isCompleted && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
      )}
      {isCurrent && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      )}

      <div className="p-5 flex items-start gap-4">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
          isCurrent
            ? 'bg-primary/15 shadow-[0_0_16px_rgba(250,176,5,0.2)]'
            : isCompleted
            ? 'bg-green-500/12'
            : 'bg-secondary/60 group-hover:bg-secondary/80'
        }`}>
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : !isUnlocked ? (
            <Lock className="w-5 h-5 text-muted-foreground/30" />
          ) : (
            <Icon className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              isCurrent ? 'text-primary/70' : 'text-muted-foreground/40'
            }`}>Phase {phase.number}</span>
            {isCompleted && (
              <span className="text-[9px] bg-green-500/15 text-green-400 border border-green-500/20 rounded-full px-2 py-0 font-semibold">Done</span>
            )}
            {isCurrent && (
              <span className="text-[9px] bg-primary/15 text-primary border border-primary/25 rounded-full px-2 py-0 font-semibold flex items-center gap-1">
                <Sparkles className="w-2 h-2" /> Active
              </span>
            )}
          </div>
          <h3 className={`font-semibold text-sm leading-snug ${
            isCurrent ? 'text-foreground' : isCompleted ? 'text-foreground/70' : isUnlocked ? 'text-foreground/80' : 'text-muted-foreground/40'
          }`}>{phase.label}</h3>
          <p className={`text-xs mt-0.5 leading-relaxed ${
            isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/30'
          }`}>{phase.description}</p>
        </div>

        {/* Arrow */}
        {isUnlocked && (
          <ChevronRight className={`w-4 h-4 shrink-0 mt-2 transition-all duration-200 ${
            isCurrent ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5'
          }`} />
        )}
      </div>
    </motion.div>
  );
}