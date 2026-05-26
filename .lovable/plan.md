# StudioOne AI — Base44 → Lovable Migration Plan

Goal: rebuild StudioOne AI in Lovable with a simple, linear, user-friendly 6-phase workflow, reusing only what's healthy from the Base44 export and rewriting the broken final-export pipeline as a real backend MP4 render.

Nothing is implemented yet — this plan is the deliverable.

---

## 1. App Architecture Plan

User flow (strictly linear, gated by approvals):

```
Home → Projects → Project Dashboard
   └─► Phase 1 Storyboard (Visual + Audio per scene)
       └─► Phase 2 Characters
           └─► Phase 3 Images
               └─► Phase 4 Animate
                   └─► Phase 5 Audio / Sound
                       └─► Phase 6 Final Export (real MP4)
```

Principles:
- One `ProjectLayout` with phase sidebar + progress bar; each phase is its own route.
- Each phase has a `PhaseGate` that requires ≥1 approved item from the previous phase.
- Removed from user flow: Location/World, Roadmap, separate Admin tabs, the legacy "ProductionStudio" mega-page, GenerateBlueprint, VideoDiagnosticReport. World/location stays as a backend-only consistency helper.
- Auth: Supabase only. All Base44 SDK usage (`@base44/sdk`, `base44.auth.*`) is removed.
- AI: Lovable AI Gateway (`LOVABLE_API_KEY`) for text, prompts, image and video generation models that it supports. SunoAPI only for rhyme/song projects (user-provided secret).

---

## 2. Database / Schema Plan

The existing tables in Lovable Cloud already cover most needs. Changes:

**Project** — add:
- `current_phase` text default `'storyboard'`
- `export_status` text default `'idle'` (`idle|rendering|ready|failed`)
- `export_url` text
- `style_mode` text (`cartoon|photoreal`) — auto-derived from `project_type`

**ProjectCharacter** — add:
- `approved` boolean default false
- `style_preset` text (cartoon/photoreal/etc.)
- `user_uploaded` boolean default false

**GeneratedImage** — already has `approved`, `scene_number`. Add:
- `source_character_ids` uuid[] (refs used)

**VideoJob** — already has `approved`, `scene_number`, `video_url`. No structural change; ensure `source_image_id` text is populated.

**New: SceneAudio** (replaces ad-hoc AudioJob usage for Phase 1 authoring)
- `project_id`, `scene_number`, `dialogue`, `narration`, `lyrics`, `music_prompt`, `sfx_prompt`, `voice_style`, `timing_seconds`, `dialogue_url`, `narration_url`, `music_url`, `sfx_url`, `approved`, standard audit columns.

**Keep AudioJob** as the per-generation job log (provider, status, gems). Library view reads from SceneAudio + AudioJob.

**New: SongJob** (rhyme/song only)
- `project_id`, `lyrics`, `style`, `provider` (`suno`), `status`, `audio_url`, `duration`, `error_message`.

**New: ExportArtifact** (replaces broken RenderJob/finalExportMP4)
- `project_id`, `status` (`queued|rendering|ready|failed`), `mp4_url`, `scenes_included` int[], `duration_seconds`, `error_message`, `created_by_id`.

**Drop from user flow (keep tables for now, no UI):** WorldLocation, RenderJob (legacy), StoryboardScene (legacy single-card). Canonical Phase-1 record is `StoryboardDirectorScene` extended with the Visual/Audio fields below.

**StoryboardDirectorScene** — add fields to match the required Visual + Audio split:
- Visual: `scene_title`, `environment`, `image_prompt` (rename of visual_prompt OK), `animation_prompt` (rename of motion_prompt OK), keep `camera_direction`, `transition_type`, `detected_characters`.
- Audio is stored in the new `SceneAudio` row keyed by `(project_id, scene_number)`.

All new tables: RLS via `created_by_id = auth.uid()` + `set_updated_date()` trigger (pattern already in project).

