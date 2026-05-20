import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Sparkles, Film, ImageIcon, Music, Mic, Youtube,
  ExternalLink, Video, BookOpen, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';


const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay, ease: 'easeOut' },
});

// Tool alternatives per category
const TOOL_GROUPS = [
  {
    id: 'video',
    icon: Video,
    label: 'Video & Image Generation',
    desc: 'Use your Visual Prompts to generate scenes',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
    tools: [
      { name: 'Grok Aurora', url: 'https://grok.com', note: 'Free tier available' },
      { name: 'Meta AI (Imagine)', url: 'https://imagine.meta.com', note: 'Free, by Meta' },
      { name: 'Kling AI', url: 'https://klingai.com', note: 'Video from prompts' },
      { name: 'Runway ML', url: 'https://runwayml.com', note: 'Professional video AI' },
      { name: 'Pika Labs', url: 'https://pika.art', note: 'Text to video' },
      { name: 'Leonardo AI', url: 'https://leonardo.ai', note: 'Image generation' },
    ],
  },
  {
    id: 'music',
    icon: Music,
    label: 'Music & Sound Generation',
    desc: 'Use your Sound Prompts to create background music',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/25',
    tools: [
      { name: 'Suno AI', url: 'https://suno.com', note: 'Free tier available' },
      { name: 'Udio', url: 'https://udio.com', note: 'High quality music AI' },
      { name: 'Meta MusicGen', url: 'https://audiocraft.metademolab.com', note: 'Free, by Meta' },
      { name: 'Mubert', url: 'https://mubert.com', note: 'Royalty-free AI music' },
      { name: 'Soundraw', url: 'https://soundraw.io', note: 'Customizable AI music' },
    ],
  },
  {
    id: 'voice',
    icon: Mic,
    label: 'Voice & Narration',
    desc: 'Use your Narration Guide to generate voiceover',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    tools: [
      { name: 'ElevenLabs', url: 'https://elevenlabs.io', note: 'Most realistic voices' },
      { name: 'Meta Voicebox', url: 'https://ai.meta.com/blog/voicebox-generative-ai-model-speech', note: 'By Meta' },
      { name: 'Play.ht', url: 'https://play.ht', note: 'Free tier available' },
      { name: 'Murf AI', url: 'https://murf.ai', note: 'Studio-quality voices' },
      { name: 'LOVO AI', url: 'https://lovo.ai', note: 'Multilingual voices' },
    ],
  },
];

const STEPS = [
  {
    num: '01',
    icon: Sparkles,
    title: 'Generate Your Blueprint',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    description: 'Open the Studio tab. Enter your idea, pick a story type, visual style, audience, and language — then tap Generate. Your full blueprint is ready in seconds.',
    tips: [
      'Be specific: "A brave fox rescuing a lost cub in an enchanted forest" beats "A fox story"',
      'Use Advanced mode for longer, more detailed scenes',
      'Pick 2 languages for bilingual narration — great for YouTube reach',
    ],
  },
  {
    num: '02',
    icon: Film,
    title: 'Review Your 5 Blueprint Tabs',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    description: 'Your blueprint has 5 tabs — each feeds a different tool in your production workflow:',
    tabs: [
      { icon: Film,      label: 'Story',     desc: 'Scene-by-scene narrative master prompt' },
      { icon: ImageIcon, label: 'Visual',    desc: 'Paste into any image/video AI tool' },
      { icon: Music,     label: 'Sound',     desc: 'Paste into any AI music generator' },
      { icon: Mic,       label: 'Narration', desc: 'Paste into any text-to-speech tool' },
      { icon: Youtube,   label: 'YouTube',   desc: 'Ready titles, descriptions, tags & hooks' },
    ],
  },
  {
    num: '03',
    icon: Video,
    title: 'Create Video Scenes',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    description: 'Copy the Visual Prompts from your blueprint and paste them into any AI video/image tool of your choice.',
    steps: [
      'Open the Visual tab in your blueprint',
      'Tap the copy button',
      'Open your preferred AI video tool (see options below)',
      'Paste the prompt and generate each scene',
      'Download and save each scene clip or image',
    ],
    toolGroup: 'video',
    tip: '💡 Add "cinematic, 4K, dramatic lighting" to any visual prompt for better results.',
  },
  {
    num: '04',
    icon: Music,
    title: 'Generate Background Music',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    description: 'Copy the Sound & Music prompts and paste them into any AI music tool. Generate a track per scene or one full-length piece.',
    steps: [
      'Open the Sound tab in your blueprint',
      'Copy the music style description',
      'Open your preferred music AI (see options below)',
      'Paste the description and generate',
      'Download the music track',
    ],
    toolGroup: 'music',
    tip: '💡 Generate 3–4 variations per scene and pick the best fit.',
  },
  {
    num: '05',
    icon: Mic,
    title: 'Add Narration',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    description: 'The Narration Guide has scene-by-scene text with emotion cues. Paste it into any voice AI to create the perfect narration.',
    steps: [
      'Open the Narration tab in your blueprint',
      'Copy the narration text',
      'Open your preferred voice AI (see options below)',
      'Pick a voice and adjust emotion/style',
      'Download the audio for each scene',
    ],
    toolGroup: 'voice',
    tip: '💡 Use the same voice across all scenes for consistency.',
  },
  {
    num: '06',
    icon: Youtube,
    title: 'Assemble & Upload to YouTube',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    description: 'Combine your scenes, music, and narration in any video editor. Then use the YouTube tab to upload with everything pre-written.',
    steps: [
      'Edit your video in CapCut, DaVinci, Premiere, or any editor',
      'Open the YouTube tab in your blueprint',
      'Copy the title, description, and tags',
      'Paste directly into YouTube Studio',
      'Use the Thumbnail Hook as your thumbnail headline',
    ],
    tip: '💡 Add both language descriptions to reach international audiences.',
  },
];

