import { VideoIcon, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PROVIDER_LABELS = {
  runway:              'Runway Gen-3',
  kling:               'Kling 1.5',
  sora:                'Sora',
  pika:                'Pika 1.5',
  luma:                'Luma Dream Machine',
  grok_video:          'Grok Video',
  grok_imagine_video:  'Grok Imagine Video (Waiting API Access)',
  replicate:           'Replicate Video',
};

export default function VideoProviderBanner({ providerConfigured, activeProvider, planAccess, isAdmin, providerTests }) {
  if (providerConfigured && planAccess) return null;

  // Check if Grok is the active provider but unavailable
  const isGrokUnavailable = activeProvider === 'grok_imagine_video' && providerTests?.grok_imagine_video?.video === false;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <VideoIcon className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        {!providerConfigured && (
          <>
            <p className="text-sm font-semibold text-amber-300 mb-1">Video provider not configured yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Supported providers: Runway, Kling, Pika, Luma, Replicate (active). Grok Video on roadmap.
              {isAdmin && ' Configure a provider API key in Admin → Model Routing to enable rendering.'}
              {' '}Gems will not be deducted if provider is unavailable.
            </p>
            {isAdmin && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    Configure Provider
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
        {isGrokUnavailable && (
          <>
            <p className="text-sm font-semibold text-amber-300 mb-1">Grok Video Not Available</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Grok Video is not available for this API key yet. Current API key does not have video generation access.
              Please choose another provider (Replicate, Runway, Kling, Pika, Luma) or enable Grok later after API upgrade.
              Gems will not be deducted for unavailable providers.
            </p>
            {isAdmin && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    Manage Providers
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
        {providerConfigured && !planAccess && (
          <>
            <p className="text-sm font-semibold text-amber-300 mb-1">Video animation requires Creator Pro or higher</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upgrade your plan to unlock the animation pipeline and bring your storyboard to life.
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