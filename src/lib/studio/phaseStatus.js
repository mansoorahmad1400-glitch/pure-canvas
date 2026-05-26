// Central helper for computing project phase status, current phase, and
// progress percentage from real Supabase records. Used by Projects list and
// ProjectDashboard so both views stay in sync.
import {
  projectsApi,
  scenesApi,
  charactersApi,
  sceneImagesApi,
  sceneVideosApi,
  audioAssetsApi,
  exportsApi,
} from './api';

export const PHASE_ORDER = ['storyboard', 'characters', 'images', 'animate', 'audio', 'export'];

// Map: phase complete -> progress percent. Export ready_for_render = 90%,
// only a real final_video_url pushes us to 100%.
const PROGRESS_TABLE = {
  none: 0,
  storyboard: 16,
  characters: 33,
  images: 50,
  animate: 66,
  audio: 83,
  export_ready: 90,
  export_complete: 100,
};

function isSceneVisualReady(s) {
  if (!s) return false;
  if (s.visual_status === 'approved') return true;
  return !!(s.story_text || s.image_prompt || s.environment_description || (s.characters && s.characters.length));
}
function isSceneAudioReady(s) {
  if (!s) return false;
  if (s.audio_status === 'approved') return true;
  if (s.audio_mode === 'silent') return true;
  return !!(s.dialogue_text || s.narration_text || s.rhyme_lyrics || s.background_music_prompt || s.sfx_prompt);
}

/**
 * Pure function: given raw arrays, returns full phase summary.
 */
export function computePhaseStatus({ scenes = [], characters = [], images = [], videos = [], audio = [], exportRow = null }) {
  const storyboard =
    scenes.length > 0 &&
    scenes.some((s) => isSceneVisualReady(s) && isSceneAudioReady(s));

  const charactersDone =
    characters.length > 0 && characters.some((c) => c.approval_status === 'approved');

  const imagesDone = images.some((i) => i.approval_status === 'approved');
  const animateDone = videos.some((v) => v.approval_status === 'approved' && v.video_url);

  const approvedVideoSceneIds = new Set(
    videos.filter((v) => v.approval_status === 'approved' && v.video_url).map((v) => v.scene_id)
  );
  const approvedAudioSceneIds = new Set(
    audio.filter((a) => a.approval_status === 'approved' && a.scene_id).map((a) => a.scene_id)
  );
  const silentSceneIds = new Set(
    scenes.filter((s) => s.audio_mode === 'silent').map((s) => s.id)
  );
  const audioDone = [...approvedVideoSceneIds].some(
    (sid) => approvedAudioSceneIds.has(sid) || silentSceneIds.has(sid)
  );

  const hasManifest = !!(exportRow && exportRow.export_manifest);
  const manifestScenes = hasManifest
    ? (exportRow.export_manifest.scenes ?? exportRow.approved_scene_ids ?? [])
    : [];
  const exportReady =
    !!exportRow &&
    exportRow.status === 'ready_for_render' &&
    hasManifest &&
    (Array.isArray(manifestScenes) ? manifestScenes.length > 0 : true);
  const exportComplete = !!(exportRow && exportRow.final_video_url);

  const phases = {
    storyboard,
    characters: charactersDone,
    images: imagesDone,
    animate: animateDone,
    audio: audioDone,
    export: exportReady || exportComplete,
  };

  // Current phase = first incomplete; if all done -> export (or complete).
  let currentPhase = 'storyboard';
  for (const p of PHASE_ORDER) {
    if (!phases[p]) {
      currentPhase = p;
      break;
    }
    currentPhase = p;
  }
  if (exportComplete) currentPhase = 'complete';
  else if (exportReady) currentPhase = 'export';

  let progress = PROGRESS_TABLE.none;
  if (storyboard) progress = PROGRESS_TABLE.storyboard;
  if (charactersDone) progress = PROGRESS_TABLE.characters;
  if (imagesDone) progress = PROGRESS_TABLE.images;
  if (animateDone) progress = PROGRESS_TABLE.animate;
  if (audioDone) progress = PROGRESS_TABLE.audio;
  if (exportReady) progress = PROGRESS_TABLE.export_ready;
  if (exportComplete) progress = PROGRESS_TABLE.export_complete;

  let status = 'draft';
  if (exportComplete) status = 'completed';
  else if (storyboard || charactersDone || imagesDone || animateDone || audioDone || exportReady) {
    status = 'in_progress';
  }

  return {
    phases,
    currentPhase,
    progress,
    status,
    exportReady,
    exportComplete,
  };
}

/**
 * Fetch all phase data for a project and compute the summary.
 * Safe: returns a default empty summary on failure.
 */
export async function getProjectPhaseSummary(projectId) {
  try {
    const [s, c, im, vd, au, ex] = await Promise.all([
      scenesApi.listByProject(projectId),
      charactersApi.listByProject(projectId),
      sceneImagesApi.listByProject(projectId),
      sceneVideosApi.listByProject(projectId),
      audioAssetsApi.listByProject(projectId),
      exportsApi.latest(projectId),
    ]);
    return {
      raw: {
        scenes: s.data ?? [],
        characters: c.data ?? [],
        images: im.data ?? [],
        videos: vd.data ?? [],
        audio: au.data ?? [],
        exportRow: ex.data ?? null,
      },
      summary: computePhaseStatus({
        scenes: s.data ?? [],
        characters: c.data ?? [],
        images: im.data ?? [],
        videos: vd.data ?? [],
        audio: au.data ?? [],
        exportRow: ex.data ?? null,
      }),
    };
  } catch (err) {
    console.error('[getProjectPhaseSummary] failed', err);
    return {
      raw: { scenes: [], characters: [], images: [], videos: [], audio: [], exportRow: null },
      summary: computePhaseStatus({}),
      error: err,
    };
  }
}

/**
 * Best-effort sync of computed values onto the projects table.
 * Silent on failure (UI never blocks on this).
 */
export async function syncProjectSummary(projectId, summary, prev = {}) {
  try {
    const patch = {};
    if (Math.round(prev.progress ?? -1) !== summary.progress) patch.progress = summary.progress;
    if ((prev.current_phase ?? '') !== summary.currentPhase) patch.current_phase = summary.currentPhase;
    if ((prev.status ?? '') !== summary.status) patch.status = summary.status;
    if (Object.keys(patch).length === 0) return;
    await projectsApi.update(projectId, patch);
  } catch (err) {
    console.warn('[syncProjectSummary] non-fatal', err);
  }
}
