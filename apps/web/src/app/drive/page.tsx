'use client';

import { useFolderContents } from '@/hooks/useQueries';
import { useFileStore } from '@/store';
import { FileGrid } from '@/components/files/FileGrid';
import { FileList } from '@/components/files/FileList';
import { EmptyState } from '@/components/files/EmptyState';
import { Dropzone } from '@/components/upload/Dropzone';
import { Loader2 } from 'lucide-react';

export default function DrivePage() {
  const { currentFolderId, viewMode, sortField, sortOrder, searchQuery } = useFileStore();
  const { data, isLoading, error } = useFolderContents(currentFolderId || undefined);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load files</p>
      </div>
    );
  }

  const hasContent =
    data && (data.folders.length > 0 || data.files.length > 0);

  return (
    <Dropzone>
      {hasContent ? (
        viewMode === 'grid' ? (
          <FileGrid folders={data!.folders} files={data!.files} />
        ) : (
          <FileList folders={data!.folders} files={data!.files} />
        )
      ) : (
        <EmptyState
          title={currentFolderId ? 'This folder is empty' : 'Welcome to Telegram Drive'}
          description={
            currentFolderId
              ? 'Drag & drop files here or use the upload button'
              : 'Upload your first file to get started with Telegram-powered cloud storage'
          }
        />
      )}
    </Dropzone>
  );
}
