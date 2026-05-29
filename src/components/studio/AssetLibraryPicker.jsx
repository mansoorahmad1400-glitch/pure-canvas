import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Library, Loader2, Check, ImageIcon, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { projectAssetsApi } from '@/lib/studio/assetStorage';

/**
 * Lets the user reuse a previously uploaded project_asset (no new upload,
 * no external API call). Calls onPick({ publicUrl, asset }) when chosen.
 */
export default function AssetLibraryPicker({
  projectId,
  kind, // 'image' | 'video' | 'audio'
  assetRole,
  label,
  size = 'sm',
  variant = 'outline',
  className = 'h-8 gap-1.5 text-xs',
  disabled = false,
  onPick,
}) {
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ['project-assets', projectId, 'picker'],
    queryFn: async () => {
      const { data, error } = await projectAssetsApi.listByProject(projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!projectId,
  });

  const items = useMemo(
    () => (q.data ?? []).filter((a) => a.asset_type === kind && a.public_url),
    [q.data, kind]
  );

  const Icon = kind === 'image' ? ImageIcon : kind === 'video' ? Video : Music;
  const display = label || `Pick from Library`;

  const choose = (asset) => {
    onPick?.({ publicUrl: asset.public_url, asset });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size={size}
          variant={variant}
          className={className}
          disabled={disabled}
        >
          <Library className="w-3.5 h-3.5" />
          {display}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" />
            Pick {kind} from project library
          </DialogTitle>
          <DialogDescription>
            Reuse a file you already uploaded to this project. No upload, no external API.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {q.isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No {kind} files uploaded yet. Use the Upload button to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-2">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border/40 bg-card/40 p-2 space-y-2"
                >
                  {kind === 'image' && (
                    <img
                      src={a.public_url}
                      alt={a.file_name}
                      className="aspect-video w-full object-cover rounded bg-black"
                    />
                  )}
                  {kind === 'video' && (
                    <video
                      src={a.public_url}
                      preload="metadata"
                      controls
                      className="aspect-video w-full object-cover rounded bg-black"
                    />
                  )}
                  {kind === 'audio' && (
                    <audio src={a.public_url} controls className="w-full h-9" />
                  )}
                  <div className="space-y-0.5">
                    <p className="text-[11px] text-foreground/90 truncate" title={a.file_name}>
                      {a.file_name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                          a.approval_status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {a.approval_status}
                      </span>
                      {a.asset_role && (
                        <span className="text-[9px] text-muted-foreground">{a.asset_role}</span>
                      )}
                      {a.duration_seconds ? (
                        <span className="text-[9px] text-muted-foreground">
                          {Math.round(a.duration_seconds * 10) / 10}s
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 w-full text-[11px] gap-1"
                    onClick={() => choose(a)}
                  >
                    <Check className="w-3 h-3" />
                    Use this {kind}
                    {assetRole && a.asset_role && a.asset_role !== assetRole ? ' (any role)' : ''}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
