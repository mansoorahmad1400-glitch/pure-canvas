import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Lock, Unlock, ImageIcon, Check, Trash2, User, Upload, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import CharacterDNAPanel, { calculateScore } from './CharacterDNAPanel';
import CharacterRefPanel from './CharacterRefPanel';

const ROLE_COLORS = {
  protagonist: 'bg-primary/15 text-primary border-primary/25',
  antagonist:  'bg-red-500/15 text-red-400 border-red-500/25',
  supporting:  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  narrator:    'bg-purple-500/15 text-purple-400 border-purple-500/25',
  minor:       'bg-secondary text-muted-foreground border-border/40',
  background:  'bg-secondary/60 text-muted-foreground/60 border-border/30',
};

function ConsistencyBar({ score }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-muted-foreground/30';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-border/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-bold tabular-nums ${
        score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-muted-foreground/40'
      }`}>{score}%</span>
    </div>
  );
}

export default function CharacterCard({
  character, index, access, imageLockCost, refAccess, refCosts,
  onRename, onTextLock, onUnlock, onUploadReference, onImageLock,
  onEditDescription, onDelete, onUpdateLocal,
  isProcessing,
  isAdmin,
  projectId,
}) {
  const [renaming, setRenaming] = useState(false);
  const [renamingValue, setRenamingValue] = useState(character.name);
  const [showActions, setShowActions] = useState(false);

  const roleCls = ROLE_COLORS[character.role] || ROLE_COLORS.supporting;
  const isLocked = character.lock_type === 'text' || character.lock_type === 'image';
  const score = character.consistency_score ?? calculateScore(character);

  const lockStatusLabel = {
    unlocked:           { label: 'Unlocked',   cls: 'bg-secondary text-muted-foreground/50 border-border/20' },
    text_locked:        { label: '✎ Text Lock', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    reference_uploaded: { label: '🖼 Ref Ready', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    image_locked:       { label: '🔒 Image Lock',cls: 'bg-green-500/15 text-green-400 border-green-500/25' },
    failed:             { label: '⚠ Failed',    cls: 'bg-red-500/15 text-red-400 border-red-500/25' },
  }[character.consistency_status] || { label: 'Unlocked', cls: 'bg-secondary text-muted-foreground/50' };

  const handleRenameSubmit = () => {
    if (renamingValue.trim() && renamingValue.trim() !== character.name) {
      onRename(character.id, renamingValue.trim());
    }
    setRenaming(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={`rounded-xl border bg-card/60 p-4 transition-all ${
        isLocked ? 'border-green-500/20' : 'border-border/40'
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-border/40 bg-secondary/40 flex items-center justify-center relative">
          {character.reference_image_url ? (
            <img src={character.reference_image_url} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-muted-foreground/30" />
          )}
          {isLocked && (
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-md bg-green-500/80 flex items-center justify-center">
              <Lock className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {renaming ? (
                <div className="flex gap-1.5 items-center">
                  <input
                    value={renamingValue}
                    onChange={e => setRenamingValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
                    autoFocus
                    className="text-sm font-bold bg-secondary/50 border border-primary/40 rounded-md px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-32"
                  />
                  <button onClick={handleRenameSubmit} className="text-green-400 hover:text-green-300">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setRenaming(false); setRenamingValue(character.name); }} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-foreground truncate">{character.name}</h3>
                  <button onClick={() => setRenaming(true)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`text-[10px] px-1.5 py-0 border ${roleCls} capitalize`}>
                  {character.role}
                </Badge>
                <Badge className={`text-[10px] px-1.5 py-0 border ${lockStatusLabel.cls}`}>
                  {lockStatusLabel.label}
                </Badge>
                {character.scenes?.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/50">
                    {character.scenes.length} scene{character.scenes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {/* Aliases */}
              {character.location_hints?.length > 0 && (
                <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">
                  aka {character.location_hints.join(', ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowActions(v => !v)}
                className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-border/30"
              >
                {showActions ? 'Less' : '···'}
              </button>
              <button onClick={() => onDelete(character.id)} className="text-muted-foreground/20 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {(character.description_full || character.description_short) && (
            <p className="text-xs text-muted-foreground/75 leading-relaxed mt-2 line-clamp-2">
              {character.description_full || character.description_short}
            </p>
          )}

          {/* Consistency score bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">Consistency</span>
            </div>
            <ConsistencyBar score={score} />
          </div>
        </div>
      </div>

      {/* Character Reference Image Panel */}
      {(['protagonist','antagonist','supporting'].includes(character.role)) && (
        <CharacterRefPanel
          character={character}
          projectId={projectId}
          access={refAccess}
          costs={refCosts}
          onUpdated={(id, updates) => onUpdateLocal && onUpdateLocal(id, updates)}
        />
      )}

      {/* DNA Panel */}
      <CharacterDNAPanel
        character={character}
        projectId={projectId}
        onUpdate={(id, updates) => onUpdateLocal && onUpdateLocal(id, updates)}
      />

      {/* Expandable actions */}
      {showActions && (
        <div className="mt-3 pt-3 border-t border-border/20 flex flex-wrap gap-1.5">
          {isLocked ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-border/30 text-muted-foreground"
              onClick={() => onUnlock(character.id)} disabled={isProcessing}>
              <Unlock className="w-3 h-3" /> Unlock
            </Button>
          ) : access.canTextLock ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
              onClick={() => onTextLock(character.id, character.description_full)}
              disabled={isProcessing}>
              {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              Text-Lock
            </Button>
          ) : null}

          {access.canUploadReference && (
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) onUploadReference(character.id, file);
                e.target.value = '';
              }} />
              <span className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium rounded-md border border-border/40 bg-card/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer">
                <Upload className="w-3 h-3" /> {character.reference_image_url ? 'Re-upload' : 'Upload Ref'}
              </span>
            </label>
          )}

          {character.reference_image_url && access.canImageLock && character.consistency_status !== 'image_locked' && (
            <Button size="sm" variant="outline"
              className="h-7 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onImageLock(character.id)}
              disabled={isProcessing}>
              {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              Image-Lock ({imageLockCost} 💎)
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}