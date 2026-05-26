// Project Asset Storage helpers.
//
// All uploads go to the `studioone-assets` bucket under:
//   projects/{project_id}/{images|videos|audio|exports}/{safe_filename}
//
// Each upload also writes a row to the `project_assets` table so we have a
// central library and can safely delete files when the user removes assets.
//
// IMPORTANT: this layer never calls external AI providers. It is purely:
//   - Supabase Storage upload
//   - Supabase Postgres row insert
//
// Storage policies are currently dev-safe (any signed-in user). The
// project_assets table itself is owner-scoped via RLS.
import { supabase } from '@/integrations/supabase/client';

export const BUCKET = 'studioone-assets';

export const ASSET_KIND = {
  image:  { folder: 'images',  table_provider: 'manual_upload' },
  video:  { folder: 'videos',  table_provider: 'manual_upload' },
  audio:  { folder: 'audio',   table_provider: 'manual_upload' },
  export: { folder: 'exports', table_provider: 'manual_upload' },
  other:  { folder: 'other',   table_provider: 'manual_upload' },
};

export const ACCEPT = {
  image: 'image/png,image/jpeg,image/jpg,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/x-m4a,audio/mp4,audio/ogg',
};

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]+/g;
function sanitizeName(name) {
  return (name || 'file')
    .normalize('NFKD')
    .replace(/\s+/g, '-')
    .replace(SAFE_NAME_RE, '')
    .slice(0, 80) || 'file';
}
function uniqueFileName(originalName) {
  const safe = sanitizeName(originalName);
  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const ext  = dot > 0 ? safe.slice(dot)    : '';
  const stamp = Date.now().toString(36);
  const rand  = Math.random().toString(36).slice(2, 8);
  return `${base}-${stamp}-${rand}${ext}`;
}

async function probeMedia(file, kind) {
  if (typeof window === 'undefined') return {};
  try {
    if (kind === 'image') {
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        return { width: img.naturalWidth, height: img.naturalHeight };
      } finally { URL.revokeObjectURL(url); }
    }
    if (kind === 'video' || kind === 'audio') {
      const url = URL.createObjectURL(file);
      try {
        const el = document.createElement(kind === 'video' ? 'video' : 'audio');
        el.preload = 'metadata';
        const meta = await new Promise((res, rej) => {
          el.onloadedmetadata = () => res(el);
          el.onerror = rej;
          el.src = url;
        });
        const out = { duration_seconds: Number(meta.duration) || null };
        if (kind === 'video') {
          out.width = meta.videoWidth || null;
          out.height = meta.videoHeight || null;
        }
        return out;
      } catch { return {}; }
      finally { URL.revokeObjectURL(url); }
    }
  } catch { /* ignore */ }
  return {};
}

/**
 * Upload a File to Supabase Storage and create a project_assets record.
 *
 * @param {Object} args
 * @param {string} args.projectId
 * @param {File}   args.file
 * @param {'image'|'video'|'audio'|'export'|'other'} args.kind
 * @param {string} [args.assetRole]  e.g. 'scene_image', 'voice', 'music'
 * @param {string} [args.sceneId]
 * @returns {Promise<{publicUrl: string, asset: object, path: string}>}
 */
export async function uploadProjectAsset({ projectId, file, kind, assetRole, sceneId }) {
  if (!projectId) throw new Error('Missing projectId');
  if (!file)      throw new Error('No file selected');
  const cfg = ASSET_KIND[kind];
  if (!cfg) throw new Error(`Unsupported asset kind: ${kind}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const fileName = uniqueFileName(file.name);
  const path     = `projects/${projectId}/${cfg.folder}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = pub?.publicUrl ?? null;

  const probed = await probeMedia(file, kind);

  const row = {
    project_id: projectId,
    user_id: user.id,
    scene_id: sceneId ?? null,
    asset_type: kind,
    asset_role: assetRole ?? null,
    file_name: file.name,
    file_path: path,
    public_url: publicUrl,
    mime_type: file.type || null,
    file_size: file.size ?? null,
    duration_seconds: probed.duration_seconds ?? null,
    width: probed.width ?? null,
    height: probed.height ?? null,
    provider: cfg.table_provider,
    approval_status: 'draft',
  };
  const { data: asset, error: insErr } = await supabase
    .from('project_assets').insert(row).select().single();
  if (insErr) {
    // Best-effort cleanup: remove uploaded file if DB insert failed.
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw insErr;
  }

  return { publicUrl, asset, path };
}

export async function deleteProjectAsset(asset) {
  if (!asset?.id) return;
  // Remove storage file first (best effort).
  if (asset.file_path) {
    try { await supabase.storage.from(BUCKET).remove([asset.file_path]); }
    catch { /* surface as warning at caller */ }
  }
  const { error } = await supabase.from('project_assets').delete().eq('id', asset.id);
  if (error) throw error;
}

export const projectAssetsApi = {
  listByProject: (project_id) =>
    supabase
      .from('project_assets')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false }),
  update: (id, patch) =>
    supabase.from('project_assets').update(patch).eq('id', id).select().single(),
  approve: (id) =>
    supabase.from('project_assets').update({ approval_status: 'approved' }).eq('id', id),
  unapprove: (id) =>
    supabase.from('project_assets').update({ approval_status: 'draft' }).eq('id', id),
};
