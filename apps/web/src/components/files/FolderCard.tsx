'use client';

import { Folder } from '@/types';
import { useFileStore } from '@/store';
import { useFolderContents } from '@/hooks/useQueries';
import { cn } from '@/lib/utils';
import { Folder as FolderIcon, ChevronRight, MoreHorizontal, Star } from 'lucide-react';

interface FolderCardProps {
  folder: Folder;
  variant?: 'grid' | 'row';
}

export function FolderCard({ folder, variant = 'grid' }: FolderCardProps) {
  const { setCurrentFolder, selectedFolders, setSelectedFolders } = useFileStore();
  const isSelected = selectedFolders.includes(folder.id);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedFolders(
        isSelected
          ? selectedFolders.filter((id) => id !== folder.id)
          : [...selectedFolders, folder.id],
      );
    } else {
      setSelectedFolders([folder.id]);
    }
  };

  const handleDoubleClick = () => {
    setCurrentFolder(folder.id);
  };

  if (variant === 'row') {
    return (
      <div
        className="flex items-center gap-3 cursor-pointer py-1"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <FolderIcon className="w-5 h-5 text-primary flex-shrink-0" />
        <span className="text-sm font-medium truncate">{folder.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {folder._count?.children || 0} folders, {folder._count?.files || 0} files
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'group relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-primary/30',
      )}
    >
      <div className="w-full aspect-square rounded-lg bg-primary/5 flex items-center justify-center mb-3">
        <FolderIcon className="w-12 h-12 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground">
          {folder._count?.children || 0} folders · {folder._count?.files || 0} files
        </p>
      </div>
    </div>
  );
}
