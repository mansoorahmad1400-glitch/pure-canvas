/**
 * MobileSelect — renders a native Bottom Sheet (Drawer) on mobile,
 * and the standard shadcn Select on desktop.
 *
 * Drop-in replacement API:
 *   value, onValueChange, placeholder, options: [{ value, label }], className, disabled
 */
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Check, ChevronDown } from 'lucide-react';

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

export default function MobileSelect({ value, onValueChange, placeholder = 'Select...', options = [], className = '', disabled = false }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: bottom-sheet drawer
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`select-none flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background/60 px-3 py-2 text-sm shadow-sm focus:outline-none disabled:opacity-50 ${className}`}
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {placeholder}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1 overflow-y-auto max-h-[60vh]">
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onValueChange(o.value); setOpen(false); }}
                  className={`select-none w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98] ${
                    active
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-secondary/40 text-foreground hover:bg-secondary/70 border border-transparent'
                  }`}
                >
                  <span>{o.label}</span>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}