function ToolGroupExpander({ groupId }) {
  const [open, setOpen] = useState(false);
  const group = TOOL_GROUPS.find(g => g.id === groupId);
  if (!group) return null;
  return (
    <div className={`rounded-xl border ${group.border} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 ${group.bg} text-left`}
      >
        <span className={`text-xs font-bold ${group.color}`}>Choose your tool — {group.tools.length} options</span>
        {open ? <ChevronUp className={`w-4 h-4 ${group.color}`} /> : <ChevronDown className={`w-4 h-4 ${group.color}`} />}
      </button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border-t border-border/30">
          {group.tools.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${group.border} ${group.bg} hover:opacity-80 transition-opacity`}
            >
              <div>
                <p className={`text-xs font-bold ${group.color}`}>{tool.name}</p>
                <p className="text-[10px] text-muted-foreground">{tool.note}</p>
              </div>
              <ExternalLink className={`w-3.5 h-3.5 ${group.color} shrink-0`} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Tutorial() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-16 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-5">
            <BookOpen className="w-3.5 h-3.5" /> Complete Workflow Guide
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-bold mb-3">
            From Idea to<br /><span className="text-primary">Published Video</span>
          </h1>
          <p className="text-muted-foreground text-base mb-6 max-w-md mx-auto">
            Generate your blueprint in StudioOne AI, then use <strong>any AI tool you prefer</strong> to bring it to life.
          </p>
          <Link to="/studio">
            <Button className="h-10 px-7 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
              <Sparkles className="w-4 h-4 mr-2" /> Start Creating
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Demo Videos */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Video 1 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <p className="text-sm font-semibold text-foreground text-center mb-2">📱 How to Use the App & Generate a Project</p>
              <video
                src="https://media.base44.com/videos/public/69beca883f9aef74a54f435d/8e330127e_Screenrecorder-2026-05-10-14-23-30-640.mp4"
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full rounded-2xl border border-border/50 shadow-2xl"
              />
            </motion.div>
            {/* Video 2 */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <p className="text-sm font-semibold text-foreground text-center mb-2">🎬 How to Create a Video from Your Blueprint</p>
              <video
                src="https://media.base44.com/videos/public/69beca883f9aef74a54f435d/e268804b1_Screenrecorder-2026-05-10-14-48-56-333.mp4"
                controls
                muted
                loop
                playsInline
                className="w-full rounded-2xl border border-border/50 shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tool options overview */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-4">Use Any Tool You Prefer</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOOL_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div key={group.id} className={`p-4 rounded-xl border ${group.border} ${group.bg}`}>
                  <Icon className={`w-5 h-5 ${group.color} mb-2`} />
                  <p className={`text-sm font-bold ${group.color}`}>{group.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{group.tools.length} tool options</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step-by-step */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.num} {...fadeUp(i * 0.04)}>
                <div className={`rounded-2xl border ${step.border} bg-card/50 overflow-hidden`}>
                  <div className={`flex items-center gap-3 px-5 py-4 border-b ${step.border} ${step.bg}`}>
                    <div className={`w-9 h-9 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${step.color}`} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Step {step.num}</span>
                      <h2 className="font-playfair text-lg font-bold text-foreground leading-tight">{step.title}</h2>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

                    {step.tabs && (
                      <div className="space-y-1.5">
                        {step.tabs.map((t) => {
                          const TIcon = t.icon;
                          return (
                            <div key={t.label} className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/40">
                              <TIcon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-foreground">{t.label} — </span>
                                <span className="text-xs text-muted-foreground">{t.desc}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {step.steps && (
                      <ol className="space-y-1.5">
                        {step.steps.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${step.bg} ${step.color}`}>
                              {idx + 1}
                            </span>
                            <span className="text-muted-foreground">{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {step.tips && (
                      <ul className="space-y-1.5">
                        {step.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}

                    {step.tip && (
                      <div className={`text-xs ${step.color} ${step.bg} border ${step.border} rounded-xl px-3 py-2.5`}>
                        {step.tip}
                      </div>
                    )}

                    {step.toolGroup && <ToolGroupExpander groupId={step.toolGroup} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 px-4 border-t border-border/40 text-center">
        <motion.div {...fadeUp()}>
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold mb-3">Ready to create your first video?</h2>
          <p className="text-muted-foreground mb-7 text-sm">Generate your blueprint in seconds, then use any AI tool you love.</p>
          <Link to="/studio">
            <Button className="h-11 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
              <Sparkles className="w-4 h-4 mr-2" /> Open Studio
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}