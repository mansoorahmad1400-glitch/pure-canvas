import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { uploadProjectAsset, ACCEPT } from '@/lib/studio/assetStorage';

/**
 * Reusable upload button for image / video / audio files. Uploads to
 * Supabase Storage under projects/{projectId}/{kind}/ and creates the
 * matching project_assets row, then calls onUploaded({ publicUrl, asset }).
 *
 * Never calls any external AI provider.
 */
export default function AssetUploadButton({
  projectId,
  kind,                   // 'image' | 'video' | 'audio'
  sceneId,
  assetRole,
  label,
  size = 'sm',
  variant = 'outline',
  className = 'h-8 gap-1.5 text-xs',
  disabled = false,
  onUploaded,
}) {
  const inputRef = useRef(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const accept = ACCEPT[kind] || '*/*';
  const display = label || `Upload ${kind}`;

  const handlePick = () => {
    if (busy || disabled) return;
    inputRef.current?.click();
  };

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting same file later
    if (!file) return;
    setBusy(true);
    try {
      const { publicUrl, asset } = await uploadProjectAsset({
        projectId, file, kind, sceneId, assetRole,
      });
      toast({ title: 'Upload complete', description: file.name });
      onUploaded?.({ publicUrl, asset });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        type="button"
        className={className}
        disabled={busy || disabled}
        onClick={handlePick}
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Upload className="w-3.5 h-3.5" />}
        {busy ? 'Uploading…' : display}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
