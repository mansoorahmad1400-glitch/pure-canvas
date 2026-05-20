import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useQueryClient } from '@tanstack/react-query';
import InputPanel from '@/components/dashboard/InputPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import OutputPanel from '@/components/dashboard/OutputPanel';
import CodeDownloadButton from '@/components/dashboard/CodeDownloadButton';
import { toast } from 'sonner';
import { resolveScriptStyle } from '@/lib/scriptStyleResolver';
import { Gem, Crown, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const BLANK_FORM = {
  project_name: '',
  duration: 'auto',
  project_type: 'auto',
  sound_tool: 'auto',
  visual_tool: 'auto',
  audience: 'auto',
  languages: ['English'],
  topic: '',
  moral: '',
  story_goal: '',
};

function DashboardInner() {
  const { user, isStarter, isPremium, isElite, isAdmin, gems, canGenerate, isLowGems, GEM_COSTS, refetch } = useCurrentUser();
  const { maxScenes, gemCosts, planLabel: accessPlanLabel, checkAccess } = usePlanAccess();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ ...BLANK_FORM });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [output, setOutput] = useState(null);
  const [savedProjectId, setSavedProjectId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to get auto defaults for a project type
  const getAutoDefaults = (type) => {
    const map = {
      auto: { duration: '300', type: 'story', sound: 'elevenlabs_suno', visual: 'grok', audience: 'family' },
      rhyme: { duration: '180', sound: 'suno', visual: 'grok', audience: 'kids' },
      story: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'family' },
      fairy_tale: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'family' },
      fantasy: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'universal' },
      adventure: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'teens' },
      documentary: { duration: '600', sound: 'elevenlabs', visual: 'meta', audience: 'adults' },
      mystery: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'adults' },
      mythology: { duration: '300', sound: 'elevenlabs_suno', visual: 'grok', audience: 'universal' },
      educational: { duration: '300', sound: 'elevenlabs', visual: 'meta', audience: 'family' },
    };
    return map[type] || map.auto;
  };

  // Resolve all final values from form
  const resolveFinalValues = () => {
    const finalProjectType = form.project_type === 'auto' ? 'story' : form.project_type;
    const defaults = getAutoDefaults(finalProjectType);
    return {
      finalProjectType,
      finalDuration: form.duration === 'auto' || !form.duration ? defaults.duration : form.duration,
      finalSoundTool: form.sound_tool === 'auto' || !form.sound_tool ? defaults.sound : form.sound_tool,
      finalVisualTool: form.visual_tool === 'auto' || !form.visual_tool ? defaults.visual : form.visual_tool,
      finalAudience: form.audience === 'auto' || !form.audience ? defaults.audience : form.audience,
      finalLanguages: form.languages && form.languages.length > 0 ? form.languages : ['English'],
    };
  };

  const handleFormChange = useCallback((newForm) => {
    setForm(newForm);
  }, []);

  const buildPrompt = ({ finalProjectType, finalDuration, finalSoundTool, finalVisualTool, finalAudience, finalLanguages }) => {
    const visualToolName = {
      grok: 'Grok', meta: 'Meta', midjourney: 'Midjourney', dalle: 'DALL-E 3',
      runway: 'Runway ML', kling: 'Kling AI', pika: 'Pika Labs', sora: 'Sora',
      stable_diffusion: 'Stable Diffusion',
    }[finalVisualTool] || 'Grok';

    const soundToolName = {
      suno: 'Suno AI', elevenlabs: 'ElevenLabs',
      elevenlabs_suno: 'ElevenLabs (voice) + Suno AI (music)',
      udio: 'Udio', mubert: 'Mubert',
    }[finalSoundTool] || 'ElevenLabs';

    const lang1 = finalLanguages[0] || 'English';
    const lang2 = finalLanguages.length > 1 ? finalLanguages[1] : null;
    const isMultiLang = !!lang2;
    const durationSecs = Number(finalDuration) || 300;
    const durationMins = Math.floor(durationSecs / 60);
    const durationDisplay = durationMins >= 1 ? `${durationMins} minute${durationMins > 1 ? 's' : ''}` : '2 minutes';

    // Scene count: each scene = 6 seconds
    const SCENE_DURATION_SECS = 6;
    const isAutoDuration = form.duration === 'auto' || !form.duration;
    const generationMode = form.generation_mode || 'quick';

    // ─── Blueprint Engine — Tier-Based Scene Limits ──────────────────────────────
    // FREE: 8 | STARTER: 12 | CREATOR PRO: 15 | ELITE/ADMIN: 18
    const PLAN_SCENE_MAX = isAdmin ? 18 : isElite ? 18 : isPremium ? 15 : isStarter ? 12 : 8;
    const PLAN_SCENE_MIN = isAdmin ? 10 : isElite ? 10 : isPremium ? 8 : isStarter ? 6 : 4;

    // Mode-based ranges scaled to the plan's allowed max
    // quick = ~60% of max, standard = ~75%, detailed = 100%
    const modeRangeMap = {
      quick:    [PLAN_SCENE_MIN, Math.round(PLAN_SCENE_MAX * 0.65)],
      standard: [Math.round(PLAN_SCENE_MAX * 0.55), Math.round(PLAN_SCENE_MAX * 0.80)],
      detailed: [Math.round(PLAN_SCENE_MAX * 0.75), PLAN_SCENE_MAX],
    };

    let totalScenes;
    if (isAutoDuration) {
      const [sMin, sMax] = modeRangeMap[generationMode];
      totalScenes = Math.floor(Math.random() * (sMax - sMin + 1)) + sMin;
    } else {
      // Manual duration: calculate from seconds, then adapt to fit within plan limit
      totalScenes = Math.round(durationSecs / SCENE_DURATION_SECS);
    }

    // Hard clamp to plan limits — server will also enforce this as a safety net
    totalScenes = Math.min(PLAN_SCENE_MAX, Math.max(PLAN_SCENE_MIN, totalScenes));

    const sceneDisplay = `${SCENE_DURATION_SECS} seconds`;

    const lines = [
      '🚨 CRITICAL MODE: STRICT PRODUCTION ENGINE',
      '',
      '🔥 UNIVERSAL MASTER PROJECT PROMPT (FINAL — STUDIOONE AI)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '📌 PROJECT INPUT',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `• Project Idea / Thought: ${form.project_name}`,
      `• Total Video Duration: ${durationDisplay}`,
      `• Scene Duration: ${sceneDisplay}`,
      `• Total Scenes: ${totalScenes}`,
      `• Project Type / Style: ${finalProjectType}`,
      `• Sound Creation Tool: ${soundToolName}`,
      `• Visual Creation Tool: ${visualToolName}`,
      `• Target Audience: ${finalAudience}`,
      `• Languages: ${isMultiLang ? `${lang1} and ${lang2}` : lang1}`,
      form.topic ? `• Topic / Concept: ${form.topic}` : null,
      form.moral ? `• Moral / Message: ${form.moral}` : null,
      form.story_goal ? `• Story Goal: ${form.story_goal}` : null,
      '',
      'NOTE: All languages must be written in Roman script only.',
      '',
      '---',
      '',
      'AUTO MODE: If any field is missing, intelligently select the best option. Do NOT override user-selected values.',
      '',
      '---',
      '',
      '🚨 STRICT EXECUTION RULES (HARD LOCK)',
      '',
      'The AI MUST:',
      '✔ Generate ALL scenes individually',
      '✔ Generate ALL sections fully',
      '✔ Follow structure EXACTLY',
      '',
      '❗ ABSOLUTELY FORBIDDEN:',
      '- "continue"',
      '- "remaining scenes"',
      '- "same as above"',
      '- "etc"',
      '- skipping scenes',
      '- grouping scenes',
      '- summarizing scenes',
      '',
      '🚨 FAILURE HANDLING: If ANY section is incomplete or ANY scene is missing → REGENERATE',
      '',
      '---',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      'A. STORY / CONCEPT',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Write a clean, engaging story or concept.',
      '',
      'Rules:',
      '- NOT scene-by-scene',
      `- Write in ${lang1}`,
      ...(isMultiLang ? [`- Also provide a version in ${lang2}`] : []),
      '- Emotional, cinematic, easy to understand',
      '- No production instructions',
      '',
      '---',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      'B. VISUAL PROMPTS (FULL CINEMATIC ENGINE)',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `Generate ALL ${totalScenes} scenes in HIGH DETAIL for ${visualToolName}. Output in ${lang1} only${isMultiLang ? ` with ${lang2} translation where specified` : ''}.`,
      '',
      'Each scene MUST include:',
      '',
      'Scene X:',
      'Environment:',
      'Characters (FULL detailed description — MUST repeat EXACTLY in every scene):',
      'Action:',
      'Camera Angle:',
      'Camera Movement:',
      'Lighting:',
      'Mood:',
      'Scene Motion:',
      'Visual Style:',
      'Transition to Next Scene:',
      '',
      '"Character consistency locked — reuse exact same character design, no variation"',
      '',
      '---',
      '',
      '🚨 RULES:',
      '- ALL scenes required',
      `- Scene 1 → Scene 2 → Scene 3 → ... → Scene ${totalScenes}`,
      '- NO skipping',
      '- NO grouping',
      '',
      '---',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      'C. SOUND / MUSIC SYSTEM',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `C1 — Narration in ${lang1} (scene-by-scene):`,
      'Scene 1:',
      'Scene 2:',
      `... ALL ${totalScenes} scenes required`,
      '',
      ...(isMultiLang ? [
        `C2 — Narration in ${lang2} (scene-by-scene):`,
        'Scene 1:',
        'Scene 2:',
        `... ALL ${totalScenes} scenes required`,
        '',
      ] : []),
      '',
      `C3 — Music Style (${soundToolName}):`,
      'Full description of sound style based on project type and mood.',
      '',
      'C4 — Background Music (scene-by-scene):',
      'Scene 1 Music:',
      'Scene 2 Music:',
      `... ALL ${totalScenes} scenes required`,
      '',
      'C5 — Timing (scene-by-scene):',
      'Scene 1 Timing:',
      'Scene 2 Timing:',
      `... ALL ${totalScenes} scenes required`,
      '',
      '🚨 RULES:',
      '- ALL scenes required',
      '- No skipping',
      '- No grouping',
      '',
      '---',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      'D. YOUTUBE PACKAGE (HIGH-CONVERSION MODE)',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🎯 OBJECTIVE: Short, powerful, click-worthy content',
      '',
      '🔥 TITLES:',
      `Generate 3 title options in ${isMultiLang ? `BOTH languages (${lang1} and ${lang2})` : lang1}`,
      'Rules: Emotional, curiosity-driven, short & punchy, high CTR',
      '',
      '🔥 DESCRIPTION (VERY IMPORTANT):',
      '• Maximum 2–3 lines ONLY',
      '• NOT paragraph',
      '• Hook-based',
      '• Fast to read',
      '',
      'FORMAT:',
      '',
      `Description (${lang1}):`,
      'Line 1 → Hook',
      'Line 2 → Value',
      'Line 3 → Soft CTA',
      '',
      ...(isMultiLang ? [
        `Description (${lang2}):`,
        'Same structure',
        '',
      ] : []),
      '',
      '🔥 TAGS:',
      '• 10–20 tags',
      '• Comma separated',
      '• Mix of: Topic, Emotion, Genre',
      '',
      '🚫 FORBIDDEN: Long paragraphs, story repetition, over-detail',
      '',
      '---',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      'E. THUMBNAIL',
      '━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `Hook (${lang1}) — max 6 words:`,
      ...(isMultiLang ? [`Hook (${lang2}) — max 6 words:`] : []),
      '',
      'Concept:',
      '- Emotional',
      '- High contrast',
      '- Click-focused',
      '- Clear subject',
      '',
      '---',
      '',
      '🚨 FINAL RULE',
      '',
      'If output contains "continue", missing scenes, or grouped scenes → SYSTEM MUST REGENERATE',
      '',
      '- NO skipping scenes',
      '- NO grouping',
      '- NO "same as above"',
      '- NO paragraph dumping',
      '- Output must be clean, spaced, structured',
      '- Be exhaustive and 100% production-ready',
    ];

    return lines.filter(l => l !== null).join('\n');
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (!form.project_name) {
      toast.error('Please enter your Project Idea / Thought.');
      return;
    }

    // Frontend plan access check before hitting backend
    const access = checkAccess('generate_blueprint');
    if (!access.allowed) {
      toast.error(access.reason || 'Cannot generate: upgrade your plan.');
      return;
    }

    const resolved = resolveFinalValues();

    setIsGenerating(true);
    setOutput(null);
    console.log('[StudioOne] Generation started');

    const gemCost = GEM_COSTS.standard;
    const prompt = buildPrompt(resolved);

    // 120 second timeout for mobile safety
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Generation is taking longer than expected. Please try again.')), 120000)
    );

    let result;
    try {
      const response = await Promise.race([
        base44.functions.invoke('generateBlueprint', { prompt }),
        timeoutPromise,
      ]);
      console.log('[StudioOne] Backend response received');

      if (!response?.data || response.data.error) {
        throw new Error(response?.data?.error || 'Generation failed. Please try again.');
      }

      result = response.data;
      console.log('[StudioOne] Output parsed');

      // Deduct gem ONLY after successful generation — never on failure, never go negative
      if (!isAdmin) {
        const newBalance = Math.max(0, gems - gemCost);
        await base44.auth.updateMe({
          gems_balance: newBalance,
          gems_used_this_month: (user?.gems_used_this_month || 0) + gemCost,
        });
        refetch();
      }

      // Use setTimeout to let React flush before setting large output
      setTimeout(() => {
        setOutput(result);
        console.log('[StudioOne] Output displayed');
      }, 0);
      toast.success('Blueprint generated!');
    } catch (error) {
      console.error('[StudioOne] Generation error:', error);
      toast.error(error.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
      console.log('[StudioOne] Loading cleared');
    }
  };

  const handleSave = async () => {
    if (!output) return;
    setIsSaving(true);
    try {
      const { finalProjectType, finalVisualTool, finalAudience, finalLanguages, finalSoundTool } = resolveFinalValues();
      // Resolve and store the visual style key so image workspace can use it
      const resolvedStyleKey = resolveScriptStyle({ project_type: finalProjectType, audience: finalAudience });

      const saved = await base44.entities.Project.create({
        title: form.project_name || 'Untitled Project',
        project_type: finalProjectType,
        style: finalVisualTool,
        audience: finalAudience,
        visual_style_key: resolvedStyleKey,
        languages: finalLanguages,
        idea_description: form.topic || '',
        status: 'completed',
        master_prompt: output.master_prompt || '',
        visual_prompt: output.visual_prompt || '',
        sound_prompt: output.sound_prompt || '',
        narration_guide: output.narration_guide || '',
        youtube_package: output.youtube_package || {},
        youtube_title: output.youtube_package?.title_primary || '',
        youtube_description: output.youtube_package?.description_primary || '',
        youtube_tags: output.youtube_package?.tags ? output.youtube_package.tags.split(',').map(t => t.trim()) : [],
        gems_used: GEM_COSTS.standard,
        generation_type: 'standard',
        recommended_tools: [
          { tool_name: finalVisualTool, purpose: 'Visual creation', usage_note: '' },
          { tool_name: finalSoundTool, purpose: 'Sound & music', usage_note: '' },
        ].filter(Boolean),
      });

      setSavedProjectId(saved.id);
      await base44.entities.GenerationLog.create({
        project_id: saved.id,
        user_id: user.email,
        gems_used: GEM_COSTS.standard,
        generation_type: 'standard',
        project_name: form.project_name || 'Untitled Project',
        project_type: form.project_type,
      });

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project saved to your library!');
    } catch (e) {
      toast.error('Failed to save. Please try again.');
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setOutput(null);
    setSavedProjectId(null);
    setForm({ ...BLANK_FORM });
  };

  const planLabel = isAdmin ? 'Admin' : isElite ? 'Studio Elite' : isPremium ? 'Creator Pro' : isStarter ? 'Starter' : 'Free';
  const gemLimit  = isAdmin ? null : isElite ? 1100 : isPremium ? 500 : isStarter ? 200 : 2;
  const gemDisplay = isAdmin ? 'system access' : `${gems}${gemLimit ? `/${gemLimit}` : ''}`;
  const isBlocked = !canGenerate && !isAdmin;

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Studio status bar */}
      <div className="border-b border-border/40 bg-card/30 px-4 py-2">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          {/* Plan badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isAdmin   ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
            : isElite ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : isPremium ? 'bg-primary/10 border-primary/30 text-primary'
            : isStarter ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            : 'bg-secondary border-border/40 text-muted-foreground'
          }`}>
            {isAdmin || isElite || isPremium ? <Crown className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
            {planLabel}
          </div>

          <div className="flex items-center gap-3">
            {isBlocked ? (
              <div className="flex items-center gap-2 text-xs text-red-400 font-medium">
                <Gem className="w-3.5 h-3.5" />
                <span>Free limit reached.</span>
                <Link to="/upgrade" className="underline text-primary hover:text-primary/80">Upgrade Plan</Link>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${
                isAdmin
                  ? 'bg-secondary border-border/40 text-muted-foreground'
                  : isElite
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : isPremium
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : isLowGems
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-secondary border-border/40 text-foreground'
              }`}>
                {isAdmin ? <Sparkles className="w-3 h-3" /> : isElite ? <Crown className="w-3 h-3" /> : isPremium ? <Crown className="w-3 h-3" /> : <Gem className="w-3 h-3" />}
                <span>{isAdmin ? 'Admin — system access' : `${gemDisplay} gems remaining`}</span>
              </div>
            )}
            <CodeDownloadButton />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-[1400px] w-full mx-auto">
        {/* Ambient glow */}
        <div className="pointer-events-none fixed top-20 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl opacity-50" />

        {/* LEFT PANEL — inputs */}
        <div className={`relative shrink-0 border-r border-border/40 bg-card/20 lg:h-[calc(100vh-6.5rem)] lg:sticky lg:top-[6.5rem] overflow-y-auto transition-all duration-300 ${leftCollapsed ? 'lg:w-0 overflow-hidden border-r-0' : 'lg:w-[420px] xl:w-[460px]'}`}>
          <div className={`transition-all duration-300 ${leftCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="p-5">
            <InputPanel
              form={form}
              onChange={handleFormChange}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              canGenerate={canGenerate}
              isStarter={isStarter}
              isPremium={isPremium}
              isElite={isElite}
              isAdmin={isAdmin}
              gems={gems}
              isLowGems={isLowGems}
              maxScenes={maxScenes}
              gemCost={gemCosts?.generate_blueprint ?? 1}
            />
          </div>
          </div>
        </div>

        {/* Toggle button */}
        <div className="hidden lg:flex items-center">
          <button
            onClick={() => setLeftCollapsed(v => !v)}
            className="relative z-10 -mx-3 w-6 h-12 flex items-center justify-center bg-card border border-border/50 rounded-full shadow-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title={leftCollapsed ? 'Show panel' : 'Hide panel'}
          >
            {leftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* RIGHT PANEL — output */}
        <div className="flex-1 min-w-0 lg:h-[calc(100vh-6.5rem)] lg:sticky lg:top-[6.5rem] overflow-y-auto">
          <div className="p-5 h-full min-h-[600px]">
            <OutputPanel
              output={output}
              projectName={form.project_name}
              projectId={savedProjectId}
              projectType={form.project_type}
              isGenerating={isGenerating}
              onReset={handleReset}
              onSave={handleSave}
              isSaving={isSaving}
              visualTool={form.visual_tool}
              isElite={isElite}
              isPremium={isPremium}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return <DashboardInner />;
}