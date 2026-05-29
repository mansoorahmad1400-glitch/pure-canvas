# Step 10.1 — Expose uploaded assets inside phase workflow

## Inspection summary

- Storage, `project_assets` table, `AssetUploadButton`, `ProjectAssets` page, and the dashboard "Asset Library" link are already in place and working.
- Images / Animate / Audio phases already include `AssetUploadButton` for upload-then-attach in one click — but there is **no way to reuse an asset that was uploaded earlier** (from the library, or from another scene) without re-uploading it.
- This is the only meaningful gap for Step 10.1. Everything else the spec asks for (visibility, manual approval, preview/download/delete, persistence) already exists in the `ProjectAssets` page and the phase upload flow.

## What I'll add

A single new component plus a button in each phase. No DB changes, no storage changes, no API changes, no external calls.

### 1. `src/components/studio/AssetLibraryPicker.jsx` (new)

Reusable trigger + Dialog. Props:
- `projectId`, `kind` (`'image' | 'video' | 'audio'`), optional `sceneId`, `assetRole`, `label`, `onPick({ publicUrl, asset })`.

Behavior:
- Queries `project_assets` filtered by `project_id` and `asset_type === kind` (uses existing `projectAssetsApi.listByProject` in `src/lib/studio/assetStorage.js`, then filters client-side — no new query needed).
- Renders a grid of cards: thumbnail / `<video preload="metadata">` / `<audio>` preview, file name, approval status pill, role hint, "Use this" button.
- Empty state points the user to the upload button or the Asset Library page.
- Selecting an item calls `onPick({ publicUrl, asset })` and closes the dialog. No mutation happens inside the picker — the phase decides how to attach.

### 2. Wire the picker into each phase (next to the existing `AssetUploadButton`)

- **`src/pages/ImagesPhase.jsx`** — `SceneImageCard`: pick image asset → call existing `onSaveRecord({ scene_id, prompt_used, image_url: publicUrl, provider: 'manual_upload' })` and set local preview. Mirrors the current `AssetUploadButton.onUploaded` handler.
- **`src/pages/AnimatePhase.jsx`** — `SceneVideoCard`: pick video asset → call existing `onSaveRecord` with `video_url: publicUrl, provider: 'manual_upload', duration_seconds: asset.duration_seconds ?? scene.duration_seconds ?? 6`.
- **`src/pages/AudioPhase.jsx`** — `SceneAudioCard`: for each audio slot (voice / music / sfx / rhyme_song) add a small "Library" button beside the existing Upload/URL/Mock buttons → call existing `onAddAsset({ scene_id, asset_type: type, provider: 'manual_upload', audio_url: publicUrl, ... })`.

In each case the picker reuses the phase's existing upsert/insert function — same persistence path as upload — so records survive refresh exactly like today.

### 3. Dashboard

No change. The "Asset Library" link is already present.

## Out of scope (explicitly not touched)

- Supabase Storage bucket, RLS, `project_assets` schema, `AssetUploadButton`, `ProjectAssets` page, routing, progress sync, mock/manual approval flow, project creation, storyboard, characters, export, billing.
- No external AI / paid providers / FFmpeg / generation calls.

## Verification

- Build check.
- Smoke-test routes: `/home`, `/projects`, `/project/:id`, `/project/:id/assets`, `/project/:id/images`, `/project/:id/animate`, `/project/:id/audio`, `/project/:id/export`.
- Confirm: upload an image in Images phase → open another scene → "Pick from Library" shows it → selecting it attaches the same public URL → refresh page → attachment persists (because the underlying `scene_images` / `scene_videos` / `project_audio_assets` rows are written exactly the same way as the upload path already does).
