import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, ImageIcon, Video, Music, Package,
  Download, Trash2, Check, X, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuthReady } from '@/hooks/useAuthReady';
import { projectsApi } from '@/lib/studio/api';
import {
  projectAssetsApi, deleteProjectAsset,
} from '@/lib/studio/assetStorage';
import QueryErrorState from '@/components/studio/QueryErrorState';

const TYPE_META = {
  image:  { label: 'Images',  icon: ImageIcon },
  video:  { label: 'Videos',  icon: Video },
  audio:  { label: 'Audio',   icon: Music },
  export: { label: 'Exports', icon: Package },
  other:  { label: 'Other',   icon: Package },
};

function Preview({ asset }) {
  if (!asset.public_url) {
    return (
      <div className="aspect-video bg-secondary/40 rounded-lg flex items-center justify-center text-[11px] text-muted-foreground">
        No preview
      </div>
    );
  }
  if (asset.asset_type === 'image') {
    return (
      <img src={asset.public_url} alt={asset.file_name}
        className="aspect-video w-full object-cover rounded-lg bg-black" />
    );
  }
  if (asset.asset_type === 'video') {
    return (
      <video src={asset.public_url} controls preload="metadata"
        className="aspect-video w-full object-cover rounded-lg bg-black" />
    );
  }
  if (asset.asset_type === 'audio') {
    return <audio src={asset.public_url} controls className="w-full h-9" />;
  }
  return (
    <a href={asset.public_url} target="_blank" rel="noreferrer"
      className="text-xs text-primary underline break-all">
      {asset.public_url}
    </a>
  );
}

function statusPill(status) {
  const map = {
    approved: 'bg-emerald-500/15 text-emerald-400',
    draft:    'bg-amber-500/15 text-amber-400',
    rejected: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  );
}

function AssetCard({ asset, onChanged }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);

  const approve = async () => {
    setBusy('approve');
    try {
      const { error } = await projectAssetsApi.approve(asset.id);
      if (error) throw error;
      onChanged?.();
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };
  const unapprove = async () => {
    setBusy('unapprove');
    try {
      const { error } = await projectAssetsApi.unapprove(asset.id);
      if (error) throw error;
      onChanged?.();
    } catch (e) {
      toast({ title: 'Failed', description: e?.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };
  const remove = async () => {
    if (!confirm(`Delete "${asset.file_name}"? This removes the file from storage and the asset record.`)) return;
    setBusy('delete');
    try {
      await deleteProjectAsset(asset);
      toast({ title: 'Deleted' });
      onChanged?.();
    } catch (e) {
      toast({
        title: 'Delete partially failed',
        description: e?.message || 'The storage file may still exist.',
        variant: 'destructive',
      });
    } finally { setBusy(null); }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-2">
      <Preview asset={asset} />
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {statusPill(asset.approval_status)}
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            {asset.asset_type}
          </span>
          {asset.asset_role && (
            <span className="text-[10px] text-muted-foreground">{asset.asset_role}</span>
          )}
        </div>
        <p className="text-xs text-foreground/90 truncate" title={asset.file_name}>
          {asset.file_name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {asset.provider}
          {asset.duration_seconds ? ` · ${Math.round(asset.duration_seconds * 10) / 10}s` : ''}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {asset.approval_status !== 'approved' ? (
          <Button size="sm" className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-600/90 text-white"
            disabled={busy === 'approve'} onClick={approve}>
            {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1"
            disabled={busy === 'unapprove'} onClick={unapprove}>
            {busy === 'unapprove' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Unapprove
          </Button>
        )}
        {asset.public_url && (
          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] gap-1">
            <a href={asset.public_url} target="_blank" rel="noreferrer" download={asset.file_name}>
              <Download className="w-3 h-3" /> Download
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive"
          disabled={busy === 'delete'} onClick={remove}>
          {busy === 'delete' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

export default function ProjectAssets() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();

  const projectQ = useQuery({
    queryKey: ['project', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await projectsApi.get(projectId);
      if (error) throw error; return data;
    },
    enabled: isReady && !!user && !!projectId,
  });
  const assetsQ = useQuery({
    queryKey: ['project-assets', projectId, user?.id],
    queryFn: async () => {
      const { data, error } = await projectAssetsApi.listByProject(projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: isReady && !!user && !!projectId,
  });

  const assets = assetsQ.data ?? [];
  const grouped = useMemo(() => {
    const g = { image: [], video: [], audio: [], export: [], other: [] };
    for (const a of assets) {
      (g[a.asset_type] ?? g.other).push(a);
    }
    return g;
  }, [assets]);

  if (!isReady || projectQ.isLoading || assetsQ.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (projectQ.isError || assetsQ.isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <QueryErrorState
          title="Couldn't load assets"
          error={projectQ.error || assetsQ.error}
          onRetry={() => assetsQ.refetch()}
        />
      </div>
    );
  }

  const project = projectQ.data;
  const refresh = () => assetsQ.refetch();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to={`/project/${projectId}`}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card/40 p-5 space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Project Asset Library</h1>
        <p className="text-sm text-muted-foreground">
          All files uploaded to <span className="text-foreground/80">{project?.title}</span>.
          Upload buttons live inside each phase (Images, Animate, Audio).
        </p>
        <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Dev/testing storage: files use public preview URLs. A stricter
          per-project policy will replace this in a later step.
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-10 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            No assets uploaded yet. Open the Images, Animate, or Audio phase to upload files.
          </p>
          <Button onClick={() => navigate(`/project/${projectId}`)} className="gap-1.5">
            Go to Project Dashboard
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(TYPE_META).map(([key, meta]) => {
            const list = grouped[key] || [];
            if (list.length === 0) return null;
            const Icon = meta.icon;
            return (
              <section key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    {meta.label} <span className="text-muted-foreground">({list.length})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((a) => (
                    <AssetCard key={a.id} asset={a} onChanged={refresh} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
