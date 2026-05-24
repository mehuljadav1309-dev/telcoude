'use client';

import { useState } from 'react';
import { File } from '@/types';
import { useFileStore } from '@/store';
import { useToggleStar } from '@/hooks/useQueries';
import { getFileIcon, formatFileSize, formatDate, cn } from '@/lib/utils';
import {
  FileIcon,
  ImageIcon,
  VideoIcon,
  Music,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileType,
  Star,
  MoreHorizontal,
  Trash2,
  Download,
  Link,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { FileContextMenu } from './FileContextMenu';

interface FileCardProps {
  file: File;
  variant?: 'grid' | 'row';
}

export function FileCard({ file, variant = 'grid' }: FileCardProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { selectedFiles, setSelectedFiles, setShareModalOpen } = useFileStore();
  const toggleStar = useToggleStar();
  const isSelected = selectedFiles.includes(file.id);

  const icon = getFileIconComponent(file.mimeType);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFiles(
        isSelected
          ? selectedFiles.filter((id) => id !== file.id)
          : [...selectedFiles, file.id],
      );
    } else {
      setSelectedFiles([file.id]);
    }
  };

  const handleDoubleClick = () => {
    if (file.mimeType.startsWith('image/') || file.mimeType.startsWith('video/')) {
      window.open(`/api/v1/stream/${file.id}`, '_blank');
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  if (variant === 'row') {
    return (
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[300px]">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(Number(file.size))}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'group relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/30',
        )}
      >
        {/* Thumbnail or Icon */}
        <div className="w-full aspect-square rounded-lg bg-secondary/50 flex items-center justify-center mb-3 overflow-hidden">
          {file.thumbnail ? (
            <img
              src={`/api/v1/stream/${file.id}`}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-12 h-12">{icon}</div>
          )}
        </div>

        {/* File Info */}
        <div>
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(Number(file.size))}
          </p>
        </div>

        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStar.mutate(file.id);
          }}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all',
            file.isStarred ? 'opacity-100 text-yellow-500' : 'hover:bg-background/80',
          )}
        >
          <Star className="w-3.5 h-3.5" fill={file.isStarred ? 'currentColor' : 'none'} />
        </button>
      </div>

      {contextMenu && (
        <FileContextMenu
          file={file}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

function getFileIconComponent(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-500" />;
  if (mimeType.startsWith('video/')) return <VideoIcon className="w-6 h-6 text-purple-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-green-500" />;
  if (mimeType.includes('pdf')) return <FileType className="w-6 h-6 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar'))
    return <FileArchive className="w-6 h-6 text-yellow-500" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
  if (mimeType.includes('text') || mimeType.includes('document'))
    return <FileText className="w-6 h-6 text-gray-500" />;
  return <FileIcon className="w-6 h-6 text-gray-400" />;
}
