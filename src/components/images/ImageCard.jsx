import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, Trash2, Send, Star, ZoomIn, X, Upload, Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ImageCard({ image, onApprove, onUnapprove, onSendToVideo, onDelete, onReplace, isApproving }) {
  const [lightbox, setLightbox] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef(null);

  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReplacing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (onReplace) await onReplace(image.id, file_url);
      toast.success('Image replaced');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    }
    setReplacing(false);
    e.target.value = '';
  };

  return (
    <>
      <div className={`relative rounded-xl overflow-hidden border transition-all group ${
        image.approved
          ? 'border-green-500/40 ring-1 ring-green-500/20'
          : 'border-border/30 hover:border-border/60'
      }`}>
        {/* Image */}
        <div className="relative aspect-video bg-secondary/40 cursor-pointer" onClick={() => setLightbox(true)}>
          <img
            src={image.image_url}
            alt={`Scene ${image.scene_number}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {image.approved && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-green-500/90 text-white border-0 text-[10px] gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Approved
              </Badge>
            </div>
          )}
          {image.master_frame && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] gap-0.5">
                <Star className="w-2.5 h-2.5" /> Master
              </Badge>
            </div>
          )}
          {image.sent_to_video && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-blue-500/80 text-white border-0 text-[10px]">→ Video</Badge>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 bg-card/60 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground font-mono capitalize">{image.style_preset?.replace(/_/g, ' ')}</span>
          <span className="text-[10px] text-muted-foreground">· {image.aspect_ratio}</span>
          {image.quality === 'hd' && <Badge className="text-[9px] border bg-amber-500/10 text-amber-400 border-amber-500/20">HD</Badge>}
          {image.consistency_mode && <Badge className="text-[9px] border bg-purple-500/10 text-purple-400 border-purple-500/20">Consistency</Badge>}
          <span className="text-[10px] text-muted-foreground ml-auto">{image.gems_cost}💎</span>

          <div className="w-full flex gap-1 mt-1">
            {!image.approved ? (
              <Button
                size="sm"
                onClick={() => onApprove(image.id)}
                disabled={isApproving}
                className="h-6 text-[10px] px-2 bg-green-500/80 hover:bg-green-500 text-white gap-1 flex-1"
              >
                <CheckCircle2 className="w-2.5 h-2.5" /> Approve
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUnapprove(image.id)}
                className="h-6 text-[10px] px-2 border-green-500/30 text-green-400 hover:bg-green-500/10 flex-1"
              >
                Approved ✓
              </Button>
            )}
            {image.approved && !image.sent_to_video && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSendToVideo(image.id)}
                className="h-6 text-[10px] px-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                title="Send to Video Pipeline"
              >
                <Send className="w-2.5 h-2.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={replacing}
              className="h-6 text-[10px] px-2 text-muted-foreground hover:text-blue-400"
              title="Replace with your own image"
            >
              {replacing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Upload className="w-2.5 h-2.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(image.id)}
              className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplace} />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={image.image_url}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}