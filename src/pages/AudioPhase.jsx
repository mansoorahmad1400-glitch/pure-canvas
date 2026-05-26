import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, RefreshCw, Loader2, Music, Mic, Speaker, Sparkles,
  Check, X, Link2, Trash2, Download, VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  projectsApi, scenesApi, sceneVideosApi, audioAssetsApi,
} from '@/lib/studio/api';
import { useAuthReady } from '@/hooks/useAuthReady';
import QueryErrorState from '@/components/studio/QueryErrorState';
import AssetUploadButton from '@/components/studio/AssetUploadButton';

// Mock placeholder audio URL — short open-source bell tone, useful for testing
// pipeline gating without calling paid TTS/music providers.
const MOCK_AUDIO_URL = 'https://www.soundjay.com/buttons/sounds/button-3.mp3';
const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|flac)(\?.*)?$/i;

const ASSET_TYPES = [
  { key: 'voice',      label: 'Voice / Dialogue', icon: Mic },
  { key: 'narration',  label: 'Narration',        icon: Mic },
  { key: 'music',      label: 'Background Music', icon: Music },
  { key: 'sfx',        label: 'Sound FX',         icon: Speaker },
  { key: 'rhyme_song', label: 'Rhyme / Song',     icon: Music },
  { key: 'mix',        label: 'Full Mix',         icon: Music },
];

// Split "Speaker: line" → { speaker, line }. If no colon, line only.
function splitDialogue(text) {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^([A-Z][\w'\- ]{0,40}):\s*(.+)$/);
      if (m) return { speaker: m[1].trim(), line: m[2].trim() };
      return { speaker: null, line: raw };
    });
}

function statusPill(status) {
  if (status === 'approved') {
    return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Approved</span>;
  }
  if (status === 'draft' || status === 'pending') {
    return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Draft</span>;
  }
  return <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Missing</span>;
}

function AudioPlayer({ url, provider }) {
  if (!url) return null;
  const playable = AUDIO_EXT_RE.test(url);
  if (playable) {
    return <audio src={url} controls className="w-full h-9" />;
  }
  return (
    <div className="text-[11px] text-muted-foreground bg-secondary/40 rounded-md px-2 py-1.5 flex items-center gap-2">
      <Sparkles className="w-3.5 h-3.5" />
      {provider === 'mock' ? 'Mock audio placeholder' : 'Audio link'} —{' '}
      <a href={url} target="_blank" rel="noreferrer" className="text-primary underline break-all">{url}</a>
    </div>
  );
}

