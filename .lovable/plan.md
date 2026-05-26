# Step 4: Storyboard Phase Editor

Build the Storyboard editor as Phase 1 of the simplified StudioOne workflow. Scope is strictly UI + CRUD against the existing `storyboard_scenes` table. No generation, no API integrations, no other phases.

## Files

**New**
- `src/pages/StoryboardPhase.jsx` — page shell (header, helper, Back/Save/Add Scene, empty state, scene list)
- `src/components/storyboard/SceneEditorCard.jsx` — collapsible scene card with Visual/Audio tabs, reorder/duplicate/delete/approve
- `src/components/storyboard/VisualSectionForm.jsx` — Visual fields
- `src/components/storyboard/AudioSectionForm.jsx` — Audio fields + mode-driven defaults

**Edited**
- `src/App.jsx` — route `/project/:id/storyboard` → `StoryboardPhase` (currently goes to `PhasePlaceholder`)
- `src/lib/studio/api.js` — add `scenesApi.listByProject` sort already correct; add small helpers: `nextSceneNumber`, `duplicateScene`, `reorderScenes` (bulk update scene_number)

No DB migration — `storyboard_scenes` already has all required columns. We'll use existing `visual_status` ('draft'|'ready'), `audio_status` ('draft'|'ready'), and add a derived `approval_status` stored in `visual_status`+`audio_status` both = `'approved'` (kept simple — no schema change).

## Page layout (`StoryboardPhase.jsx`)

```
[← Back to Dashboard]   {Project Title}        [Save All] [+ Add Scene]
Storyboard
Plan each scene before generating characters, images, animation, and audio.

[Scene 1 card]
[Scene 2 card]
...
(or empty state: "No scenes yet. Add your first scene to begin your storyboard.")
```

- Loads project + scenes via React Query.
- Local dirty-state map; "Save All" persists changed scenes; per-card auto "Saved ✓" indicator after save.
- "Add Scene" inserts a new draft scene with next `scene_number`, default `duration=6`, defaults pulled from project type (see §Project type defaults).

## Scene card (`SceneEditorCard.jsx`)

Header row:
- `Scene {n}` badge · Title input · Duration (sec, default 6) · Status pill (Draft/Ready/Approved)
- Actions: ↑ ↓ · Duplicate · Delete · Collapse/Expand

Body (when expanded): Tabs `Visual | Audio` using existing shadcn `Tabs`.

Footer: `Approve Storyboard Scene` button — disabled unless approval rule passes (see §Approval rule). When approved, both `visual_status` and `audio_status` set to `'approved'`; status pill turns green; button toggles to `Unapprove`.

## Visual section (`VisualSectionForm.jsx`)

Fields mapped to `storyboard_scenes` columns:
- Scene Title → `scene_title`
- Story / Action → `story_text`
- Characters in Scene → `characters` (comma-separated input → string[])
- Environment / Location Description → `environment_description`
- Camera Direction → `camera_direction`
- Image Prompt → `image_prompt`
- Animation Prompt → `animation_prompt`
- Transition to Next Scene → `transition_to_next` (select: cut, fade, dissolve, wipe)

Helper text under heading: "Describe what the viewer sees in this scene."

## Audio section (`AudioSectionForm.jsx`)

Fields:
- Audio Mode → `audio_mode` (select: dialogue | narration | mixed | rhyme_song | silent)
- Dialogue → `dialogue_text` (textarea; helper: "Format: `Character: line`. Only the line will be spoken.")
- Narration → `narration_text`
- Rhyme / Song Lyrics → `rhyme_lyrics` (only shown when mode = rhyme_song or mixed)
- Background Music Prompt → `background_music_prompt`
- Sound Effects Prompt → `sfx_prompt`
- Voice Style → `voice_style`
- Audio Timing Notes → `audio_timing` (free text — stored as numeric currently; will store as text in a new column? **see open question**)

Conditional visibility by mode (silent hides most fields; rhyme_song emphasizes lyrics).

Note: dialogue speaker stripping is a documentation/UX convention here — the actual TTS strip happens later in the Audio phase. We just render the helper text.

## Project type defaults

On new scene insert, pick `audio_mode` default from `projects.project_type`:
- `rhyme | nursery_rhyme | kids_song | musical` → `rhyme_song`
- `documentary | educational | explainer` → `narration`
- `story | fairy_tale | fantasy | drama` → `dialogue`
- everything else → `dialogue`

## Approval rule

A scene is approvable iff:
- Visual: `story_text` OR `image_prompt` non-empty (basic content)
- Audio: at least one of — `dialogue_text`, `narration_text`, `rhyme_lyrics`, `background_music_prompt`, `sfx_prompt`, or `audio_mode === 'silent'`

Approve button disabled with tooltip explaining what's missing.

## Reorder / duplicate / delete

- Move up/down: swap `scene_number` with neighbor (two updates).
- Duplicate: insert clone with `scene_number = current + 1` and shift subsequent scenes +1 (bulk update in a single Promise.all).
- Delete: remove row, then renumber remaining scenes to be contiguous.

## Save behavior

- Each field edit marks card dirty.
- "Save All" iterates dirty cards → `scenesApi.update(id, patch)` in parallel; toast "Saved".
- Per-card inline "Saved ✓" appears for 2s after success.
- Navigating away with unsaved changes triggers a confirm dialog.

## Open question (small)

`audio_timing` is currently `numeric` in the schema, but the spec asks for free-text "Audio Timing Notes". Two options:
1. Keep numeric, label it "Audio Timing (seconds)".
2. Tiny migration to change `audio_timing` to `text`.

Default choice: **Option 1** (no schema change, stays in scope of Step 4). Will flag in the UI as "Audio Timing (sec)".

## Acceptance checklist

- Route `/project/:id/storyboard` renders new editor (replaces placeholder).
- Back button → `/project/:id` dashboard.
- Add / edit / delete / duplicate / reorder works and persists.
- Visual + Audio in separate tabs, no mixing.
- All listed fields save and reload after refresh.
- Approval gating enforced.
- No changes to auth, dashboard, generation, animation, audio synthesis, export, or any API integration.
- Location phase not reintroduced.
