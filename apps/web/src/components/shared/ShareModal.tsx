'use client';

import { useState, useEffect } from 'react';
import { useFileStore } from '@/store';
import { useCreateShare } from '@/hooks/useQueries';
import { useFile } from '@/hooks/useQueries';
import { X, Link, Copy, Clock, Lock, Users, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareModal() {
  const { isShareModalOpen, setShareModalOpen, shareTargetId } = useFileStore();
  const { data: file } = useFile(shareTargetId || '');
  const createShare = useCreateShare();

  const [shareUrl, setShareUrl] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [password, setPassword] = useState('');
  const [isCreated, setIsCreated] = useState(false);

  if (!isShareModalOpen) return null;

  const handleCreateLink = async () => {
    try {
      const result = await createShare.mutateAsync({
        fileId: shareTargetId,
        expiresInDays: expiryDays,
        password: password || undefined,
        permission: 'DOWNLOAD',
      });

      const url = `${window.location.origin}/shared/${result.data.data.token}`;
      setShareUrl(url);
      setIsCreated(true);
      toast.success('Share link created!');
    } catch (error) {
      toast.error('Failed to create share link');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Share File</h2>
          <button
            onClick={() => {
              setShareModalOpen(false);
              setIsCreated(false);
              setShareUrl('');
            }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {file && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.mimeType}</p>
              </div>
            </div>
          )}

          {!isCreated ? (
            <>
              {/* Expiry */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Link expiry</label>
                <div className="flex gap-2">
                  {[1, 3, 7, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setExpiryDays(days)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        expiryDays === days
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Password protection (optional)
                </label>
                <input
                  type="text"
                  placeholder="Set a password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleCreateLink}
                disabled={createShare.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {createShare.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                Create Share Link
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Share link created!</span>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm focus:outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires in {expiryDays} day{expiryDays !== 1 ? 's' : ''}
                </span>
                {password && (
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Password protected
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
