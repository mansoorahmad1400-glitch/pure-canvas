// Lightweight CRUD helpers for the StudioOne v2 workflow tables.
// All queries are RLS-scoped to the current authenticated user.
import { supabase } from '@/integrations/supabase/client';

// ---------- projects ----------
export const projectsApi = {
  list: () =>
    supabase.from('projects').select('*').order('updated_at', { ascending: false }),
  get: (id) => supabase.from('projects').select('*').eq('id', id).maybeSingle(),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('projects')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
  },
  update: (id, patch) =>
    supabase.from('projects').update(patch).eq('id', id).select().single(),
  setPhase: (id, current_phase, progress) =>
    supabase.from('projects').update({ current_phase, progress }).eq('id', id),
  remove: (id) => supabase.from('projects').delete().eq('id', id),
};

// ---------- storyboard scenes ----------
export const scenesApi = {
  listByProject: (project_id) =>
    supabase
      .from('storyboard_scenes')
      .select('*')
      .eq('project_id', project_id)
      .order('scene_number', { ascending: true }),
  upsert: async (scene) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('storyboard_scenes')
      .upsert({ ...scene, user_id: user.id }, { onConflict: 'project_id,scene_number' })
      .select()
      .single();
  },
  update: (id, patch) =>
    supabase.from('storyboard_scenes').update(patch).eq('id', id).select().single(),
  remove: (id) => supabase.from('storyboard_scenes').delete().eq('id', id),
};

// ---------- characters ----------
export const charactersApi = {
  listByProject: (project_id) =>
    supabase
      .from('characters')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: true }),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('characters')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
  },
  update: (id, patch) =>
    supabase.from('characters').update(patch).eq('id', id).select().single(),
  approve: (id) =>
    supabase.from('characters').update({ approval_status: 'approved' }).eq('id', id),
  remove: (id) => supabase.from('characters').delete().eq('id', id),
};

// ---------- scene images ----------
export const sceneImagesApi = {
  listByProject: (project_id) =>
    supabase.from('scene_images').select('*').eq('project_id', project_id),
  listByScene: (scene_id) =>
    supabase.from('scene_images').select('*').eq('scene_id', scene_id),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('scene_images')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
  },
  approve: (id) =>
    supabase.from('scene_images').update({ approval_status: 'approved' }).eq('id', id).select().single(),
  unapprove: (id) =>
    supabase.from('scene_images').update({ approval_status: 'pending' }).eq('id', id).select().single(),
  update: (id, patch) =>
    supabase.from('scene_images').update(patch).eq('id', id).select().single(),
  remove: (id) => supabase.from('scene_images').delete().eq('id', id),
};

// ---------- scene videos ----------
export const sceneVideosApi = {
  listByProject: (project_id) =>
    supabase.from('scene_videos').select('*').eq('project_id', project_id),
  listByScene: (scene_id) =>
    supabase.from('scene_videos').select('*').eq('scene_id', scene_id),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('scene_videos')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
  },
  update: (id, patch) =>
    supabase.from('scene_videos').update(patch).eq('id', id).select().single(),
  approve: (id) =>
    supabase.from('scene_videos').update({ approval_status: 'approved' }).eq('id', id).select().single(),
  unapprove: (id) =>
    supabase.from('scene_videos').update({ approval_status: 'pending' }).eq('id', id).select().single(),
  remove: (id) => supabase.from('scene_videos').delete().eq('id', id),
};

// ---------- audio assets ----------
export const audioAssetsApi = {
  listByProject: (project_id) =>
    supabase
      .from('project_audio_assets')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('project_audio_assets')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();
  },
  approve: (id) =>
    supabase
      .from('project_audio_assets')
      .update({ approval_status: 'approved' })
      .eq('id', id),
  remove: (id) => supabase.from('project_audio_assets').delete().eq('id', id),
};

// ---------- final exports ----------
export const exportsApi = {
  listByProject: (project_id) =>
    supabase
      .from('final_exports')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }),
  latest: (project_id) =>
    supabase
      .from('final_exports')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return supabase
      .from('final_exports')
      .insert({ ...payload, user_id: user.id, status: 'queued' })
      .select()
      .single();
  },
  update: (id, patch) =>
    supabase.from('final_exports').update(patch).eq('id', id).select().single(),
};

// ---------- gating helpers ----------
/**
 * Build the list of scenes eligible for final export:
 * scenes that have at least one approved scene_video AND at least one
 * approved audio asset (scene-scoped or project-scoped mix).
 */
export async function getExportableSceneIds(project_id) {
  const [scenesRes, vidsRes, audioRes] = await Promise.all([
    scenesApi.listByProject(project_id),
    sceneVideosApi.listByProject(project_id),
    audioAssetsApi.listByProject(project_id),
  ]);
  const scenes = scenesRes.data ?? [];
  const vids = (vidsRes.data ?? []).filter((v) => v.approval_status === 'approved' && v.video_url);
  const audios = (audioRes.data ?? []).filter((a) => a.approval_status === 'approved' && a.audio_url);

  const projectMix = audios.find((a) => !a.scene_id);
  return scenes
    .filter((s) => {
      const hasVid = vids.some((v) => v.scene_id === s.id);
      const hasAudio = projectMix || audios.some((a) => a.scene_id === s.id);
      return hasVid && hasAudio;
    })
    .map((s) => s.id);
}

export const PHASES = ['storyboard', 'characters', 'images', 'animate', 'audio', 'export'];
