'use client';

import { useEffect, useRef } from 'react';
import { File } from '@/types';
import { useFileStore, useUploadStore } from '@/store';
import { useDeleteFile, useToggleStar, useRenameFile } from '@/hooks/useQueries';
import {
  Download,
  Star,
  Trash2,
  Link,
  Copy,
  FileEdit,
  Info,
  Share2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileContextMenuProps {
  file: File;
  position: { x: number; y: number };
  onClose: () => void;
}

export function FileContextMenu({ file, position, onClose }: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { setShareModalOpen } = useFileStore();
  const toggleStar = useToggleStar();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const menuItems = [
    {
      label: 'Download',
      icon: Download,
      onClick: () => {
        window.open(`/api/v1/stream/${file.id}`, '_blank');
        onClose();
      },
    },
    {
      label: file.isStarred ? 'Unstar' : 'Star',
      icon: Star,
      onClick: () => {
        toggleStar.mutate(file.id);
        onClose();
      },
    },
    {
      label: 'Share',
      icon: Share2,
      onClick: () => {
        setShareModalOpen(true, file.id);
        onClose();
      },
    },
    {
      label: 'Rename',
      icon: FileEdit,
      onClick: () => {
        const newName = prompt('Enter new name:', file.name);
        if (newName && newName !== file.name) {
          renameFile.mutate({ fileId: file.id, name: newName });
        }
        onClose();
      },
    },
    {
      label: 'Copy link',
      icon: Link,
      onClick: () => {
        navigator.clipboard.writeText(`${window.location.origin}/api/v1/stream/${file.id}`);
        toast.success('Link copied to clipboard');
        onClose();
      },
    },
    { type: 'separator' },
    {
      label: 'Move to trash',
      icon: Trash2,
      onClick: () => {
        deleteFile.mutate(file.id);
        toast.success('Moved to trash');
        onClose();
      },
      danger: true,
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 w-56 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in"
      style={{
        left: Math.min(position.x, window.innerWidth - 240),
        top: Math.min(position.y, window.innerHeight - 400),
      }}
    >
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
        </p>
      </div>
      {menuItems.map((item, i) =>
        'type' in item && item.type === 'separator' ? (
          <div key={i} className="h-px bg-border my-1" />
        ) : (
          <button
            key={i}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors',
              (item as any).danger
                ? 'text-destructive hover:bg-destructive/10'
                : 'hover:bg-accent',
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
