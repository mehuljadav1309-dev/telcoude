'use client';

import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
import type { File, Folder } from '@/types';

interface FileGridProps {
  folders: Folder[];
  files: File[];
}

export function FileGrid({ folders, files }: FileGridProps) {
  return (
    <div className="space-y-6">
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div>
          {folders.length > 0 && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Files ({files.length})
            </h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
