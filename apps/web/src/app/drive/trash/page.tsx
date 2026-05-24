'use client';

import { useState } from 'react';
import { useFiles, useEmptyTrash } from '@/hooks/useQueries';
import { FileGrid } from '@/components/files/FileGrid';
import { FileList } from '@/components/files/FileList';
import { EmptyState } from '@/components/files/EmptyState';
import { useFileStore } from '@/store';
import { Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TrashPage() {
  const { viewMode } = useFileStore();
  const { data, isLoading } = useFiles({ trashed: true, limit: 100 });
  const emptyTrash = useEmptyTrash();
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const files = data?.data || [];
  const isEmpty = files.length === 0;

  const handleEmptyTrash = async () => {
    try {
      await emptyTrash.mutateAsync();
      toast.success('Trash emptied');
      setShowConfirm(false);
    } catch {
      toast.error('Failed to empty trash');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trash</h1>
        {!isEmpty && (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Empty trash
          </button>
        )}
      </div>

      {!isEmpty ? (
        viewMode === 'grid' ? (
          <FileGrid folders={[]} files={files} />
        ) : (
          <FileList folders={[]} files={files} />
        )
      ) : (
        <EmptyState
          title="Trash is empty"
          description="Deleted files will appear here"
        />
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold">Empty trash?</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. Files will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-border hover:bg-accent transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={emptyTrash.isPending}
                className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {emptyTrash.isPending ? 'Emptying...' : 'Empty trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
