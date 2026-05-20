import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Camera, Clapperboard, Clock, MapPin, Users, ChevronDown, ChevronUp,
  Copy, Trash2, Check, Pencil, Film, Zap
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CAMERA_LABELS = {
  wide_shot: 'Wide Shot', medium_shot: 'Medium Shot', close_up: 'Close Up',
  extreme_close_up: 'Extreme CU', birds_eye: "Bird's Eye", low_angle: 'Low Angle',
  dutch_angle: 'Dutch Angle', tracking_shot: 'Tracking', dolly_in: 'Dolly In',
  dolly_out: 'Dolly Out', pan_left: 'Pan Left', pan_right: 'Pan Right',
  tilt_up: 'Tilt Up', tilt_down: 'Tilt Down', aerial: 'Aerial', over_shoulder: 'Over Shoulder',
};
const TRANSITION_LABELS = {
  cut: 'Cut', fade: 'Fade', dissolve: 'Dissolve', wipe: 'Wipe',
  iris: 'Iris', match_cut: 'Match Cut', smash_cut: 'Smash Cut',
  cross_dissolve: 'Cross Dissolve', flash: 'Flash', zoom_transition: 'Zoom',
};
const PACING_COLORS = {
  slow: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  medium: 'text-green-400 bg-green-500/10 border-green-500/20',
  fast: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  dynamic: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

const CAMERAS = Object.keys(CAMERA_LABELS);
const TRANSITIONS = Object.keys(TRANSITION_LABELS);
const PACINGS = ['slow', 'medium', 'fast', 'dynamic'];
const DURATIONS = [4, 5, 6, 8, 10, 12];

function InlineSelect({ value, options, labelMap, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs bg-card/80 border border-border/40 rounded-lg px-2 py-1 text-foreground focus:outline-none focus:border-primary/50"
    >
      {options.map(o => (
        <option key={o} value={o}>{labelMap ? labelMap[o] : o}</option>
      ))}
    </select>
  );
}

export default function StoryboardDirectorSceneCard({ scene, index, onUpdate, onDuplicate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localScene, setLocalScene] = useState(scene);
  const [editField, setEditField] = useState(null); // 'visual_prompt' | 'motion_prompt' | 'story_text'
  const [editValue, setEditValue] = useState('');

  const isDirty = JSON.stringify(localScene) !== JSON.stringify(scene);

  const startEdit = (field) => {
    setEditField(field);
    setEditValue(localScene[field] || '');
  };

  const saveEdit = () => {
    setLocalScene(prev => ({ ...prev, [editField]: editValue }));
    setEditField(null);
    handleSave({ [editField]: editValue });
  };

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    const updates = { ...localScene, ...overrides };
    try {
      await base44.functions.invoke('storyboardDirector', {
        action: 'update_scene',
        project_id: scene.project_id,
        scene_id: scene.id,
        updates,
      });
      onUpdate(scene.id, updates);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...localScene, [field]: value };
    setLocalScene(updated);
    handleSave(updated);
  };

  const handleApprove = async () => {
    await handleSave({ approved: !localScene.approved });
    setLocalScene(prev => ({ ...prev, approved: !prev.approved }));
    onUpdate(scene.id, { ...localScene, approved: !localScene.approved });
    toast.success(localScene.approved ? 'Scene unapproved' : 'Scene approved ✓');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border overflow-hidden transition-all ${
        localScene.approved
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-border/40 bg-card/50'
      }`}
    >
      {/* Scene Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{localScene.scene_number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">Scene {localScene.scene_number}</span>
            <Badge className={`text-[10px] border px-1.5 py-0 ${PACING_COLORS[localScene.pacing] || PACING_COLORS.medium}`}>
              {localScene.pacing}
            </Badge>
            <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground px-1.5 py-0">
              <Clock className="w-2.5 h-2.5 mr-1" />{localScene.scene_duration}s
            </Badge>
            {localScene.approved && (
              <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/25 px-1.5 py-0">
                <Check className="w-2.5 h-2.5 mr-1" />Approved
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {localScene.story_text?.slice(0, 90) || localScene.visual_prompt?.slice(0, 90)}…
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onDuplicate(scene.id)}
            className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors rounded"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(scene.id)}
            className="p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors rounded"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Cinematic bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-background/20 border-b border-border/15 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Camera className="w-3 h-3 text-muted-foreground/50" />
          <InlineSelect
            value={localScene.camera_direction}
            options={CAMERAS}
            labelMap={CAMERA_LABELS}
            onChange={v => handleFieldChange('camera_direction', v)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Film className="w-3 h-3 text-muted-foreground/50" />
          <InlineSelect
            value={localScene.transition_type}
            options={TRANSITIONS}
            labelMap={TRANSITION_LABELS}
            onChange={v => handleFieldChange('transition_type', v)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-muted-foreground/50" />
          <InlineSelect
            value={localScene.pacing}
            options={PACINGS}
            onChange={v => handleFieldChange('pacing', v)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground/50" />
          <select
            value={localScene.scene_duration}
            onChange={e => handleFieldChange('scene_duration', Number(e.target.value))}
            className="text-xs bg-card/80 border border-border/40 rounded-lg px-2 py-1 text-foreground focus:outline-none"
          >
            {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Story Text */}
          <EditableField
            label="Story Text"
            icon={<Clapperboard className="w-3 h-3" />}
            value={localScene.story_text}
            isEditing={editField === 'story_text'}
            editValue={editValue}
            onEdit={() => startEdit('story_text')}
            onChangeEdit={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditField(null)}
          />

          {/* Visual Prompt */}
          <EditableField
            label="Visual Prompt"
            icon={<Camera className="w-3 h-3" />}
            value={localScene.visual_prompt}
            isEditing={editField === 'visual_prompt'}
            editValue={editValue}
            onEdit={() => startEdit('visual_prompt')}
            onChangeEdit={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditField(null)}
            highlight
          />

          {/* Motion Prompt */}
          <EditableField
            label="Motion / Animation"
            icon={<Film className="w-3 h-3" />}
            value={localScene.motion_prompt}
            isEditing={editField === 'motion_prompt'}
            editValue={editValue}
            onEdit={() => startEdit('motion_prompt')}
            onChangeEdit={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditField(null)}
          />

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 pt-1">
            {localScene.detected_characters?.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" />
                {localScene.detected_characters.join(', ')}
              </div>
            )}
            {localScene.detected_location && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {localScene.detected_location}
              </div>
            )}
          </div>

          {/* Approve button */}
          <div className="pt-1">
            <Button
              size="sm"
              onClick={handleApprove}
              className={`h-7 text-xs gap-1.5 ${
                localScene.approved
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                  : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              }`}
              variant="ghost"
            >
              <Check className="w-3 h-3" />
              {localScene.approved ? 'Approved' : 'Approve Scene'}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EditableField({ label, icon, value, isEditing, editValue, onEdit, onChangeEdit, onSave, onCancel, highlight }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {icon}{label}
        </div>
        {!isEditing && (
          <button onClick={onEdit} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={e => onChangeEdit(e.target.value)}
            className="text-xs min-h-[80px] resize-none bg-background/60 border-border/50 focus:border-primary/50"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} className="h-6 text-[11px] bg-primary hover:bg-primary/90">Save</Button>
            <Button size="sm" variant="ghost" onClick={onCancel} className="h-6 text-[11px]">Cancel</Button>
          </div>
        </div>
      ) : (
        <p className={`text-xs leading-relaxed ${highlight ? 'text-foreground/90' : 'text-muted-foreground'}`}>
          {value || <span className="italic text-muted-foreground/40">Not set</span>}
        </p>
      )}
    </div>
  );
}