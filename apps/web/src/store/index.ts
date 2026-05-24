import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, File, Folder, ViewMode, SortField, SortOrder } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

interface FileState {
  currentFolderId: string | null;
  selectedFiles: string[];
  selectedFolders: string[];
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  isUploadModalOpen: boolean;
  isShareModalOpen: boolean;
  shareTargetId: string | null;
  setCurrentFolder: (folderId: string | null) => void;
  setSelectedFiles: (fileIds: string[]) => void;
  setSelectedFolders: (folderIds: string[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  setUploadModalOpen: (open: boolean) => void;
  setShareModalOpen: (open: boolean, targetId?: string | null) => void;
}

interface UploadState {
  uploads: UploadProgress[];
  addUpload: (upload: UploadProgress) => void;
  updateUpload: (id: string, data: Partial<UploadProgress>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'telegram-drive-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export const useFileStore = create<FileState>()((set) => ({
  currentFolderId: null,
  selectedFiles: [],
  selectedFolders: [],
  viewMode: 'grid',
  sortField: 'createdAt',
  sortOrder: 'desc',
  searchQuery: '',
  isUploadModalOpen: false,
  isShareModalOpen: false,
  shareTargetId: null,
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId, selectedFiles: [], selectedFolders: [] }),
  setSelectedFiles: (fileIds) => set({ selectedFiles: fileIds }),
  setSelectedFolders: (folderIds) => set({ selectedFolders: folderIds }),
  clearSelection: () => set({ selectedFiles: [], selectedFolders: [] }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setUploadModalOpen: (open) => set({ isUploadModalOpen: open }),
  setShareModalOpen: (open, targetId) =>
    set({ isShareModalOpen: open, shareTargetId: targetId || null }),
}));

export const useUploadStore = create<UploadState>()((set) => ({
  uploads: [],
  addUpload: (upload) =>
    set((state) => ({ uploads: [...state.uploads, upload] })),
  updateUpload: (id, data) =>
    set((state) => ({
      uploads: state.uploads.map((u) => (u.id === id ? { ...u, ...data } : u)),
    })),
  removeUpload: (id) =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      uploads: state.uploads.filter((u) => u.status !== 'completed'),
    })),
}));
