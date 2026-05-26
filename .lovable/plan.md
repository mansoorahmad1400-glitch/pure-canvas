## Step 9 — Final Export Phase (safe, no real MP4)

Goal: ship a working Export page that collects approved scenes, shows a validated timeline preview, and saves a manifest — with zero fake renders and no paid APIs.

### 1. Database migration (additive only)
Add safe fields to existing `final_exports` table:
- `export_manifest jsonb` — full timeline snapshot
- `validation_notes text` — already exists, keep
- `approved_scene_ids uuid[]` — already exists, keep
- `preview_video_url text` nullable — already exists
- `final_video_url text` nullable — already exists, never populate in this step
- `status text` — extend allowed values to include `ready_for_render`

No drops, no renames. Existing rows preserved.

### 2. API layer — `src/lib/studio/api.js`
Add `finalExportsApi`:
- `getByProject(projectId)` — return latest manifest row
- `saveManifest(projectId, manifest, status, validationNotes, approvedSceneIds)` — upsert one row per project
- `markReadyForRender(projectId)` — sets `status = 'ready_for_render'`

### 3. New page — `src/pages/ExportPhase.jsx`
Route registered in `App.jsx` at `/project/:id/export` BEFORE the catch-all phase placeholder, lazy-loaded like the other phases.

Page sections:
1. **Header** — project title, "Final Export" heading, helper text, Back to Dashboard, Refresh Approved Assets, Save Export Manifest, Ready for Render.
2. **Readiness banner** — Ready / Not Ready, counts (included / excluded).
3. **Included Timeline** — list of qualifying scenes with scene number, title, duration, video preview (or mock placeholder), audio summary chip (voice/music/SFX/mix/rhyme/silent), Ready badge.
4. **Excluded Scenes** — collapsible, each with explicit reason: no approved video / no approved audio / storyboard not approved / image not approved / deleted-invalid.
5. **Preview Player** — sequential per-scene playback of approved videos with the chosen audio asset; clearly labeled "Preview only — not a final MP4 render." No MediaRecorder, no canvas export.
6. **Future renderer note** — small info block explaining backend MP4 renderer comes later.

### 4. Inclusion rules (computed client-side)
A scene is included only when ALL are true:
- `storyboard_scenes` row exists, not soft-deleted
- has at least one approved `scene_images` row (approval_status = 'approved')
- has at least one approved `scene_videos` row
- has at least one approved `project_audio_assets` row OR `storyboard_scenes.audio_mode = 'silent'` with audio approved-silent marker

Excluded scenes are listed with the first failing reason.

### 5. Manifest shape (saved to `final_exports.export_manifest`)
```
{
  project_id,
  generated_at,
  scenes: [
    { scene_id, scene_number, duration_seconds, video_url,
      audio_asset_ids: [...], audio_url, audio_mode }
  ],
  excluded: [ { scene_id, scene_number, reason } ],
  status: "ready_for_render" | "not_ready",
  validation_notes
}
```

### 6. Buttons / actions
- **Save Export Manifest** — writes/updates the row; toast confirmation.
- **Ready for Render** — only enabled when ≥1 included scene; sets status `ready_for_render`.
- **(No) Generate MP4** — replaced by an informational block. If user clicks Ready before any approved scenes exist, show friendly message; never disable the page.

### 7. Dashboard integration
`ProjectDashboard.jsx` — update `computePhaseStatus` for the Export phase:
- `ready_for_render` ⇒ phase shows "Ready for Render" (not complete)
- `final_video_url` populated ⇒ complete (deferred to future renderer step)

### 8. Stability
- React Query for loads with `loading / empty / error / retry` states
- All async wrapped in try/catch/finally so loading always clears
- No external API calls, no secrets, no gems/paywall logic

### Files
- `supabase/migrations/<ts>_final_exports_manifest.sql` — add `export_manifest jsonb`
- `src/lib/studio/api.js` — add `finalExportsApi`
- `src/pages/ExportPhase.jsx` — new page
- `src/App.jsx` — register `/project/:id/export` route
- `src/pages/ProjectDashboard.jsx` — recognize `ready_for_render` status

### Out of scope (explicit)
- No FFmpeg, no cloud render, no MediaRecorder, no canvas export
- No real MP4 produced, no `final_video_url` written
- No changes to auth, admin, Storyboard, Characters, Images, Animate, Audio logic, or preview/resume fixes