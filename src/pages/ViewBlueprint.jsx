import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Download, Lock, Globe, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import NextSteps from '@/components/blueprint/NextSteps';
import CharacterHub from '@/components/characters/CharacterHub';
import VideoWorkspace from '@/components/video/VideoWorkspace';
import ImageWorkspace from '@/components/images/ImageWorkspace';
import AudioWorkspace from '@/components/audio/AudioWorkspace';
import ExportWorkspace from '@/components/export/ExportWorkspace';
import WorldMemoryHub from '@/components/world/WorldMemoryHub';
import CinematicWorkspaceNav from '@/components/layout/CinematicWorkspaceNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function CopyBlock({ label, content }) {
  const [copied, setCopied] = useState(false);
  if (!content) return null;
  const handle = () => {
    navigator.clipboard.writeText(typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <button onClick={handle} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="text-sm text-foreground/90 whitespace-pre-wrap font-sans leading-relaxed px-4 py-3 max-h-[600px] overflow-y-auto">
        {typeof content === 'object' ? JSON.stringify(content, null, 2) : content}
      </pre>
    </div>
  );
}

function EmptyState({ label }) {
  return <p className="text-muted-foreground text-sm py-8 text-center">{label}</p>;
}

function PaidGate({ icon: Icon, color, title, desc }) {
  const colorMap = {
    primary: { bg: 'bg-primary/10', icon: 'text-primary' },
    sky: { bg: 'bg-sky-500/10', icon: 'text-sky-400' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className={`w-14 h-14 rounded-full ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
      </div>
      <Link to="/upgrade">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Upgrade Now</Button>
      </Link>
    </div>
  );
}

function YouTubeTab({ pkg }) {
  if (!pkg) return <p className="text-muted-foreground text-sm py-8 text-center">No YouTube package available.</p>;
  return (
    <div className="space-y-4">
      {pkg.title_primary && (
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Title (Primary)</p>
          <p className="font-semibold text-foreground">{pkg.title_primary}</p>
        </div>
      )}
      {pkg.title_secondary && (
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Title (Secondary Language)</p>
          <p className="font-semibold text-foreground">{pkg.title_secondary}</p>
        </div>
      )}
      {pkg.description_primary && <CopyBlock label="Description (Primary)" content={pkg.description_primary} />}
      {pkg.description_secondary && <CopyBlock label="Description (Secondary Language)" content={pkg.description_secondary} />}
      {pkg.tags && (
        <div className="p-4 rounded-xl border border-border/50 bg-card/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{pkg.tags}</p>
        </div>
      )}
      {(pkg.thumbnail_hook_primary || pkg.thumbnail_hook_secondary) && (
        <div className="p-4 rounded-xl border border-yellow-500/20 bg-card/40">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Thumbnail Hook Text</p>
          {pkg.thumbnail_hook_primary && <p className="text-base font-bold text-primary mb-1">"{pkg.thumbnail_hook_primary}"</p>}
          {pkg.thumbnail_hook_secondary && <p className="text-base font-bold text-primary/70">"{pkg.thumbnail_hook_secondary}"</p>}
        </div>
      )}
    </div>
  );
}

function ViewBlueprintInner() {
  const { id } = useParams();
  const [copiedAll, setCopiedAll] = useState(false);
  const [activeTab, setActiveTab] = useState('story');
  const { user, isPaid, isAdmin } = useCurrentUser();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Project.list().then(ps => ps.find(p => p.id === id)),
    enabled: !!id,
  });

  const buildFullText = () => {
    if (!project) return '';
    const parts = [];
    if (project.master_prompt) parts.push(`=== MASTER STORY PROMPT ===\n${project.master_prompt}`);
    if (project.visual_prompt) parts.push(`\n=== VISUAL CREATION PROMPTS ===\n${project.visual_prompt}`);
    if (project.sound_prompt) parts.push(`\n=== SOUND & MUSIC PROMPTS ===\n${project.sound_prompt}`);
    if (project.narration_guide) parts.push(`\n=== NARRATION GUIDE ===\n${project.narration_guide}`);
    if (project.youtube_package) {
      const yp = project.youtube_package;
      parts.push(`\n=== YOUTUBE PACKAGE ===`);
      if (yp.title_primary) parts.push(`Title (EN): ${yp.title_primary}`);
      if (yp.title_secondary) parts.push(`Title (Alt): ${yp.title_secondary}`);
      if (yp.description_primary) parts.push(`\nDescription (EN):\n${yp.description_primary}`);
      if (yp.description_secondary) parts.push(`\nDescription (Alt):\n${yp.description_secondary}`);
      if (yp.tags) parts.push(`\nTags: ${yp.tags}`);
      if (yp.thumbnail_hook_primary) parts.push(`\nThumbnail Hook (EN): ${yp.thumbnail_hook_primary}`);
      if (yp.thumbnail_hook_secondary) parts.push(`Thumbnail Hook (Alt): ${yp.thumbnail_hook_secondary}`);
    }
    return parts.join('\n');
  };

  const copyAll = () => {
    const text = buildFullText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast.success('Full blueprint copied!');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const download = () => {
    const text = buildFullText();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(project.title || 'blueprint').replace(/\s+/g, '_')}_blueprint.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Blueprint downloaded!');
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
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/projects">
          <Button variant="outline" className="border-border/50">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-6">
            <Link to={`/project/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Guided Mode
            </Link>
            <span className="text-border/60">·</span>
            <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Projects</Link>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h1 className="font-playfair text-3xl sm:text-4xl font-bold truncate">{project.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {project.project_type && (
                  <Badge variant="outline" className="capitalize border-border/50">{project.project_type.replace(/_/g, ' ')}</Badge>
                )}
                {project.audience && (
                  <Badge variant="outline" className="capitalize border-border/50">{project.audience}</Badge>
                )}
                {project.languages?.length > 0 && (
                  <Badge variant="outline" className="border-border/50">{project.languages.join(' + ')}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={copyAll} className="border-border/50 text-sm h-9">
                {copiedAll ? <Check className="w-4 h-4 mr-1.5 text-green-400" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copiedAll ? 'Copied' : 'Copy All'}
              </Button>
              <Button onClick={download} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9">
                <Download className="w-4 h-4 mr-1.5" /> Download
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Cinematic Workspace Nav */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.07] mb-6">
          <CinematicWorkspaceNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="p-5"
          >
            {activeTab === 'story' && (
              project.master_prompt
                ? <CopyBlock label="🎬 Master Story Prompt" content={project.master_prompt} />
                : <EmptyState label="No story prompt available." />
            )}
            {activeTab === 'visual' && (
              project.visual_prompt
                ? <CopyBlock label="🎨 Visual Creation Prompts" content={project.visual_prompt} />
                : <EmptyState label="No visual prompts available." />
            )}
            {activeTab === 'sound' && (
              project.sound_prompt
                ? <CopyBlock label="🎵 Sound & Music Prompts" content={project.sound_prompt} />
                : <EmptyState label="No sound prompts available." />
            )}
            {activeTab === 'narration' && (
              project.narration_guide
                ? <CopyBlock label="🎙️ Narration Delivery Guide" content={project.narration_guide} />
                : <EmptyState label="No narration guide available." />
            )}
            {activeTab === 'youtube' && <YouTubeTab pkg={project.youtube_package} />}
            {activeTab === 'characters' && (
              isPaid || isAdmin ? (
                <CharacterHub project={project} />
              ) : <PaidGate icon={Lock} color="primary" title="Character Hub — Paid Feature" desc="Upgrade to manage and lock character identities for visual consistency." />
            )}
            {activeTab === 'world' && (
              isPaid || isAdmin ? (
                <WorldMemoryHub project={project} />
              ) : <PaidGate icon={Globe} color="sky" title="World Memory — Paid Feature" desc="Upgrade to lock locations, environments, and cinematic continuity across all scenes." />
            )}
            {activeTab === 'images'    && <ImageWorkspace project={project} user={user} isAdmin={isAdmin} />}
            {activeTab === 'audio'     && <AudioWorkspace project={project} user={user} isAdmin={isAdmin} />}
            {activeTab === 'animate'   && <VideoWorkspace project={project} user={user} isAdmin={isAdmin} />}
            {activeTab === 'export'    && <ExportWorkspace project={project} user={user} isAdmin={isAdmin} />}
          </motion.div>
        </div>

        {/* Next Steps — AI tools to bring the blueprint to life */}
        <NextSteps project={project} />
      </div>
    </div>
  );
}

export default function ViewBlueprint() {
  return <ViewBlueprintInner />;
}