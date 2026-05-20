import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, Youtube, Image, Tag } from 'lucide-react';
import { toast } from 'sonner';

function CopyBlock({ label, text, icon: Icon }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary" />}
          {label}
        </span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export default function YouTubePackaging({ project }) {
  const allTags = project.youtube_tags?.join(', ') || '';

  return (
    <Card className="border-border/50 bg-card/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
          <Youtube className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">YouTube Packaging</h2>
          <p className="text-xs text-muted-foreground">Ready-to-use metadata for your upload</p>
        </div>
      </div>

      <div className="space-y-4">
        <CopyBlock label="Video Title" text={project.youtube_title} icon={Youtube} />
        <CopyBlock label="Description" text={project.youtube_description} icon={null} />

        {/* Tags */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Tags
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(allTags);
                toast.success('Tags copied!');
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3 h-3 mr-1" /> Copy All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.youtube_tags?.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs border-border/50 bg-background/50">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <CopyBlock label="Thumbnail Concept" text={project.thumbnail_concept} icon={Image} />
      </div>
    </Card>
  );
}