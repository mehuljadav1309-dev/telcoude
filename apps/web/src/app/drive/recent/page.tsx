'use client';

import { useRecentFiles } from '@/hooks/useQueries';
import { FileGrid } from '@/components/files/FileGrid';
import { FileList } from '@/components/files/FileList';
import { EmptyState } from '@/components/files/EmptyState';
import { useFileStore } from '@/store';
import { Loader2 } from 'lucide-react';

export default function RecentPage() {
  const { viewMode } = useFileStore();
  const { data: files, isLoading } = useRecentFiles(50);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Recent</h1>
      {files && files.length > 0 ? (
        viewMode === 'grid' ? (
          <FileGrid folders={[]} files={files} />
        ) : (
          <FileList folders={[]} files={files} />
        )
      ) : (
        <EmptyState
          title="No recent files"
          description="Files you recently viewed or edited will appear here"
        />
      )}
    </div>
  );
}
