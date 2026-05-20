import { ImageIcon, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function ImageProviderBanner({ providerConfigured, planAccess, isAdmin }) {
  if (providerConfigured && planAccess.canGenerate) return null;

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-5 flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
        <ImageIcon className="w-5 h-5 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        {!providerConfigured ? (
          <>
            <p className="text-sm font-semibold text-purple-300 mb-1">Image provider not connected yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add an image provider API key (OpenAI DALL·E, Flux, Midjourney, Ideogram, Leonardo, Recraft) to start generating cinematic storyboard images.
              {isAdmin && ' Configure in Admin → Model Routing.'}
              {' '}Gems are not deducted until a provider is active.
            </p>
            {isAdmin && (
              <div className="mt-3">
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10">
                    Configure Provider
                  </Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-purple-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Image generation requires a paid plan
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upgrade to Starter or higher to generate cinematic storyboard images.
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