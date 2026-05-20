import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Check, ChevronDown, ChevronUp, Eye, MessageSquare, Music, Volume2, Clock, Camera } from 'lucide-react';
import { toast } from 'sonner';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

export default function SceneCard({ scene, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-border/50 bg-card/60 overflow-hidden hover:border-primary/20 transition-colors">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-5 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {scene.scene_number || index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{scene.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="text-xs border-border/50">
                  <Clock className="w-3 h-3 mr-1" />
                  {scene.duration_seconds}s
                </Badge>
                <span className="text-xs text-muted-foreground">{scene.mood}</span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {/* Expanded Content */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30"
          >
            <div className="p-5 space-y-5">
              {/* Description */}
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">{scene.description}</p>
              </div>

              {/* Visual Prompt */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    <Eye className="w-4 h-4" /> Visual Prompt
                  </div>
                  <CopyButton text={scene.visual_prompt} label="Visual prompt" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{scene.visual_prompt}</p>
              </div>

              {/* Camera */}
              {scene.camera_angle && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Camera className="w-4 h-4" />
                  <span className="font-medium">Camera:</span> {scene.camera_angle}
                </div>
              )}

              {/* Narration English */}
              <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Narration (English)
                  </span>
                  <CopyButton text={scene.narration_en} label="English narration" />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{scene.narration_en}</p>
              </div>

              {/* Narration Secondary */}
              {scene.narration_secondary && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Narration (Secondary)
                    </span>
                    <CopyButton text={scene.narration_secondary} label="Secondary narration" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{scene.narration_secondary}</p>
                </div>
              )}

              {/* Dialogue */}
              {scene.dialogue && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Dialogue</span>
                    <CopyButton text={scene.dialogue} label="Dialogue" />
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">{scene.dialogue}</p>
                </div>
              )}

              {/* Music & SFX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-primary" /> Music Cue
                    </span>
                    <CopyButton text={scene.music_cue} label="Music cue" />
                  </div>
                  <p className="text-xs text-muted-foreground">{scene.music_cue}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-primary" /> Sound Effects
                    </span>
                    <CopyButton text={scene.sound_effects} label="Sound effects" />
                  </div>
                  <p className="text-xs text-muted-foreground">{scene.sound_effects}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}