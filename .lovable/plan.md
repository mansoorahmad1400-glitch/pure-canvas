## Step 5.7 — Stabilize Projects, Storyboard, Characters

Surgical fixes only. No new phases, no APIs, no Base44 gem logic.

---

### 1. Fix blank screen on `/projects` and `/project/:id`

Root cause: `useQuery` runs immediately on mount before `supabase.auth` has hydrated from `localStorage`. RLS returns no rows for an unauthenticated request, and on first navigation the previous `AnimatePresence` page can unmount before the new one's lazy chunk + auth resolve, leaving a black gap.

Changes:
- **`src/hooks/useAuthReady.js`** (new): tiny hook returning `{ user, isReady }`. Calls `supabase.auth.getSession()` first, then subscribes to `onAuthStateChange`. Cleans up properly.
- **`src/pages/Projects.jsx`**: pull `{ user, isReady } = useAuthReady()`. Add `enabled: isReady && !!user` to the `projects-v2` query. Render `PageLoader` while `!isReady`. Render dedicated error state + Retry button if `isError`.
- **`src/pages/ProjectDashboard.jsx`**: same gating — both `project` and `project-phase-counts` queries get `enabled: isReady && !!user && !!id`. Render loader during hydration, error state with Retry if either query fails, and a "Project not found" state when `project` is `null`. Keep the existing project header rendering, just fix the early-return states.
- Keep `RequireAuth` as-is (it already waits for session for the redirect decision); this fixes the data-fetch race specifically.

### 2. Storyboard — Save All + Approve feedback

Save All currently *does* work but feels dead because approval persists immediately and clears the dirty set, so the button disables with no toast. Approval also doesn't surface validation errors.

Changes in **`src/pages/StoryboardPhase.jsx`**:
- `toggleApprove`: wrap in try/catch/finally. On validation fail (`canApprove(s).ok === false`), show toast "Add Visual or Audio content first" — currently silently no-ops. On Supabase error, restore previous status locally and show destructive toast. On success, show "Scene N approved" / "Scene N unapproved" toast (so the user sees feedback).
- `saveAll`: when `dirtyIds.size === 0`, instead of toast "Nothing to save" use a softer toast and keep button disabled with tooltip "No unsaved changes". Add try/catch around the Promise.all so an exception (e.g. network) surfaces a destructive toast and resets `savingAll`.
- Save All button: add `title` attribute showing "No unsaved changes" / "Save N pending change(s)" so the disabled state is explained. Show a brief "Saved ✓" label for ~1.5 s after a successful save (reuse `justSavedIds` or a new `lastSavedAt`).

No schema or RLS change needed — current behavior already persists; the user just lacked feedback.

### 3. Characters — infinite spinner + dynamic import crash

Two distinct issues:

a) **Dynamic-import crash** ("Failed to fetch dynamically imported module: CharactersPhase.jsx"). This is a known Vite issue when a lazy chunk fails to load (transient network / dev reload). Add a small retry wrapper.
- **`src/App.jsx`**: replace each `lazy(() => import('...'))` for app-shell pages with a `lazyWithRetry` helper that retries the import once after 400 ms and, on a second failure, hard-reloads the page. Apply at minimum to `CharactersPhase`, `StoryboardPhase`, `Projects`, `ProjectDashboard`, `NewProjectV2`.

b) **Page stuck on spinner**. `if (projectQ.isLoading || charactersQ.isLoading)` traps the page if either query is permanently pending (it can be when auth isn't ready — the query is `enabled` but returns nothing usable). Plus, errors aren't surfaced.

Changes in **`src/pages/CharactersPhase.jsx`**:
- Use `useAuthReady`, gate both queries with `enabled: isReady && !!user && !!projectId`.
- Loading guard: only show the spinner while `!isReady || (projectQ.isFetching && !projectQ.data) || (charactersQ.isFetching && !charactersQ.data)`. If a query `isError`, render an inline error card with "Retry" calling `refetch()`.
- `handleExtract`: wrap in try/catch/**finally** so `setExtracting(false)` always runs. If `scenesQ.data` is missing, refetch first. Pre-check: if no scene has `visual_status === 'approved'` AND `audio_status === 'approved'`, show toast "Approve at least one Storyboard scene before extracting characters." and return without spinning.
- `handleAdd`, `handleDelete`, `handleApprove`, `handleUnapprove`, `handleSaveAll`: all wrapped with try/catch/finally for consistent error toasts and guaranteed loading-state cleanup.

### 4. Characters table safety

Current schema (verified) already has every required column: `id, project_id, user_id, name, role, description, appearance, personality, voice_style, style_prompt, reference_image_url, approval_status, created_at, updated_at`. **No migration needed.** Plan notes this so we don't add a redundant migration.

### 5. Global error UX

- Reusable **`src/components/studio/QueryErrorState.jsx`** (new): renders a compact card with the error message and a Retry button; used by Projects, ProjectDashboard, StoryboardPhase, CharactersPhase.
- Toast already routes through sonner (dismissible) — no change.

### 6. Preserve

- 6-phase dashboard, no Location phase, Storyboard Visual + Audio sections, `duration_seconds`, dev/admin access, project creation, sample scenes, sonner toaster — all untouched.

---

### Files

New:
- `src/hooks/useAuthReady.js`
- `src/components/studio/QueryErrorState.jsx`

Edited:
- `src/App.jsx` (lazyWithRetry only)
- `src/pages/Projects.jsx`
- `src/pages/ProjectDashboard.jsx`
- `src/pages/StoryboardPhase.jsx`
- `src/pages/CharactersPhase.jsx`

No DB migration. No edge functions. No API calls.

### Acceptance checks I will verify

1. `/projects` and `/project/:id` render content on first visit without refresh.
2. Storyboard Save All shows toast + "Saved ✓" feedback; Approve shows toast and persists across refresh.
3. Characters page never shows the dynamic-import crash (retry wrapper) and never spins forever (finally + error state + retry).
4. Extract from Storyboard with zero approved scenes shows friendly message instead of hanging.