---

## 3. Page / Component Map

Routes (all under `AppLayout`, auth-gated where noted):

| Route | Page | Notes |
|---|---|---|
| `/login` | `Login` | Supabase email + Google |
| `/` | `Home` | Marketing/landing |
| `/projects` | `Projects` | List + New Project modal |
| `/project/:id` | `ProjectDashboard` *(new)* | Phase cards + progress |
| `/project/:id/storyboard` | `PhaseStoryboard` | Visual + Audio cards per scene |
| `/project/:id/characters` | `PhaseCharacters` | Generate / approve / upload |
| `/project/:id/images` | `PhaseImages` | Per-scene image gen |
| `/project/:id/animate` | `PhaseAnimate` | Per-scene video gen |
| `/project/:id/audio` | `PhaseAudio` | Layered audio or Suno song |
| `/project/:id/export` | `PhaseExport` | Render + preview + download |
| `/account`, `/upgrade`, `/admin`, `/privacy`, `/terms`, `/tutorial` | reused | |

Shared components (new or refactored):
- `ProjectLayout`, `PhaseSidebar`, `PhaseProgressBar`, `PhaseGate`
- `SceneRow` containing `VisualSceneCard` + `AudioSceneCard`
- `CharacterCard` (approve / edit / regenerate / upload)
- `SceneImageCard`, `SceneVideoCard`
- `SceneAudioPanel`, `SongPanel`, `AudioLibrary`
- `ExportPanel` (status, scene checklist, preview `<video>`, download)

---

## 4. API / Edge Function Map

New / rewritten edge functions (all use Lovable AI Gateway unless noted):

| Function | Purpose | Replaces |
|---|---|---|
| `storyboard-generate` | Draft scenes (Visual + Audio fields) from idea | `generateBlueprint`, `storyboardDirector` |
| `scene-update` | Save edits, recompute approvals | `sceneEditor` |
| `character-generate` | Generate refs in cartoon or photoreal style | `characterHub`, `characterRefGeneration` |
| `image-generate` | Per-scene image using approved characters | `imageGeneration`, `storyboardImage` |
| `video-generate` | Per-scene animation from approved image | `videoPipeline` |
| `audio-generate` | TTS (dialogue/narration) + music + SFX layers | `audioPipeline` |
| `song-generate` + `song-callback` | SunoAPI rhyme/song flow | `audioPipeline` (partial), `suno_callback` |
| `export-render` | **Real** server-side ffmpeg mux of approved video+audio → MP4 | `finalExportMP4`, `renderPipeline`, `exportPipeline` |
| `gem-ledger` | Deduct/refund gems | reuse logic from `gemLedger` |

Secrets needed: `LOVABLE_API_KEY` (present), `SUNO_API_KEY` (new, only when user enables song projects).

Note on `export-render`: runs as an async job, writes MP4 to Supabase Storage bucket `exports/`, updates `ExportArtifact.status`. Uses an ffmpeg-capable runtime (Deno + ffmpeg via wasm or a fly/worker — to be decided in build step; the contract is: input = ordered list of approved {video_url, audio_url, duration}, output = single H.264/AAC MP4 URL).

---

## 5. What Code Can Be Reused

- All shadcn `src/components/ui/*`
- `src/components/layout/AppLayout.jsx`, MobileHeader, LanguageSwitcher
- `src/lib/i18n.js`, locales, `query-client.js`, `utils.js`, `scriptStyleResolver.js`
- `src/pages/Home.jsx`, `Projects.jsx`, `Account.jsx`, `Upgrade.jsx`, `PrivacyPolicy.jsx`, `TermsAndConditions.jsx`, `Tutorial.jsx`, `GemHistory.jsx` (after swapping base44 calls for supabase)
- `src/components/studio/PhaseCard.jsx`, `PhaseProgressBar.jsx`, `PhaseWorkspace.jsx`
- Visual shells of `storyboard/*`, `characters/CharacterCard`, `images/ImageCard`, `video/SceneAnimationCard`, `audio/AudioJobCard` (markup + styling kept, data layer rewritten)
- Gem ledger logic from `base44/functions/gemLedger` (port to edge function)
- Admin analytics UI (low priority, port later)

