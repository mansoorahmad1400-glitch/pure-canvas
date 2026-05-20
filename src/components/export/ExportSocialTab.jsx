import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Check, RefreshCw, Share2, Sparkles } from 'lucide-react';

const PLATFORMS = [
  { key: 'tiktok',         label: 'TikTok',           icon: '🎵', color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20' },
  { key: 'instagram_reels',label: 'Instagram Reels',  icon: '📸', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { key: 'youtube_shorts', label: 'YouTube Shorts',   icon: '▶️',  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  { key: 'facebook',       label: 'Facebook',         icon: '👥', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  { key: 'twitter_x',      label: 'X / Twitter',      icon: '𝕏',  color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/20' },
];

function CopyText({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button onClick={handle} className="text-muted-foreground hover:text-foreground p-0.5 transition-colors shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PlatformCard({ platform, data }) {
  if (!data) return null;
  return (
    <div className={`rounded-xl border ${platform.border} bg-card/30 overflow-hidden`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${platform.bg} border-b ${platform.border}`}>
        <span className="text-base">{platform.icon}</span>
        <span className={`text-sm font-bold ${platform.color}`}>{platform.label}</span>
      </div>
      <div className="p-4 space-y-3">
        {data.hook && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hook</span>
              <CopyText text={data.hook} />
            </div>
            <p className="text-sm font-semibold text-foreground">"{data.hook}"</p>
          </div>
        )}
        {data.caption && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Caption</span>
              <CopyText text={data.caption} />
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{data.caption}</p>
          </div>
        )}
        {data.hashtags && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hashtags</span>
              <CopyText text={data.hashtags} />
            </div>
            <div className="flex flex-wrap gap-1">
              {data.hashtags.split(/\s+/).filter(t => t.startsWith('#')).map(tag => (
                <Badge key={tag} variant="outline" className={`text-[9px] ${platform.color} ${platform.border} ${platform.bg}`}>{tag}</Badge>
              ))}
              {!data.hashtags.includes('#') && (
                <p className="text-xs text-muted-foreground">{data.hashtags}</p>
              )}
            </div>
          </div>
        )}
        {data.cta && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Call to Action</span>
              <CopyText text={data.cta} />
            </div>
            <p className="text-xs text-foreground/80">{data.cta}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExportSocialTab({ project }) {
  const [generating, setGenerating] = useState(false);
  const [socialData, setSocialData] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('exportPipeline', {
        action: 'generate_social',
        project_id: project.id,
      });
      if (res.data?.social) {
        setSocialData(res.data.social);
        toast.success('Social media package generated!');
      }
    } catch (e) {
      toast.error(e.message || 'Generation failed');
    }
    setGenerating(false);
  };

  const copyAll = () => {
    if (!socialData) return;
    let text = '';
    for (const p of PLATFORMS) {
      const d = socialData[p.key];
      if (!d) continue;
      text += `\n=== ${p.label} ===\n`;
      if (d.hook) text += `Hook: ${d.hook}\n`;
      if (d.caption) text += `Caption: ${d.caption}\n`;
      if (d.hashtags) text += `Hashtags: ${d.hashtags}\n`;
      if (d.cta) text += `CTA: ${d.cta}\n`;
    }
    navigator.clipboard.writeText(text.trim());
    toast.success('All social content copied!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Social Media Package</h3>
        </div>
        <div className="flex gap-2">
          {socialData && (
            <Button size="sm" variant="outline" onClick={copyAll} className="h-7 text-xs gap-1.5 border-border/40">
              <Copy className="w-3.5 h-3.5" /> Copy All
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90"
          >
            {generating
              ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              : <Sparkles className="w-3.5 h-3.5" />}
            {socialData ? 'Regenerate' : 'Generate Social Package'}
          </Button>
        </div>
      </div>

      {!socialData && !generating && (
        <div className="py-12 text-center space-y-3">
          <div className="flex justify-center gap-3 text-3xl">🎵 📸 ▶️ 👥</div>
          <p className="text-sm text-muted-foreground">Generate platform-optimized social media content for your project.</p>
          <p className="text-xs text-muted-foreground/60">Includes hooks, captions, hashtags, and CTAs for 5 platforms.</p>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          <span className="text-sm">Generating social media package...</span>
        </div>
      )}

      {socialData && (
        <div className="grid sm:grid-cols-2 gap-4">
          {PLATFORMS.map(p => (
            <PlatformCard key={p.key} platform={p} data={socialData[p.key]} />
          ))}
        </div>
      )}
    </div>
  );
}