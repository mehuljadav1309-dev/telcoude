'use client';

import { useShares, useDeleteShare } from '@/hooks/useQueries';
import { Loader2, Link, Copy, Trash2, Clock, Lock, Globe } from 'lucide-react';
import { formatDate, formatFileSize, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SharedPage() {
  const { data: shares, isLoading } = useShares();
  const deleteShare = useDeleteShare();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleDelete = (shareId: string) => {
    if (confirm('Delete this share link?')) {
      deleteShare.mutate(shareId);
      toast.success('Share link deleted');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shared Links</h1>

      {shares && shares.length > 0 ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                  File / Folder
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">
                  Permission
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                  Downloads
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                  Expires
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shares.map((share: any) => (
                <tr key={share.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {share.file?.name || share.folder?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {share.file?.mimeType || 'Folder'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {share.permission}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {share.downloadCount}
                    {share.maxDownloads && ` / ${share.maxDownloads}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                    {share.expiresAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(share.expiresAt)}
                      </span>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(share.token)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                        title="Copy link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(share.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                        title="Delete share"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            <Link className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No shared links</h3>
          <p className="text-muted-foreground max-w-md">
            Share files and folders with others via secure links
          </p>
        </div>
      )}
    </div>
  );
}