---

## 6. What Must Be Rewritten (do NOT copy as-is)

- **Final export pipeline** — `finalExportMP4`, `renderPipeline`, any browser/canvas/MediaRecorder code. These produced placeholder/WebM/frozen/audio-only files. Replace with backend ffmpeg mux + `ExportArtifact`.
- **Auth layer** — `src/api/base44Client.js`, `src/lib/AuthContext.jsx`, `src/hooks/useCurrentUser.js`, `src/components/UserNotRegisteredError.jsx`, every `base44.entities.*` and `base44.auth.*` call. Replace with Supabase client + a `useCurrentUser` hook backed by the `User` table.
- **ProductionStudio mega-page** — replace with `ProjectDashboard` + per-phase routes.
- **Storyboard data model** — collapse `StoryboardScene` + `StoryboardDirectorScene` into one Phase-1 record (Director scene) + new `SceneAudio` sibling.
- **Audio pipeline** — split into normal layered flow vs. Suno song flow; drop `audioTimelineSync` browser hacks.
- **Export UI** (`ExportWorkspace`, `ExportTimeline`, `ExportDownloadCenter`) — rebuild as a single `ExportPanel` reading `ExportArtifact`.
- **World/Location UI** — remove from user flow; backend-only.
- **Admin reset / stripe webhook / checkout** — defer; not part of core rebuild.

---

## 7. Step-by-Step Migration Order

1. **Unblock preview** — rewrite `src/lib/AuthContext.jsx` and `src/hooks/useCurrentUser.js` to use Supabase; delete `src/api/base44Client.js` imports from active code paths. Remove base44 from `package.json`.
2. **Schema migration** — apply the additions in §2 (Project columns, Character columns, SceneAudio, SongJob, ExportArtifact, GeneratedImage.source_character_ids). RLS + triggers.
3. **Project shell** — `ProjectLayout`, `PhaseSidebar`, `PhaseProgressBar`, `PhaseGate`, new `ProjectDashboard` route. Wire `current_phase`.
4. **Phase 1 Storyboard** — `storyboard-generate` edge function + `PhaseStoryboard` page with `VisualSceneCard` + `AudioSceneCard`, save/approve.
5. **Phase 2 Characters** — `character-generate` (style auto from project_type) + approve/upload/regenerate.
6. **Phase 3 Images** — `image-generate` using approved characters + scene image card.
7. **Phase 4 Animate** — `video-generate` from approved images; only approved videos pass forward.
8. **Phase 5 Audio** — `audio-generate` layered flow; for rhyme/song projects, request `SUNO_API_KEY` secret and wire `song-generate` + `song-callback`. Build `AudioLibrary` (preview/approve/delete/download/replace/regenerate).
9. **Phase 6 Export** — `export-render` edge function (ffmpeg mux of approved video+audio only), `exports/` storage bucket, `ExportPanel` with status polling, preview `<video>`, download. Validate MP4 plays with motion + sound before marking ready.
10. **Cleanup** — delete legacy pages (`ProductionStudio`, `GenerateBlueprint`, `VideoDiagnosticReport`, `Storyboard` standalone), legacy components (`ExportWorkspace`, world/*), legacy entities folder. Update routes.

Each step ends with a working preview; we do not merge a phase until its gate + approval cycle works end-to-end.

---

### Open question before build
Phase 5 song flow needs **SunoAPI**. When we reach step 8, I'll request `SUNO_API_KEY` via the secrets tool. OK to defer that until then?

Switch to build mode when you're ready and I'll start at Step 1 (unblock preview).