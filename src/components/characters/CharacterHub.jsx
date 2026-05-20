import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, RefreshCw, Sparkles, Lock, AlertCircle, Check, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CharacterCard from './CharacterCard';

const DEFAULT_COSTS = { character_ref_generate: 0, character_ref_regenerate: 0 };

export default function CharacterHub({ project, onClose }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [access, setAccess] = useState({ canView: true, canRename: true, canTextLock: false, canUploadReference: false, canImageLock: false });
  const [imageLockCost, setImageLockCost] = useState(2);
  const [processingId, setProcessingId] = useState(null);
  const [refAccess, setRefAccess] = useState({ canGenerate: false, isAdmin: false });
  const [refCosts, setRefCosts] = useState({ character_ref_generate: 4, character_ref_regenerate: 5 });
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ done: 0, total: 0 });

  // Frontend safety filter — never render non-living entities
  const BLOCKED = new Set([
    'prompt','character','characters','scene','scenes','visual','visuals',
    'story','narration','camera','transition','lighting','environment',
    'background','setting','location','kingdom','city','town','village',
    'castle','forest','desert','ocean','mountain','sky','world','realm',
    'agrabah','sequence','overview','summary','style','mood','tone',
    'action','motion','movement','shot','music','sound','audio','title',
  ]);
  const isValidCharacter = (name) => {
    if (!name) return false;
    const lower = name.trim().toLowerCase().replace(/[^a-z\s]/g, '');
    if (BLOCKED.has(lower)) return false;
    if (/^(scene|prompt|character|visual|camera|shot|transition|lighting|narration|environment)\s*\d*$/i.test(name.trim())) return false;
    return true;
  };

  // Load access + characters — run fix_existing on load to merge stale duplicates
  useEffect(() => {
    if (!project?.id) return;
    Promise.all([
      base44.functions.invoke('characterHub', { action: 'check_access', project_id: project.id }),
      base44.functions.invoke('characterHub', { action: 'extract_characters', project_id: project.id, master_prompt: project.master_prompt, visual_prompt: project.visual_prompt }),
      base44.functions.invoke('characterRefGeneration', { action: 'get_status', project_id: project.id }).catch(() => ({ data: { access: { canGenerate: true, isAdmin: false }, costs: DEFAULT_COSTS } })),
    ]).then(async ([accessRes, charRes, refRes]) => {
      if (accessRes.data?.access) setAccess(accessRes.data.access);
      if (accessRes.data?.image_lock_gem_cost) setImageLockCost(accessRes.data.image_lock_gem_cost);
      const resolvedRefAccess = refRes?.data?.access ?? { canGenerate: true, isAdmin: false };
      setRefAccess(resolvedRefAccess);
      if (refRes?.data?.costs) setRefCosts(refRes.data.costs);

      let chars = charRes.data?.characters || [];

      // If records came from DB (not freshly extracted), run fix_existing to merge any duplicates
      if (!charRes.data?.extracted && chars.length > 0) {
        const fixRes = await base44.functions.invoke('characterHub', { action: 'fix_existing', project_id: project.id }).catch(() => null);
        if (fixRes?.data?.characters) chars = fixRes.data.characters;
      }

      const filtered = chars.filter(c => isValidCharacter(c.name));
      const sorted = filtered.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setCharacters(sorted);

      // Auto-generate refs for eligible characters that have none yet
      const eligible = sorted.filter(c =>
        ['protagonist', 'antagonist', 'supporting'].includes(c.role) &&
        !c.reference_image_url
      );
      if (eligible.length > 0 && resolvedRefAccess.canGenerate) {
        autoGenerateRefs(eligible, project.id);
      }
    }).catch(e => toast.error(e.message || 'Failed to load characters')).finally(() => setLoading(false));
  }, [project?.id]);

  const autoGenerateRefs = async (eligible, projectId) => {
    setAutoGenerating(true);
    setAutoGenProgress({ done: 0, total: eligible.length });
    let done = 0;
    for (const char of eligible) {
      try {
        const res = await base44.functions.invoke('characterRefGeneration', {
          action: 'generate',
          project_id: projectId,
          character_id: char.id,
        });
        if (res.data?.success) {
          setCharacters(prev => prev.map(c => c.id === char.id ? {
            ...c,
            reference_image_url: res.data.image_url,
            consistency_status: 'reference_uploaded',
            lock_type: 'image',
          } : c));
        }
      } catch (e) {
        const d = e?.response?.data;
        if (d?.insufficient_gems) break;
      }
      done++;
      setAutoGenProgress({ done, total: eligible.length });
    }
    setAutoGenerating(false);
  };

  const handleReExtract = async () => {
    if (!project?.master_prompt && !project?.visual_prompt) {
      toast.error('No blueprint content found to extract from.');
      return;
    }
    setExtracting(true);
    try {
      // force_reinit=true: backend deletes all existing records, then runs fresh AI extraction + dedup
      const res = await base44.functions.invoke('characterHub', {
        action: 'extract_characters',
        project_id: project.id,
        master_prompt: project.master_prompt,
        visual_prompt: project.visual_prompt,
        force_reinit: true,
      });
      if (res.data?.characters) {
        const filtered = res.data.characters.filter(c => isValidCharacter(c.name));
        setCharacters(filtered.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)));
        toast.success(`Extracted ${filtered.length} character${filtered.length !== 1 ? 's' : ''}`);
      }
    } catch (e) {
      toast.error(e.message || 'Extraction failed');
    }
    setExtracting(false);
  };

  const handleRename = async (charId, newName) => {
    const old = characters.find(c => c.id === charId)?.name;
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, name: newName } : c));
    try {
      await base44.functions.invoke('characterHub', {
        action: 'rename_character',
        project_id: project.id,
        character_id: charId,
        new_name: newName,
      });
      toast.success(`Renamed "${old}" → "${newName}"`);
    } catch (e) {
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, name: old } : c));
      toast.error(e.message || 'Rename failed');
    }
  };

  const handleTextLock = async (charId, descFull) => {
    setProcessingId(charId);
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, consistency_status: 'text_locked', lock_type: 'text' } : c));
    try {
      await base44.functions.invoke('characterHub', {
        action: 'text_lock',
        project_id: project.id,
        character_id: charId,
        description_full: descFull,
      });
      toast.success('Character text-locked ✓');
    } catch (e) {
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, consistency_status: 'unlocked', lock_type: 'none' } : c));
      toast.error(e.message || 'Lock failed');
    }
    setProcessingId(null);
  };

  const handleUnlock = async (charId) => {
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, consistency_status: 'unlocked', lock_type: 'none' } : c));
    await base44.functions.invoke('characterHub', { action: 'unlock_character', project_id: project.id, character_id: charId }).catch(() => {});
    toast.success('Character unlocked');
  };

  const handleUploadReference = async (charId, file) => {
    setProcessingId(charId);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.functions.invoke('characterHub', {
        action: 'upload_reference',
        project_id: project.id,
        character_id: charId,
        image_url: file_url,
      });
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, reference_image_url: file_url, lock_type: 'image', consistency_status: 'reference_uploaded' } : c));
      toast.success('Reference image uploaded');
    } catch (e) {
      toast.error(e.message || 'Upload failed');
    }
    setProcessingId(null);
  };

  const handleImageLock = async (charId) => {
    setProcessingId(charId);
    try {
      const res = await base44.functions.invoke('characterHub', {
        action: 'image_lock',
        project_id: project.id,
        character_id: charId,
      });
      if (res.data?.provider_not_configured) {
        toast('Reference stored. Full image-lock activates when provider is configured.', { icon: 'ℹ️', duration: 4000 });
      } else {
        toast.success('Character image-locked!');
      }
      setCharacters(prev => prev.map(c => c.id === charId ? { ...c, consistency_status: res.data?.consistency_status || 'reference_uploaded', lock_type: 'image' } : c));
    } catch (e) {
      toast.error(e.message || 'Image-lock failed');
    }
    setProcessingId(null);
  };

  const handleEditDescription = async (charId, newDesc) => {
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, description_full: newDesc } : c));
    await base44.functions.invoke('characterHub', {
      action: 'update_character',
      project_id: project.id,
      character_id: charId,
      updates: { description_full: newDesc },
    }).catch(() => {});
    toast.success('Description updated');
  };

  const handleDelete = async (charId) => {
    setCharacters(prev => prev.filter(c => c.id !== charId));
    await base44.functions.invoke('characterHub', { action: 'delete_character', project_id: project.id, character_id: charId }).catch(() => {});
    toast.success('Character removed');
  };

  const handleUpdateLocal = (charId, updates) => {
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, ...updates } : c));
  };

  const handleAutoGenerateAll = async () => {
    if (!refAccess?.canGenerate) {
      toast.error('Character reference generation requires a paid plan');
      return;
    }
    const eligible = characters.filter(c =>
      ['protagonist', 'antagonist', 'supporting'].includes(c.role) &&
      !c.reference_image_url
    );
    if (eligible.length === 0) {
      toast('All eligible characters already have reference images.', { icon: '✓' });
      return;
    }
    await autoGenerateRefs(eligible, project.id);
    toast.success(`Generated reference images for ${eligible.length} character${eligible.length !== 1 ? 's' : ''}`);
  };

  const lockedCount = characters.filter(c => c.lock_type === 'text' || c.lock_type === 'image').length;

  // Group characters by role tier
  const mainRoles = ['protagonist', 'antagonist'];
  const supportingRoles = ['supporting', 'narrator', 'minor'];
  const backgroundRoles = ['background'];

  const mainChars = characters.filter(c => mainRoles.includes(c.role));
  const supportingChars = characters.filter(c => supportingRoles.includes(c.role));
  const backgroundChars = characters.filter(c => backgroundRoles.includes(c.role));

  const renderGroup = (title, group, emptyMsg) => {
    if (group.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">{title}</span>
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-[10px] text-muted-foreground/40">{group.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.map((char, i) => (
            <CharacterCard
              key={char.id}
              character={char}
              index={i}
              access={access}
              imageLockCost={imageLockCost}
              refAccess={refAccess}
              refCosts={refCosts}
              isAdmin={access.isAdmin}
              onRename={handleRename}
              onTextLock={handleTextLock}
              onUnlock={handleUnlock}
              onUploadReference={handleUploadReference}
              onImageLock={handleImageLock}
              onEditDescription={handleEditDescription}
              onDelete={handleDelete}
              onUpdateLocal={handleUpdateLocal}
              projectId={project.id}
              isProcessing={processingId === char.id}
            />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading Character Hub...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Characters</h2>
            <p className="text-xs text-muted-foreground">
              {characters.length} character{characters.length !== 1 ? 's' : ''}{lockedCount > 0 ? ` · ${lockedCount} locked` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autoGenerating && (
            <div className="flex items-center gap-1.5 text-xs text-purple-400">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Generating {autoGenProgress.done}/{autoGenProgress.total}…
            </div>
          )}
          {!autoGenerating && refAccess?.canGenerate && characters.some(c => ['protagonist','antagonist','supporting'].includes(c.role) && !c.reference_image_url) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoGenerateAll}
              className="h-7 text-[11px] gap-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              <Wand2 className="w-3 h-3" /> Auto-Generate All
            </Button>
          )}
          {extracting && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Extracting...
            </div>
          )}
          {!extracting && (
            <button onClick={handleReExtract} className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Plan notice */}
      {!access.canTextLock && (
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>You can view and rename characters on the free plan. Upgrade to Starter to enable text-lock and consistency injection.</span>
        </div>
      )}

      {/* Lock summary */}
      {lockedCount > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-green-500/8 border border-green-500/20 text-xs text-green-400">
          <Check className="w-3.5 h-3.5" />
          <span>{lockedCount} character{lockedCount !== 1 ? 's' : ''} locked — descriptions will be injected into visual prompts on next generation.</span>
        </div>
      )}

      {/* Empty state */}
      {characters.length === 0 && !extracting && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-secondary/60 border border-border/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No characters extracted yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">Characters are automatically extracted from your blueprint. Try re-extracting if the list is empty.</p>
          </div>
          <Button size="sm" onClick={handleReExtract} disabled={extracting} className="gap-2">
            <Sparkles className="w-3.5 h-3.5" /> Extract Characters
          </Button>
        </div>
      )}

      {/* Characters grouped by role */}
      {characters.length > 0 && (
        <div className="space-y-5">
          {renderGroup('Main Characters', mainChars)}
          {renderGroup('Supporting Characters', supportingChars)}
          {renderGroup('Background & Extras', backgroundChars)}
        </div>
      )}
    </div>
  );
}