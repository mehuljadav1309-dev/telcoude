'use client';

import { ReactNode, useCallback } from 'react';
import { useFileStore } from '@/store';
import { useUploadStore, UploadProgress } from '@/store';
import { filesApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DropzoneProps {
  children: ReactNode;
}

export function Dropzone({ children }: DropzoneProps) {
  const { currentFolderId } = useFileStore();
  const { addUpload, updateUpload, removeUpload } = useUploadStore();
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const uploadId = `upload-${Date.now()}-${file.name}`;
        const upload: UploadProgress = {
          id: uploadId,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'pending',
        };
        addUpload(upload);

        try {
          updateUpload(uploadId, { status: 'uploading' });

          await filesApi.upload(file, currentFolderId || undefined, (progress) => {
            updateUpload(uploadId, { progress });
          });

          updateUpload(uploadId, { status: 'completed', progress: 100 });
          toast.success(`Uploaded ${file.name}`);
        } catch (error: any) {
          updateUpload(uploadId, {
            status: 'error',
            error: error?.message || 'Upload failed',
          });
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
    [currentFolderId, addUpload, updateUpload, removeUpload, queryClient],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()} className="relative min-h-full">
      <input {...getInputProps()} />
      {children}
      {isDragActive && (
        <div className="absolute inset-0 z-50 dropzone-overlay rounded-2xl flex items-center justify-center">
          <div className="bg-card border-2 border-dashed border-primary rounded-2xl p-12 text-center shadow-xl">
            <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Drop files to upload</h3>
            <p className="text-muted-foreground text-sm">
              Files will be stored in your Telegram account
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
