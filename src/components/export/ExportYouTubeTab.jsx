import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Check, RefreshCw, Youtube, Tag, FileText, Sparkles } from 'lucide-react';

function CopyField({ label, content, multiline }) {
  const [copied, setCopied] = useState(false);
  if (!content) return null;

  const handle = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <button onClick={handle} className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {multiline ? (
        <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed px-3 py-2.5 max-h-48 overflow-y-auto">{content}</pre>
      ) : (
        <p className="text-sm text-foreground px-3 py-2.5 font-medium">{content}</p>
      )}
    </div>
  );
}

export default function ExportYouTubeTab({ project }) {
  const [regenerating, setRegenerating] = useState(false);
  const [extra, setExtra] = useState(null); // AI-generated extras

  const pkg = project?.youtube_package;

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an extended YouTube publishing package for this video project.

Title: ${project.title}
Type: ${project.project_type}
Audience: ${project.audience || 'general'}
Tags: ${pkg?.tags || project.youtube_tags?.join(', ') || ''}
Current Description: ${(pkg?.description_primary || project.youtube_description || '').slice(0, 400)}

Generate additional YouTube-optimized content including:
- A compelling short-form hook (1-2 sentences)
- Category suggestion (exactly one from YouTube's categories)
- Audience age range suggestion
- Best upload time suggestion
- Short-form video hook (for Shorts version)
- Chapter timestamps suggestion (5-7 chapters as plain text list)

Return only valid JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            hook_line: { type: 'string' },
            category: { type: 'string' },
            audience_age: { type: 'string' },
            best_upload_time: { type: 'string' },
            shorts_hook: { type: 'string' },
            chapters: { type: 'string' },
            seo_keywords: { type: 'string' },
          },
        },
      });
      setExtra(result);
      toast.success('Extended YouTube package generated!');
    } catch (e) {
      toast.error(e.message || 'Generation failed');
    }
    setRegenerating(false);
  };

  if (!pkg && !project?.youtube_title) {
    return (
      <div className="py-12 text-center space-y-3">
        <Youtube className="w-10 h-10 text-muted-foreground/20 mx-auto" />
        <p className="text-sm text-muted-foreground">No YouTube package available.</p>
        <p className="text-xs text-muted-foreground/60">Regenerate your blueprint to include a YouTube package.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-bold text-foreground">YouTube Publishing Package</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="h-7 text-xs gap-1.5 border-border/40"
        >
          {regenerating
            ? <span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          Extend Package
        </Button>
      </div>

      {/* Core package */}
      <div className="space-y-3">
        {pkg?.title_primary && <CopyField label="Primary Title" content={pkg.title_primary} />}
        {pkg?.title_secondary && <CopyField label="Alternate Title" content={pkg.title_secondary} />}
        {(pkg?.description_primary || project?.youtube_description) && (
          <CopyField label="Description (Primary)" content={pkg?.description_primary || project.youtube_description} multiline />
        )}
        {pkg?.description_secondary && (
          <CopyField label="Description (Alternate Language)" content={pkg.description_secondary} multiline />
        )}
        {(pkg?.tags || project?.youtube_tags?.join(', ')) && (
          <div className="rounded-xl border border-border/40 bg-card/30 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(pkg?.tags || project?.youtube_tags?.join(', ') || '').split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] border-border/40 text-muted-foreground">{tag}</Badge>
              ))}
            </div>
          </div>
        )}
        {(pkg?.thumbnail_hook_primary || project?.thumbnail_concept) && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80 mb-2">Thumbnail Hook</p>
            {pkg?.thumbnail_hook_primary && <p className="text-base font-bold text-primary">"{pkg.thumbnail_hook_primary}"</p>}
            {pkg?.thumbnail_hook_secondary && <p className="text-sm font-bold text-primary/70 mt-1">"{pkg.thumbnail_hook_secondary}"</p>}
            {project?.thumbnail_concept && !pkg?.thumbnail_hook_primary && (
              <p className="text-sm text-foreground/80">{project.thumbnail_concept}</p>
            )}
          </div>
        )}
      </div>

      {/* Extended package */}
      {extra && (
        <div className="space-y-3 pt-3 border-t border-border/30">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Extended Package
          </p>
          {extra.hook_line && <CopyField label="Video Hook" content={extra.hook_line} />}
          {extra.shorts_hook && <CopyField label="Shorts Hook" content={extra.shorts_hook} />}
          {extra.chapters && <CopyField label="Chapter Timestamps" content={extra.chapters} multiline />}
          {extra.seo_keywords && <CopyField label="SEO Keywords" content={extra.seo_keywords} />}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {extra.category && (
              <div className="p-2.5 rounded-lg border border-border/30 bg-card/20">
                <p className="text-[10px] text-muted-foreground mb-1">Category</p>
                <p className="font-semibold text-foreground">{extra.category}</p>
              </div>
            )}
            {extra.audience_age && (
              <div className="p-2.5 rounded-lg border border-border/30 bg-card/20">
                <p className="text-[10px] text-muted-foreground mb-1">Audience Age</p>
                <p className="font-semibold text-foreground">{extra.audience_age}</p>
              </div>
            )}
            {extra.best_upload_time && (
              <div className="p-2.5 rounded-lg border border-border/30 bg-card/20">
                <p className="text-[10px] text-muted-foreground mb-1">Best Upload Time</p>
                <p className="font-semibold text-foreground">{extra.best_upload_time}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}