import { Mic, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AudioProviderBanner({ voiceConfigured, musicConfigured, planAccess, isAdmin }) {
  const anyConfigured = voiceConfigured || musicConfigured;
  if (anyConfigured && planAccess.canNarration) return null;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <Mic className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        {!anyConfigured ? (
          <>
            <p className="text-sm font-semibold text-amber-300 mb-1">Audio provider not connected yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Connect a voice provider (ElevenLabs, OpenAI TTS, Google TTS, PlayHT) or music provider (Suno, Udio) 
              to start generating narration, sound effects, and music for your scenes.
              {isAdmin && ' Configure in Admin → Model Routing.'}
              {' '}Gems are not deducted until a provider is active.
            </p>
            {isAdmin && (
              <div className="mt-3">
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    Configure Provider
                  </Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Audio generation requires a paid plan
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upgrade to Starter or higher to generate narration, sound effects, and music.
            </p>
            <div className="mt-3">
              <Link to="/upgrade">
                <Button size="sm" className="h-7 text-xs bg-primary hover:bg-primary/90">Upgrade Plan</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}