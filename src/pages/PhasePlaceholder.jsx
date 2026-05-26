import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhaseWorkspace from '@/components/studio/PhaseWorkspace';
import { PHASES } from './ProjectDashboard';

export default function PhasePlaceholder() {
  const { id, phase: phaseId } = useParams();
  const navigate = useNavigate();

  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return <Navigate to={`/project/${id}`} replace />;

  const idx = PHASES.findIndex((p) => p.id === phaseId);
  const next = PHASES[idx + 1];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost" size="sm"
        onClick={() => navigate(`/project/${id}`)}
        className="gap-1.5 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Button>

      <PhaseWorkspace
        phase={phase}
        onBack={() => navigate(`/project/${id}`)}
        onNext={() => next ? navigate(`/project/${id}/${next.id}`) : navigate(`/project/${id}`)}
        onComplete={() => navigate(`/project/${id}`)}
        isCompleted={false}
        isLastPhase={!next}
        nextPhaseLabel={next ? `Next: ${next.label}` : null}
      >
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Construction className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">{phase.label} coming soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">{phase.description}</p>
          <p className="text-xs text-muted-foreground/60">
            This phase workspace will be built in the next step.
          </p>
        </div>
      </PhaseWorkspace>
    </div>
  );
}
