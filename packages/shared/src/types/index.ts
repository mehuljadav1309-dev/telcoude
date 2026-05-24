// Shared type definitions between frontend and backend

// File types
export type FileType = 'FILE' | 'FOLDER';
export type StorageProvider = 'TELEGRAM';
export type SharePermission = 'VIEW' | 'DOWNLOAD' | 'EDIT';
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type JobType = 'UPLOAD' | 'THUMBNAIL' | 'METADATA_EXTRACTION' | 'VIDEO_PROCESSING' | 'CLEANUP' | 'SHARE_EXPIRATION' | 'VIRUS_SCAN';

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
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

// Error
export interface ApiError {
  success: false;
  statusCode: number;
  code: string;
  message: string[];
  timestamp: string;
  path: string;
}

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Events
export interface UploadProgressEvent {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export interface FileUpdateEvent {
  type: 'created' | 'updated' | 'deleted' | 'moved';
  fileId: string;
  userId: string;
  timestamp: string;
}

// Configuration
export interface AppConfig {
  maxUploadSize: number;
  supportedMimeTypes: string[];
  storageLimit: Record<string, number>; // plan -> bytes
}
