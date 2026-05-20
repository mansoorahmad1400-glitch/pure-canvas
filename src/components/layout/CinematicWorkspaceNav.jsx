import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, FileText, Users, ImageIcon, Video,
  Music, Mic, Youtube, Package,
  Globe, ChevronDown, MoreHorizontal, Clapperboard
} from 'lucide-react';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const PRIMARY_TABS = [
  { id: 'story',      label: 'Story',      icon: Film,         color: 'text-amber-400'  },
  { id: 'visual',     label: 'Visual',     icon: FileText,     color: 'text-sky-400'    },
  { id: 'characters', label: 'Characters', icon: Users,        color: 'text-violet-400' },
  { id: 'storyboard', label: 'Storyboard', icon: Clapperboard, color: 'text-yellow-400' },
  { id: 'images',     label: 'Images',     icon: ImageIcon,    color: 'text-emerald-400'},
  { id: 'animate',    label: 'Animate',    icon: Video,        color: 'text-rose-400'   },
];

const SECONDARY_TABS = [
  { id: 'sound',     label: 'Sound',     icon: Music,    color: 'text-blue-400'   },
  { id: 'narration', label: 'Narration', icon: Mic,      color: 'text-cyan-400'   },
  { id: 'audio',     label: 'Audio',     icon: Mic,      color: 'text-teal-400'   },
  { id: 'youtube',   label: 'YouTube',   icon: Youtube,  color: 'text-red-400'    },
  { id: 'export',    label: 'Export',    icon: Package,  color: 'text-orange-400' },
];

const ADVANCED_TABS = [
  { id: 'world',     label: 'World',     icon: Globe,    color: 'text-sky-300'    },
];

// ─── Indicator dot for active secondary/advanced tabs ─────────────────────────
function ActiveDot() {
  return <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />;
}

// ─── Dropdown menu ────────────────────────────────────────────────────────────
function DropdownMenu({ items, activeTab, onSelect, label, icon: Icon, accentColor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = items.some(t => t.id === activeTab);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeItem = items.find(t => t.id === activeTab);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
          isActive
            ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_12px_rgba(250,176,5,0.12)]'
            : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/10'
        }`}
      >
        {isActive && activeItem ? (
          <>
            <activeItem.icon className={`w-3.5 h-3.5 ${activeItem.color}`} />
            <span>{activeItem.label}</span>
          </>
        ) : (
          <>
            <Icon className={`w-3.5 h-3.5 ${accentColor}`} />
            <span>{label}</span>
          </>
        )}
        {isActive && <ActiveDot />}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-1.5 min-w-[160px] rounded-xl border border-white/10 bg-[hsl(220,18%,8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-50 py-1.5 overflow-hidden"
          >
            {items.map(tab => (
              <button
                key={tab.id}
                onClick={() => { onSelect(tab.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 shrink-0 ${tab.color}`} />
                {tab.label}
                {activeTab === tab.id && (
                  <span className="ml-auto w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CinematicWorkspaceNav({ activeTab, onTabChange, isAdmin }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileRef = useRef(null);

  const allTabs = [...PRIMARY_TABS, ...SECONDARY_TABS, ...ADVANCED_TABS];
  const activeTabData = allTabs.find(t => t.id === activeTab);

  useEffect(() => {
    const handler = (e) => { if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const advancedTabs = isAdmin
    ? ADVANCED_TABS
    : ADVANCED_TABS;

  return (
    <div className="sticky top-0 z-30">
      {/* Cinematic blur backdrop */}
      <div className="absolute inset-0 bg-[hsl(220,20%,4%)]/80 backdrop-blur-xl border-b border-white/[0.06]" />

      {/* Desktop nav */}
      <div className="relative hidden sm:flex items-center gap-1 px-1 py-1.5 overflow-x-auto scrollbar-none">
        {/* Primary tabs */}
        <div className="flex items-center gap-0.5">
          {PRIMARY_TABS.map(tab => (
            <PrimaryTabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />

        {/* Secondary dropdown */}
        <DropdownMenu
          items={SECONDARY_TABS}
          activeTab={activeTab}
          onSelect={onTabChange}
          label="Production"
          icon={Package}
          accentColor="text-orange-400"
        />

        {/* Advanced / More dropdown */}
        <DropdownMenu
          items={advancedTabs}
          activeTab={activeTab}
          onSelect={onTabChange}
          label="More"
          icon={MoreHorizontal}
          accentColor="text-muted-foreground"
        />

        {/* Active tab glow trace — thin bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      {/* Mobile nav */}
      <div className="relative sm:hidden" ref={mobileRef}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5"
        >
          <div className="flex items-center gap-2">
            {activeTabData && (
              <>
                <activeTabData.icon className={`w-4 h-4 ${activeTabData.color}`} />
                <span className="text-sm font-semibold text-foreground">{activeTabData.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-[10px]">All Tools</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden border-t border-white/[0.06] bg-[hsl(220,18%,5%)]/95 backdrop-blur-xl"
            >
              <div className="px-3 py-3 space-y-1">
                <MobileSection label="Primary" tabs={PRIMARY_TABS} activeTab={activeTab} onSelect={(id) => { onTabChange(id); setMobileMenuOpen(false); }} />
                <div className="h-px bg-white/[0.06] my-2" />
                <MobileSection label="Production" tabs={SECONDARY_TABS} activeTab={activeTab} onSelect={(id) => { onTabChange(id); setMobileMenuOpen(false); }} />
                <div className="h-px bg-white/[0.06] my-2" />
                <MobileSection label="Advanced" tabs={advancedTabs} activeTab={activeTab} onSelect={(id) => { onTabChange(id); setMobileMenuOpen(false); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PrimaryTabButton({ tab, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
        isActive
          ? 'bg-primary/12 border-primary/25 text-primary shadow-[0_0_16px_rgba(250,176,5,0.1)]'
          : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/8'
      }`}
    >
      <tab.icon className={`w-3.5 h-3.5 transition-colors duration-200 ${isActive ? 'text-primary' : tab.color + '/60'}`} />
      <span>{tab.label}</span>
      {isActive && (
        <motion.div
          layoutId="primary-active-indicator"
          className="absolute bottom-0 left-2 right-2 h-px bg-primary/60 rounded-full"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
    </button>
  );
}

function MobileSection({ label, tabs, activeTab, onSelect }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest px-1 mb-1.5">{label}</p>
      <div className="grid grid-cols-3 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-medium transition-all border ${
              activeTab === tab.id
                ? 'bg-primary/12 border-primary/25 text-primary'
                : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : tab.color}`} />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}