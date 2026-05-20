import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Code2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CodeDownloadButton() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('exportCode', { action: 'prepare_download' });
      
      if (!res.data?.data) {
        toast.error('Failed to prepare download');
        setLoading(false);
        return;
      }

      // Decode base64 and create download
      const binaryString = atob(res.data.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Code structure exported! Ready to vibe-code with Claude.');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      title="Export code structure as JSON for vibe-coding"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Code2 className="w-4 h-4" />
          <span className="hidden sm:inline">Download Code</span>
        </>
      )}
    </Button>
  );
}