function AssetRow({ asset, onApprove, onUnapprove, onDelete, onReplace }) {
  const [urlEdit, setUrlEdit] = useState(false);
  const [url, setUrl] = useState(asset.audio_url || '');
  const [busy, setBusy] = useState(null);

  const wrap = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase">
          {asset.asset_type}
        </span>
        {statusPill(asset.approval_status)}
        <span className="text-[11px] text-muted-foreground">
          {asset.provider || 'manual'}{asset.duration ? ` · ${asset.duration}s` : ''}
        </span>
      </div>
      {asset.prompt_used && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 font-mono">{asset.prompt_used}</p>
      )}
      <AudioPlayer url={asset.audio_url} provider={asset.provider} />

      {urlEdit ? (
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...mp3"
            className="h-8 text-xs" autoFocus />
          <Button size="sm" className="h-8 text-xs"
            disabled={busy === 'replace' || !url.trim()}
            onClick={() => wrap('replace', async () => {
              await onReplace(asset.id, url.trim());
              setUrlEdit(false);
            })}>
            {busy === 'replace' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setUrlEdit(false); setUrl(asset.audio_url || ''); }}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {asset.approval_status !== 'approved' ? (
            <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white"
              disabled={busy === 'approve'} onClick={() => wrap('approve', () => onApprove(asset.id))}>
              {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              disabled={busy === 'unapprove'} onClick={() => wrap('unapprove', () => onUnapprove(asset.id))}>
              {busy === 'unapprove' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Unapprove
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setUrlEdit(true)}>
            <Link2 className="w-3 h-3" /> Replace URL
          </Button>
          {asset.audio_url && (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
              <a href={asset.audio_url} target="_blank" rel="noreferrer" download>
                <Download className="w-3 h-3" /> Download
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
            disabled={busy === 'delete'}
            onClick={() => { if (confirm('Delete this audio asset?')) wrap('delete', () => onDelete(asset.id)); }}>
            {busy === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}

function SceneAudioCard({ scene, video, sceneAssets, projectId, onAddAsset, onApprove, onUnapprove, onDelete, onReplace, onMarkSilent }) {
  const [busy, setBusy] = useState(null);
  const [urlMode, setUrlMode] = useState(null); // 'voice' | 'music' | 'sfx' | 'rhyme_song'
  const [urlInput, setUrlInput] = useState('');

  const mode = scene.audio_mode || 'layered';
  const dialogueLines = splitDialogue(scene.dialogue_text);
  const narrationText = scene.narration_text;
  const rhymeText = scene.rhyme_lyrics;

  const sceneApproved = useMemo(() => {
    if (mode === 'silent') {
      return sceneAssets.some((a) => a.provider === 'silent' && a.approval_status === 'approved');
    }
    return sceneAssets.some((a) => a.approval_status === 'approved');
  }, [sceneAssets, mode]);

  const wrap = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const promptFor = (type) => {
    if (type === 'voice')      return scene.dialogue_text || scene.narration_text || `Voice for scene ${scene.scene_number}`;
    if (type === 'narration')  return scene.narration_text || `Narration for scene ${scene.scene_number}`;
    if (type === 'music')      return scene.background_music_prompt || `Background music for scene ${scene.scene_number}`;
    if (type === 'sfx')        return scene.sfx_prompt || `Sound effects for scene ${scene.scene_number}`;
    if (type === 'rhyme_song') return scene.rhyme_lyrics || `Rhyme/song for scene ${scene.scene_number}`;
    return `Audio for scene ${scene.scene_number}`;
  };

  const addMock = (type) => wrap(`mock-${type}`, () => onAddAsset({
    scene_id: scene.id,
    asset_type: type,
    provider: 'mock',
    audio_url: MOCK_AUDIO_URL,
    prompt_used: promptFor(type),
    duration: scene.duration_seconds ?? 6,
    approval_status: 'draft',
  }));

  const addUrl = (type) => wrap(`url-${type}`, async () => {
    const u = urlInput.trim();
    if (!u) return;
    await onAddAsset({
      scene_id: scene.id,
      asset_type: type,
      provider: 'manual',
      audio_url: u,
      prompt_used: promptFor(type),
      duration: scene.duration_seconds ?? 6,
      approval_status: 'draft',
    });
    setUrlInput(''); setUrlMode(null);
  });

  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border/40 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary">#{scene.scene_number}</span>
            <h3 className="text-sm font-semibold truncate">{scene.scene_title || `Scene ${scene.scene_number}`}</h3>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {mode}
            </span>
            {sceneApproved
              ? <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Audio Ready</span>
              : <span className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">No approved audio</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {scene.duration_seconds ?? 6}s · {scene.voice_style || 'no voice style'}
            {scene.audio_timing ? ` · timing ${scene.audio_timing}s` : ''}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 p-4">
        {/* Left: video poster + storyboard audio fields */}
        <div className="space-y-3 min-w-0">
          {video?.video_url && AUDIO_EXT_RE.test('') /* always false; show poster */ }
          <div className="aspect-video rounded-xl bg-secondary/40 border border-border/40 overflow-hidden flex items-center justify-center text-muted-foreground/70 text-xs">
            {video?.video_url
              ? <span>Approved video #{scene.scene_number}</span>
              : <span>No video</span>}
          </div>

          {dialogueLines.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Dialogue</p>
              <div className="space-y-1.5">
                {dialogueLines.map((d, i) => (
                  <div key={i} className="text-xs bg-background/40 rounded-md border border-border/30 px-2.5 py-1.5">
                    {d.speaker && (
                      <p className="text-[10px] uppercase tracking-wide text-primary/80">Speaker: {d.speaker}</p>
                    )}
                    <p className="text-foreground/90"><span className="text-muted-foreground">Line:</span> {d.line}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 italic">
                TTS will speak only the line, not the speaker label.
              </p>
            </div>
          )}

          {narrationText && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Narration</p>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">{narrationText}</p>
            </div>
          )}

          {rhymeText && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Rhyme / Song lyrics</p>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap">{rhymeText}</p>
            </div>
          )}

          {scene.background_music_prompt && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Music prompt</p>
              <p className="text-xs text-muted-foreground">{scene.background_music_prompt}</p>
            </div>
          )}
          {scene.sfx_prompt && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">SFX prompt</p>
              <p className="text-xs text-muted-foreground">{scene.sfx_prompt}</p>
            </div>
          )}
        </div>

        {/* Right: actions + assets */}
        <div className="space-y-3 min-w-0">
          {mode === 'silent' ? (
            <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                This scene is marked <strong>Silent</strong>. No audio asset required.
              </p>
              <Button size="sm" className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-600/90 text-white"
                disabled={busy === 'silent' || sceneApproved}
                onClick={() => wrap('silent', () => onMarkSilent(scene))}>
                {busy === 'silent' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VolumeX className="w-3.5 h-3.5" />}
                {sceneApproved ? 'Approved as Silent' : 'Approve as Silent'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Add audio</p>
              <div className="grid grid-cols-2 gap-1.5">
                {['voice', 'music', 'sfx', 'rhyme_song'].map((type) => (
                  <div key={type} className="space-y-1">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 flex-1"
                        onClick={() => { setUrlMode(type); setUrlInput(''); }}>
                        <Link2 className="w-3 h-3" /> URL {type === 'rhyme_song' ? 'Song' : type}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 flex-1"
                        disabled={busy === `mock-${type}`}
                        onClick={() => addMock(type)}>
                        {busy === `mock-${type}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Mock
                      </Button>
                    </div>
                    <AssetUploadButton
                      projectId={projectId}
                      kind="audio"
                      sceneId={scene.id}
                      assetRole={type}
                      label={`Upload ${type === 'rhyme_song' ? 'Song' : type}`}
                      className="h-7 gap-1 text-[11px] w-full"
                      onUploaded={({ publicUrl, asset }) => onAddAsset({
                        scene_id: scene.id,
                        asset_type: type,
                        provider: 'manual_upload',
                        audio_url: publicUrl,
                        prompt_used: promptFor(type),
                        duration: asset?.duration_seconds ?? scene.duration_seconds ?? 6,
                        approval_status: 'draft',
                      })}
                    />
                    {urlMode === type && (
                      <div className="flex gap-1">
                        <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                          placeholder={`https://...${type === 'music' ? 'mp3' : 'mp3'}`}
                          className="h-7 text-[11px]" autoFocus />
                        <Button size="sm" className="h-7 text-[11px]"
                          disabled={!urlInput.trim() || busy === `url-${type}`}
                          onClick={() => addUrl(type)}>
                          {busy === `url-${type}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Scene assets ({sceneAssets.length})
            </p>
            {sceneAssets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic">No audio assets yet.</p>
            ) : (
              <div className="space-y-2">
                {sceneAssets.map((a) => (
                  <AssetRow key={a.id} asset={a}
                    onApprove={onApprove} onUnapprove={onUnapprove}
                    onDelete={onDelete} onReplace={onReplace} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AudioPhase() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isReady } = useAuthReady();

  const projectQ = useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.get(projectId);
      if (error) throw error; return data;
    },
    enabled: isReady && !!user && !!projectId,
  });
  const scenesQ = useQuery({
    queryKey: ['storyboard-scenes', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await scenesApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });
  const videosQ = useQuery({
    queryKey: ['scene-videos', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await sceneVideosApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });
  const audioQ = useQuery({
    queryKey: ['audio-assets', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await audioAssetsApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });

  const [savingAll, setSavingAll] = useState(false);

  const project = projectQ.data;
  const allScenes = scenesQ.data ?? [];
  const videos = videosQ.data ?? [];
  const assets = audioQ.data ?? [];

  const approvedVideoByScene = useMemo(() => {
    const m = new Map();
    videos
      .filter((v) => v.approval_status === 'approved' && v.video_url)
      .forEach((v) => { if (!m.has(v.scene_id)) m.set(v.scene_id, v); });
    return m;
  }, [videos]);

  const eligibleScenes = useMemo(
    () => allScenes
      .filter((s) => approvedVideoByScene.has(s.id))
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0)),
    [allScenes, approvedVideoByScene]
  );

  const assetsByScene = useMemo(() => {
    const m = new Map();
    assets.forEach((a) => {
      if (!a.scene_id) return;
      if (!m.has(a.scene_id)) m.set(a.scene_id, []);
      m.get(a.scene_id).push(a);
    });
    return m;
  }, [assets]);

  const scenesWithApprovedAudio = useMemo(() => {
    let n = 0;
    for (const s of eligibleScenes) {
      const list = assetsByScene.get(s.id) ?? [];
      const mode = s.audio_mode || 'layered';
      const ok = mode === 'silent'
        ? list.some((a) => a.provider === 'silent' && a.approval_status === 'approved')
        : list.some((a) => a.approval_status === 'approved');
      if (ok) n++;
    }
    return n;
  }, [eligibleScenes, assetsByScene]);

  const refresh = () => {
    scenesQ.refetch(); videosQ.refetch(); audioQ.refetch();
  };

  const handleAddAsset = async (payload) => {
    try {
      const { error } = await audioAssetsApi.create({ project_id: projectId, ...payload });
      if (error) throw error;
      await audioQ.refetch();
    } catch (e) {
      toast({ title: 'Could not add audio', description: e?.message, variant: 'destructive' });
    }
  };

  const handleApprove = async (id) => {
    try {
      const { error } = await audioAssetsApi.approve(id);
      if (error) throw error;
      await audioQ.refetch();
      toast({ title: 'Audio approved' });
    } catch (e) {
      toast({ title: 'Approve failed', description: e?.message, variant: 'destructive' });
    }
  };
  const handleUnapprove = async (id) => {
    try {
      const { error } = await audioAssetsApi.unapprove(id);
      if (error) throw error;
      await audioQ.refetch();
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };
  const handleDelete = async (id) => {
    try {
      const { error } = await audioAssetsApi.remove(id);
      if (error) throw error;
      await audioQ.refetch();
    } catch (e) {
      toast({ title: 'Delete failed', description: e?.message, variant: 'destructive' });
    }
  };
  const handleReplace = async (id, audio_url) => {
    try {
      const { error } = await audioAssetsApi.update(id, { audio_url, provider: 'manual' });
      if (error) throw error;
      await audioQ.refetch();
    } catch (e) {
      toast({ title: 'Update failed', description: e?.message, variant: 'destructive' });
    }
  };
  const handleMarkSilent = async (scene) => {
    try {
      const { error } = await audioAssetsApi.create({
        project_id: projectId,
        scene_id: scene.id,
        asset_type: 'mix',
        provider: 'silent',
        audio_url: null,
        prompt_used: 'Silent scene — no audio required.',
        duration: scene.duration_seconds ?? 6,
        approval_status: 'approved',
      });
      if (error) throw error;
      await audioQ.refetch();
      toast({ title: 'Scene approved as silent' });
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    }
  };

  const handleSaveAll = async () => {
    const missing = eligibleScenes.filter((s) => !(assetsByScene.get(s.id)?.length));
    if (missing.length === 0) {
      toast({ title: 'Nothing to save', description: 'Every eligible scene already has at least one audio asset.' });
      return;
    }
    setSavingAll(true);
    let ok = 0, fail = 0;
    try {
      for (const s of missing) {
        const mode = s.audio_mode || 'layered';
        const type = mode === 'rhyme_song' ? 'rhyme_song'
                    : mode === 'narration' ? 'narration'
                    : mode === 'dialogue' ? 'voice'
                    : 'mix';
        try {
          const { error } = await audioAssetsApi.create({
            project_id: projectId,
            scene_id: s.id,
            asset_type: type,
            provider: 'manual',
            audio_url: null,
            prompt_used: `Draft ${type} for scene ${s.scene_number}`,
            duration: s.duration_seconds ?? 6,
            approval_status: 'draft',
          });
          if (error) throw error;
          ok++;
        } catch { fail++; }
      }
      await audioQ.refetch();
      toast({
        title: fail ? `Saved ${ok}, ${fail} failed` : `Initialized ${ok} draft${ok === 1 ? '' : 's'}`,
        variant: fail ? 'destructive' : 'default',
      });
    } finally { setSavingAll(false); }
  };

  const showInitialLoader =
    !isReady ||
    (projectQ.isLoading && !projectQ.data) ||
    (scenesQ.isLoading && !scenesQ.data) ||
    (videosQ.isLoading && !videosQ.data) ||
    (audioQ.isLoading && !audioQ.data);

  if (showInitialLoader) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const anyError = projectQ.error || scenesQ.error || videosQ.error || audioQ.error;
  if (anyError) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <QueryErrorState
          title="Could not load Audio"
          message={anyError.message || 'Something went wrong.'}
          onRetry={refresh}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate(`/project/${projectId}`)}
            className="gap-1.5 text-muted-foreground hover:text-foreground mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Phase 5</p>
          <h1 className="text-xl font-semibold text-foreground truncate">
            {project?.title || 'Project'} · Audio / Sound
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create or approve voice, music, SFX, or rhyme/song audio before final export. No external APIs are called.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Approved Videos
          </Button>
          {eligibleScenes.length > 0 && (
            <Button size="sm" className="h-8 gap-1.5" disabled={savingAll} onClick={handleSaveAll}>
              {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save All
            </Button>
          )}
        </div>
      </div>

      {eligibleScenes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-10 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No approved videos yet</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Approve videos in the Animate phase before preparing audio.
          </p>
          <Button size="sm" onClick={() => navigate(`/project/${projectId}/animate`)} className="gap-1.5">
            Back to Animate <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {eligibleScenes.length} scene{eligibleScenes.length === 1 ? '' : 's'} with approved videos ·{' '}
              <span className={scenesWithApprovedAudio > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {scenesWithApprovedAudio > 0
                  ? `${scenesWithApprovedAudio} scene${scenesWithApprovedAudio === 1 ? '' : 's'} has approved audio ready for export`
                  : '0 approved scene audio — approve at least one to continue'}
              </span>
            </p>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              disabled={scenesWithApprovedAudio === 0}
              onClick={() => navigate(`/project/${projectId}`)}
              title={scenesWithApprovedAudio === 0 ? 'Approve at least one scene audio first' : 'Back to dashboard / export'}
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-3">
            {eligibleScenes.map((scene) => (
              <SceneAudioCard
                key={scene.id}
                scene={scene}
                video={approvedVideoByScene.get(scene.id)}
                sceneAssets={assetsByScene.get(scene.id) ?? []}
                onAddAsset={handleAddAsset}
                onApprove={handleApprove}
                onUnapprove={handleUnapprove}
                onDelete={handleDelete}
                onReplace={handleReplace}
                onMarkSilent={handleMarkSilent}
              />
            ))}
          </div>

          {/* Project Audio Library */}
          <div className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Project Audio Library</h2>
                <p className="text-[11px] text-muted-foreground">
                  All audio assets saved for this project ({assets.length}).
                </p>
              </div>
            </div>
            {assets.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No audio assets yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {ASSET_TYPES.map(({ key, label, icon: Icon }) => {
                  const items = assets.filter((a) => a.asset_type === key);
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className="rounded-lg border border-border/30 bg-background/30 p-2 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                        <Icon className="w-3.5 h-3.5 text-primary" /> {label} ({items.length})
                      </div>
                      <div className="space-y-1.5">
                        {items.map((a) => {
                          const sceneNum = allScenes.find((s) => s.id === a.scene_id)?.scene_number;
                          return (
                            <div key={a.id} className="text-[11px] flex items-center justify-between gap-2 bg-background/40 rounded px-2 py-1">
                              <div className="min-w-0 flex items-center gap-1.5">
                                {statusPill(a.approval_status)}
                                <span className="text-muted-foreground">
                                  {sceneNum ? `#${sceneNum}` : 'project'} · {a.provider || 'manual'}
                                </span>
                              </div>
                              {a.audio_url && (
                                <a href={a.audio_url} target="_blank" rel="noreferrer"
                                  className="text-primary underline truncate max-w-[140px]">
                                  preview
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
