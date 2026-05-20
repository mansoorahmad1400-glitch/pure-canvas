import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import RequireAuth from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clapperboard, Loader2, X } from 'lucide-react';

const projectTypes = [
  { value: 'story', label: 'Story' },
  { value: 'fairy_tale', label: 'Fairy Tale' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'mythology', label: 'Mythology' },
  { value: 'folktale', label: 'Folktale' },
  { value: 'rhyme', label: 'Rhyme / Poem' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'educational', label: 'Educational' },
];

const styles = [
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'anime', label: 'Anime' },
  { value: 'realistic', label: 'Realistic' },
  { value: 'watercolor', label: 'Watercolor' },
  { value: 'pixel_art', label: 'Pixel Art' },
  { value: '3d_render', label: '3D Render' },
  { value: 'storybook', label: 'Storybook' },
];

const audiences = [
  { value: 'kids', label: 'Kids (3-8)' },
  { value: 'family', label: 'Family' },
  { value: 'teens', label: 'Teens' },
  { value: 'adults', label: 'Adults' },
  { value: 'universal', label: 'Universal' },
];

const languageOptions = [
  'English', 'Roman Urdu', 'Hindi', 'Arabic', 'Spanish', 'French', 'Turkish', 'Malay', 'Bengali'
];

function NewProjectInner() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    project_type: '',
    style: 'cinematic',
    audience: 'family',
    languages: ['English', 'Roman Urdu'],
    idea_description: '',
  });

  const toggleLanguage = (lang) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.project_type) return;
    setIsCreating(true);
    const project = await base44.entities.Project.create({
      ...form,
      status: 'draft',
    });
    navigate(`/project/${project.id}/generate`);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 mb-4">
              <Clapperboard className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-bold">New Project</h1>
            <p className="mt-2 text-muted-foreground">Define your creative vision</p>
          </div>

          <div className="space-y-6 bg-card/50 border border-border/50 rounded-2xl p-6 sm:p-8">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Project Title</Label>
              <Input
                placeholder="e.g. Sindbad the Sailor, Aladdin, Marco Polo..."
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="bg-background border-border/50 h-12 text-base"
              />
            </div>

            {/* Type & Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Content Type</Label>
                <Select
                  value={form.project_type}
                  onValueChange={(v) => setForm(prev => ({ ...prev, project_type: v }))}
                >
                  <SelectTrigger className="bg-background border-border/50 h-12">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Visual Style</Label>
                <Select
                  value={form.style}
                  onValueChange={(v) => setForm(prev => ({ ...prev, style: v }))}
                >
                  <SelectTrigger className="bg-background border-border/50 h-12">
                    <SelectValue placeholder="Select style..." />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Target Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => setForm(prev => ({ ...prev, audience: v }))}
              >
                <SelectTrigger className="bg-background border-border/50 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Languages */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Narration Languages</Label>
              <div className="flex flex-wrap gap-2">
                {languageOptions.map(lang => {
                  const selected = form.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selected
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-background border-border/50 text-muted-foreground hover:border-border'
                      }`}
                    >
                      {lang}
                      {selected && <X className="w-3 h-3 inline ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Idea Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Briefly describe your story idea, key characters, setting, or any special requirements..."
                value={form.idea_description}
                onChange={(e) => setForm(prev => ({ ...prev, idea_description: e.target.value }))}
                className="bg-background border-border/50 min-h-[120px] text-base resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleCreate}
              disabled={!form.title || !form.project_type || isCreating}
              className="w-full h-13 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-4"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Sparkles className="w-5 h-5 mr-2" />
              )}
              Create & Generate Blueprint
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function NewProject() {
  return <RequireAuth><NewProjectInner /></RequireAuth>;
}