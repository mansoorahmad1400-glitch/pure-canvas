import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function MobileHeader({ title, backTo }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-16 z-40 md:hidden">
      <button
        onClick={handleBack}
        className="select-none flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      {title && (
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      )}
    </div>
  );
}