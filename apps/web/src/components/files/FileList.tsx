'use client';

import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
import type { File, Folder } from '@/types';

interface FileListProps {
  folders: Folder[];
  files: File[];
}

export function FileList({ folders, files }: FileListProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
              Type
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
              Size
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
              Modified
            </th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {folders.map((folder) => (
            <FolderRow key={folder.id} folder={folder} />
          ))}
          {files.map((file) => (
            <FileRow key={file.id} file={file} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FolderRow({ folder }: { folder: Folder }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <FolderCard folder={folder} variant="row" />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
        Folder
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">
        —
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden lg:table-cell">
        {new Date(folder.updatedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3" />
    </tr>
  );
}

function FileRow({ file }: { file: File }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <FileCard file={file} variant="row" />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
        {file.mimeType.split('/')[1]?.toUpperCase() || file.extension.toUpperCase()}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden md:table-cell">
        {formatFileSize(Number(file.size))}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground text-right hidden lg:table-cell">
        {new Date(file.updatedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3" />
    </tr>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
