'use client';

import { useState, useCallback, useEffect } from 'react';
import { useFileStore, useUploadStore } from '@/store';
import { filesApi } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { X, Upload, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function UploadModal() {
  const { isUploadModalOpen, setUploadModalOpen, currentFolderId } = useFileStore();
  const { uploads, addUpload, updateUpload, removeUpload, clearCompleted } = useUploadStore();
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      for (const file of acceptedFiles) {
        const uploadId = `upload-${Date.now()}-${file.name}`;
        addUpload({
          id: uploadId,
          fileName: file.name,
          fileSize: file.size,
          progress: 0,
          status: 'pending',
        });

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
      setIsUploading(false);
    },
    [currentFolderId, addUpload, updateUpload, queryClient],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
  });

  const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending');
  const completedUploads = uploads.filter((u) => u.status === 'completed');
  const errorUploads = uploads.filter((u) => u.status === 'error');

  if (!isUploadModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Upload Files</h2>
          <button
            onClick={() => {
              setUploadModalOpen(false);
              clearCompleted();
            }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div className="p-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click the button below to browse
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = (event) => {
                  const files = Array.from((event.target as HTMLInputElement).files || []);
                  onDrop(files);
                };
                input.click();
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Browse Files
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
              >
                {upload.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : upload.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{upload.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(upload.fileSize)}
                    {upload.status === 'uploading' && ` - ${upload.progress}%`}
                    {upload.status === 'error' && ` - ${upload.error}`}
                  </p>
                  {(upload.status === 'uploading' || upload.status === 'pending') && (
                    <div className="w-full h-1 bg-secondary rounded-full mt-1">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeUpload(upload.id)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} in queue
          </p>
          <button
            onClick={() => {
              setUploadModalOpen(false);
              clearCompleted();
            }}
            className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
