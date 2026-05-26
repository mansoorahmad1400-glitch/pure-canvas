## Step 7 — Animate Phase UI

Build a real Animate workspace mirroring the Images phase pattern, gated on approved images, with mock/manual video support and a true completion rule. No external APIs.

### 1. Database migration (`scene_videos`)
Add nullable fields needed by the new UI (existing `duration` numeric kept for compatibility):
- `image_id uuid` — links the source approved scene image
- `prompt_used text` — animation prompt
- `duration_seconds integer default 6` — canonical duration field going forward
- `notes text` — free-form notes (parity with `scene_images`)

RLS already correct; no policy changes.

### 2. API helpers (`src/lib/studio/api.js`)
Extend `sceneVideosApi` with `update`, `unapprove`, `remove`, and make `approve`/`create` return single records (parity with `sceneImagesApi`).

### 3. Routing (`src/App.jsx`)
Register a new lazy route `/project/:id/animate` → `AnimatePhase`, placed before the `:phase` placeholder fallback so the "coming soon / Mark Complete" placeholder no longer renders for Animate.

### 4. New page `src/pages/AnimatePhase.jsx`
Structure mirrors `ImagesPhase.jsx`:

- **Header**: project title, "Animate" heading, helper text, Back to Dashboard, Refresh, Save All.
- **Gating**: list only scenes that have an approved record in `scene_images` (join in memory via `scene_id`). If none → empty state "No approved images yet…" + "Back to Images" button.
- **Per-scene card** (`SceneVideoCard`):
  - Left: approved image preview, scene #, title, `duration_seconds`, transition + camera chips, status badge (Missing/Draft/Approved).
  - Right: editable Animation Prompt (textarea), buttons: Edit/Save Prompt, Add Video URL, Use Mock Video Placeholder, Approve, Unapprove, Delete.
- **buildDefaultAnimationPrompt()** combines, in order:
  `scene.animation_prompt`, `scene.camera_direction`, `scene.transition_to_next`, `scene.story_text`, `scene.environment_description`, approved image `prompt_used`, `project.style`, `duration_seconds`.
  For project_type in {story, fairy_tale, fantasy, kids, cartoon}, append a cartoon/cinematic family-friendly suffix instead of realistic defaults (reuses/extends `defaultStyleFor` from `characterExtractor`).
- **Mock placeholder**: store `video_url = 'https://placehold.co/1280x720/0f172a/e2e8f0?text=Scene+Video'`, `provider = 'mock'`. No video element required — show a styled placeholder card with the image as poster and a "Mock video" label.
- **Manual URL**: store as-is, `provider = 'manual'`. Render `<video>` if URL ends in mp4/webm/mov, otherwise show link + poster image.
- **Save All**: initialize draft `scene_videos` rows for every approved image without an existing video record (uses default prompt). Shows "Saving / Saved X / No unsaved changes" feedback like Images.
- **Approval rule** (client-side guard + disabled buttons):
  approve only when scene exists, approved image exists, `(video_url || provider === 'mock')`, and `prompt_used` non-empty. Otherwise the Approve button is disabled with a tooltip explaining why.
- **Stability**: `useAuthReady` gating, `QueryErrorState` with retry, try/catch/finally around every async action, dismissible toasts via existing toaster.

### 5. Completion rule
The Animate page does **not** render `PhaseWorkspace`'s placeholder footer. Instead it shows its own status strip:
- "0 approved videos — approve at least one to continue" (Mark Complete + Next disabled).
- "N approved videos ready for Audio" — enables a single `Continue to Audio →` button that navigates to `/project/:id/audio`. No "Mark Complete" needed; `computePhaseStatus` in `ProjectDashboard` already derives `animate` completion from approved videos, so the dashboard reflects state automatically.

### 6. Preserved / untouched
Auth, dev access, project creation, dashboard, storyboard, characters, images page logic (read-only here), audio, export, billing, providers, secrets — all left as-is. No location phase. `PhasePlaceholder` still serves audio/export until their steps.

### Acceptance check
After implementation: open `/project/:id/animate` → see real workspace, no "coming soon"; only scenes with approved images appear; can edit prompt, add URL, add mock, approve/unapprove/delete; rows persist in `scene_videos` and survive refresh; Continue to Audio only enabled after ≥1 approved video; dashboard's Animate card flips to complete based on Supabase data; no API/billing calls.
