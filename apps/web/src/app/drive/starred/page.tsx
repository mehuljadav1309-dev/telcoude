'use client';

import { useFiles } from '@/hooks/useQueries';
import { FileGrid } from '@/components/files/FileGrid';
import { FileList } from '@/components/files/FileList';
import { EmptyState } from '@/components/files/EmptyState';
import { useFileStore } from '@/store';
import { Loader2 } from 'lucide-react';

export default function StarredPage() {
  const { viewMode } = useFileStore();
  const { data, isLoading } = useFiles({ starred: true, limit: 100 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const files = data?.data || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Starred</h1>
      {files.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid folders={[]} files={files} />
        ) : (
          <FileList folders={[]} files={files} />
        )
      ) : (
        <EmptyState
          title="No starred files"
          description="Star important files to find them quickly"
        />
      )}
    </div>
  );
}
