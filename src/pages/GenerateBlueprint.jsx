import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, ArrowRight, RotateCcw, Gem, Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import RequireAuth from '@/components/auth/RequireAuth';

const steps = [
  { key: 'story', label: 'Generating story structure...' },
  { key: 'scenes', label: 'Building scene-by-scene blueprint...' },
  { key: 'visuals', label: 'Crafting visual prompts...' },
  { key: 'audio', label: 'Composing audio & music cues...' },
  { key: 'youtube', label: 'Creating YouTube packaging...' },
  { key: 'tools', label: 'Mapping recommended AI tools...' },
];

function GenerateBlueprintInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isPremium, isAdmin, gems, canGenerate, refetch: refetchUser } = useCurrentUser();
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completed, setCompleted] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Project.list().then(ps => ps.find(p => p.id === id)),
    enabled: !!id,
  });

  useEffect(() => {
    if (project?.status === 'completed') setCompleted(true);
  }, [project]);

  const generateBlueprint = async () => {
    if (!project || !canGenerate) return;
    setGenerating(true);
    setCurrentStep(0);

    await base44.entities.Project.update(id, { status: 'generating' });

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => prev >= steps.length - 1 ? prev : prev + 1);
    }, 3000);

    const languageList = project.languages?.join(' and ') || 'English';
    const premiumNote = isPremium ? '\n- This is a PREMIUM generation: include extra detail, bonus scene variations, and advanced camera directions.' : '';

    const prompt = `You are a master cinematic story architect. Generate a COMPLETE production blueprint for the following project.

PROJECT DETAILS:
- Title: "${project.title}"
- Type: ${project.project_type}
- Visual Style: ${project.style}
- Target Audience: ${project.audience}
- Narration Languages: ${languageList}
${project.idea_description ? `- Additional Details: ${project.idea_description}` : ''}${premiumNote}

STRICT RULES:
1. Generate EXACTLY 8-12 scenes. NO SKIPPING. Every scene must be individually detailed.
2. Each scene must have: title, description, visual_prompt (for AI image/video generation), narration_en, narration_secondary (in ${project.languages?.[1] || 'Roman Urdu'}), dialogue, music_cue, sound_effects, duration_seconds, mood, camera_angle.
3. Visual prompts must be detailed enough for Midjourney/DALL-E/Runway.
4. Music cues should reference mood/genre/instruments (for Suno AI).
5. Include YouTube packaging: title, description, tags, thumbnail concept.
6. Include recommended AI tools with their purposes.

Generate a COMPLETE, production-ready master prompt system. No placeholders, no shortcuts.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          scenes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                scene_number: { type: "number" },
                title: { type: "string" },
                description: { type: "string" },
                visual_prompt: { type: "string" },
                narration_en: { type: "string" },
                narration_secondary: { type: "string" },
                dialogue: { type: "string" },
                music_cue: { type: "string" },
                sound_effects: { type: "string" },
                duration_seconds: { type: "number" },
                mood: { type: "string" },
                camera_angle: { type: "string" }
              }
            }
          },
          youtube_title: { type: "string" },
          youtube_description: { type: "string" },
          youtube_tags: { type: "array", items: { type: "string" } },
          thumbnail_concept: { type: "string" },
          recommended_tools: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tool_name: { type: "string" },
                purpose: { type: "string" },
                usage_note: { type: "string" }
              }
            }
          }
        }
      }
    });

    clearInterval(stepInterval);
    setCurrentStep(steps.length - 1);

    await base44.entities.Project.update(id, {
      scenes: result.scenes || [],
      scene_count: result.scenes?.length || 0,
      youtube_title: result.youtube_title || '',
      youtube_description: result.youtube_description || '',
      youtube_tags: result.youtube_tags || [],
      thumbnail_concept: result.thumbnail_concept || '',
      recommended_tools: result.recommended_tools || [],
      status: 'completed',
    });

    // Deduct gem ONLY after successful generation
    if (!isAdmin) {
      await base44.auth.updateMe({ gems_balance: Math.max(0, gems - 1) });
      refetchUser();
    }

    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });

    setTimeout(() => {
      setCompleted(true);
      setGenerating(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-2">{project.title}</h1>
          <p className="text-muted-foreground capitalize mb-10">
            {project.project_type?.replace('_', ' ')} • {project.style} • {project.audience}
          </p>

          {/* Out of gems block */}
          {!canGenerate && !generating && !completed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 mb-6"
            >
              <Lock className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Out of Gems</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You are out of gems. Upgrade to Premium to continue generating unlimited blueprints.
              </p>
              <Link to="/upgrade">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
                </Button>
              </Link>
            </motion.div>
          )}

          {/* Ready to generate */}
          {canGenerate && !generating && !completed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="p-8 rounded-2xl border border-border/50 bg-card/50 mb-6">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Ready to Generate</h2>

                {/* Gem cost notice for free users */}
                {!isPremium && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border/50 text-sm mb-4">
                    <Gem className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">This will use <span className="text-foreground font-semibold">1 gem</span> ({gems} remaining)</span>
                  </div>
                )}
                {isPremium && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm mb-4 text-primary">
                    <Crown className="w-3.5 h-3.5" /> Premium — Unlimited generations
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-6">
                  Your AI engine will create a complete scene-by-scene production blueprint.
                </p>
                <Button
                  onClick={generateBlueprint}
                  className="px-8 py-5 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Master Blueprint
                </Button>
              </div>
            </motion.div>
          )}

          {/* Generating */}
          {generating && !completed && (
            <div className="p-8 rounded-2xl border border-primary/20 bg-card/50">
              <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold mb-6">Generating Blueprint...</h2>
              <div className="space-y-3 text-left">
                {steps.map((step, i) => (
                  <motion.div key={step.key} initial={{ opacity: 0.3 }} animate={{ opacity: i <= currentStep ? 1 : 0.3 }} className="flex items-center gap-3">
                    {i < currentStep ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    ) : i === currentStep ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-border shrink-0" />
                    )}
                    <span className={`text-sm ${i <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="p-8 rounded-2xl border border-green-500/20 bg-card/50"
            >
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Blueprint Complete!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {project.scene_count || 'Multiple'} scenes generated with full production details.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(`/project/${id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  View Blueprint <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={() => { setCompleted(false); setCurrentStep(-1); }}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function GenerateBlueprint() {
  return (
    <RequireAuth>
      <GenerateBlueprintInner />
    </RequireAuth>
  );
}