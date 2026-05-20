import React from 'react';
import { Card } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export default function ToolRecommendations({ tools }) {
  if (!tools || tools.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/60 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Recommended AI Tools</h2>
          <p className="text-xs text-muted-foreground">Best tools for each part of your production</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map((tool, i) => (
          <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border/30">
            <h4 className="font-medium text-sm text-foreground mb-1">{tool.tool_name}</h4>
            <p className="text-xs text-primary font-medium mb-1">{tool.purpose}</p>
            <p className="text-xs text-muted-foreground">{tool.usage_note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}