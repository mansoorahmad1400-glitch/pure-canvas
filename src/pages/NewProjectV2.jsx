import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { projectsApi, scenesApi } from '@/lib/studio/api';
import { supabase } from '@/integrations/supabase/client';
import { SAMPLE_SCENES } from '@/lib/studio/sampleScenes';

const PROJECT_TYPES = [
  { value: 'story',        label: 'Story' },
  { value: 'fairy_tale',   label: 'Fairy Tale' },
  { value: 'documentary',  label: 'Documentary' },
  { value: 'educational',  label: 'Educational' },
  { value: 'rhyme',        label: 'Rhyme' },
  { value: 'kids_song',    label: 'Kids Song' },
  { value: 'fantasy',      label: 'Fantasy' },
  { value: 'custom',       label: 'Custom' },
];

const VISUAL_STYLES = [
  { value: 'animated_cartoon',   label: 'Animated Cartoon' },
  { value: 'cinematic_realistic',label: 'Cinematic Realistic' },
  { value: 'documentary',        label: 'Documentary' },
  { value: 'custom',             label: 'Custom' },
];

const LANGUAGES = [
  { value: 'en',     label: 'English' },
  { value: 'ur',     label: 'Urdu' },
  { value: 'roman_ur', label: 'Roman Urdu' },
  { value: 'hi',     label: 'Hindi' },
  { value: 'fr',     label: 'French' },
  { value: 'nl',     label: 'Dutch' },
  { value: 'es',     label: 'Spanish' },
  { value: 'ar',     label: 'Arabic' },
  { value: 'none',   label: '— None —' },
];

export default function NewProjectV2() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState('story');
  const [visualStyle, setVisualStyle] = useState('animated_cartoon');
  const [langPrimary, setLangPrimary] = useState('en');
  const [langSecondary, setLangSecondary] = useState('roman_ur');
  const [duration, setDuration] = useState(60);
  const [idea, setIdea] = useState('');

  const [creating, setCreating] = useState(false);
  const [addSamples, setAddSamples] = useState(false);

  const handleCancel = () => navigate('/projects');

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({ title: 'Project title is required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data: project, error } = await projectsApi.create({
        title: title.trim(),
        project_type: projectType,
        style: visualStyle,
        language_primary: langPrimary,
        language_secondary: langSecondary === 'none' ? null : langSecondary,
        current_phase: 'storyboard',
        status: 'draft',
        progress: 0,
      });
      if (error) throw error;

      if (addSamples) {
        const { data: { user } } = await supabase.auth.getUser();
        await Promise.allSettled(
          SAMPLE_SCENES.map((s) =>
            supabase.from('storyboard_scenes').insert({
              ...s,
              project_id: project.id,
              user_id: user.id,
            })
          )
        );
      }

      toast({ title: 'Project created' });
      navigate(`/project/${project.id}`);
    } catch (e) {
      toast({ title: 'Failed to create project', description: e.message, variant: 'destructive' });
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Button>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold">New Project</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your project. You can change anything later inside the Storyboard.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Project Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. The Glowing Forest"
            className="h-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Visual Style</Label>
            <Select value={visualStyle} onValueChange={setVisualStyle}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISUAL_STYLES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Primary Language</Label>
            <Select value={langPrimary} onValueChange={setLangPrimary}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.filter((l) => l.value !== 'none').map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Secondary Language (optional)</Label>
            <Select value={langSecondary} onValueChange={setLangSecondary}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-sm">Estimated Duration (seconds)</Label>
            <Input
              type="number" min={5} max={3600}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Short Idea / Prompt</Label>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe the story or idea in a sentence or two."
            className="min-h-[90px]"
          />
          <p className="text-[11px] text-muted-foreground">
            This is just a note for you — used as inspiration in the Storyboard.
          </p>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border/40 bg-secondary/20 cursor-pointer">
          <input
            type="checkbox"
            checked={addSamples}
            onChange={(e) => setAddSamples(e.target.checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              Add Sample Storyboard Scenes
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adds 2 example scenes so you can test the workflow right away. No APIs used.
            </p>
          </div>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
          <Button variant="outline" onClick={handleCancel} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()} className="gap-1.5">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
