import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Film, Trash2, ZoomIn } from 'lucide-react';

export default function ImageCompareGrid({ images, onApprove, onUnapprove, onDelete, onSendToVideo }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="space-y-2"
      >
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Compare Versions — {images.length} image{images.length !== 1 ? 's' : ''}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`relative rounded-xl overflow-hidden border group transition-all ${
                img.approved
                  ? 'border-green-500/40 ring-1 ring-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.1)]'
                  : 'border-border/30 hover:border-border/60'
              }`}
            >
              <img
                src={img.image_url}
                alt={`Version ${idx + 1}`}
                className="w-full aspect-video object-cover cursor-zoom-in"
                onClick={() => setLightbox(img.image_url)}
              />

              {/* Version label */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                <span className="text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                  v{idx + 1}
                </span>
                {img.approved && (
                  <span className="text-[9px] font-bold bg-green-500/80 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                  </span>
                )}
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                <button
                  onClick={() => setLightbox(img.image_url)}
                  className="flex items-center gap-1 text-[10px] text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors w-full justify-center"
                >
                  <ZoomIn className="w-3 h-3" /> View Full
                </button>
                {!img.approved ? (
                  <button
                    onClick={() => onApprove(img.id)}
                    className="flex items-center gap-1 text-[10px] text-white bg-green-600/80 hover:bg-green-600 px-2 py-1 rounded-lg transition-colors w-full justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Approve This
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onSendToVideo(img.id)}
                      className="flex items-center gap-1 text-[10px] text-white bg-sky-600/80 hover:bg-sky-600 px-2 py-1 rounded-lg transition-colors w-full justify-center"
                    >
                      <Film className="w-3 h-3" /> Send to Video
                    </button>
                    <button
                      onClick={() => onUnapprove(img.id)}
                      className="text-[10px] text-white/60 hover:text-white transition-colors"
                    >
                      Unapprove
                    </button>
                  </>
                )}
                <button
                  onClick={() => onDelete(img.id)}
                  className="flex items-center gap-1 text-[10px] text-white/50 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full view"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
          >✕</button>
        </div>
      )}
    </>
  );
}