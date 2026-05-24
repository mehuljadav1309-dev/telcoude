export interface User {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  isPremium: boolean;
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

export interface File {
  id: string;
  userId: string;
  folderId?: string;
  name: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  hash: string;
  isEncrypted: boolean;
  isStarred: boolean;
  isTrashed: boolean;
  isDeleted: boolean;
  version: number;
  metadata?: any;
  width?: number;
  height?: number;
  duration?: number;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  thumbnail?: Thumbnail;
  folder?: FolderBrief;
}

export interface Folder {
  id: string;
  userId: string;
  parentId?: string;
  name: string;
  path: string;
  icon?: string;
  color?: string;
  isStarred: boolean;
  isTrashed: boolean;
  fileCount: number;
  totalSize: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    children: number;
    files: number;
  };
  children?: Folder[];
  parent?: FolderBrief;
}

export interface FolderBrief {
  id: string;
  name: string;
  path: string;
}

export interface Thumbnail {
  id: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface Share {
  id: string;
  userId: string;
  fileId?: string;
  folderId?: string;
  token: string;
  permission: 'VIEW' | 'DOWNLOAD' | 'EDIT';
  password?: string;
  maxDownloads?: number;
  downloadCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  file?: File;
  folder?: Folder;
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
  };
}

export interface ShareCreate {
  fileId?: string;
  folderId?: string;
  permission?: 'VIEW' | 'DOWNLOAD' | 'EDIT';
  password?: string;
  maxDownloads?: number;
  expiresInDays?: number;
}

export interface UploadJob {
  id: string;
  userId: string;
  fileId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  totalChunks: number;
  uploadedChunks: number;
  errorMessage?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  fileId?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  file?: { id: string; name: string; mimeType: string };
}

export interface StorageInfo {
  used: number;
  limit: number;
  usagePercent: number;
  remaining: number;
  isPremium: boolean;
  totalFiles: number;
  totalFolders: number;
  fileTypes: Array<{
    mimeType: string;
    count: number;
    totalSize: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: User;
}

export interface FolderContents {
  folders: Folder[];
  files: File[];
}

export interface SearchResult {
  files: File[];
  folders: Folder[];
}

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'size' | 'createdAt' | 'updatedAt' | 'type';
export type SortOrder = 'asc' | 'desc';
