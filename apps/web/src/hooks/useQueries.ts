import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  filesApi,
  foldersApi,
  sharesApi,
  searchApi,
  storageApi,
  authApi,
} from '@/lib/api';
import { useAuthStore } from '@/store';
import type { File, Folder, Share, StorageInfo, PaginatedResponse, FolderContents } from '@/types';

// Auth hooks
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await authApi.getProfile();
      return response.data.data;
    },
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

// File hooks
export function useFiles(params?: {
  folderId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  type?: string;
  starred?: boolean;
  trashed?: boolean;
}) {
  return useQuery({
    queryKey: ['files', params],
    queryFn: async () => {
      const response = await filesApi.list(params);
      return response.data.data as PaginatedResponse<File>;
    },
  });
}

export function useFile(id: string) {
  return useQuery({
    queryKey: ['file', id],
    queryFn: async () => {
      const response = await filesApi.get(id);
      return response.data.data as File;
    },
    enabled: !!id,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, folderId }: { file: File; folderId?: string }) =>
      filesApi.upload(file as any, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => filesApi.delete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
}

export function usePermanentDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => filesApi.permanentDelete(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
}

export function useRestoreFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => filesApi.restore(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => filesApi.toggleStar(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId?: string }) =>
      filesApi.move(fileId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useCopyFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, folderId }: { fileId: string; folderId?: string }) =>
      filesApi.copy(fileId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) =>
      filesApi.update(fileId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file'] });
    },
  });
}

export function useRecentFiles(limit?: number) {
  return useQuery({
    queryKey: ['recent-files', limit],
    queryFn: async () => {
      const response = await filesApi.getRecent(limit);
      return response.data.data as File[];
    },
  });
}

export function useFileStats() {
  return useQuery({
    queryKey: ['file-stats'],
    queryFn: async () => {
      const response = await filesApi.getStats();
      return response.data.data;
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => filesApi.emptyTrash(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
    },
  });
}

// Folder hooks
export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: ['folders', parentId],
    queryFn: async () => {
      const response = await foldersApi.list(parentId);
      return response.data.data as Folder[];
    },
  });
}

export function useFolder(id: string) {
  return useQuery({
    queryKey: ['folder', id],
    queryFn: async () => {
      const response = await foldersApi.get(id);
      return response.data.data as Folder;
    },
    enabled: !!id,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      foldersApi.create(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

export function useFolderContents(folderId?: string) {
  return useQuery({
    queryKey: ['folder-contents', folderId],
    queryFn: async () => {
      const response = await foldersApi.getContents(folderId);
      return response.data.data as FolderContents;
    },
  });
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folder-tree'],
    queryFn: async () => {
      const response = await foldersApi.getTree();
      return response.data.data as Folder[];
    },
  });
}

export function useBreadcrumb(folderId?: string) {
  return useQuery({
    queryKey: ['breadcrumb', folderId],
    queryFn: async () => {
      const response = await foldersApi.getBreadcrumb(folderId);
      return response.data.data as Array<{ id: string | null; name: string; path: string }>;
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => foldersApi.delete(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
    },
  });
}

// Share hooks
export function useShares() {
  return useQuery({
    queryKey: ['shares'],
    queryFn: async () => {
      const response = await sharesApi.list();
      return response.data.data as Share[];
    },
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => sharesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => sharesApi.delete(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] });
    },
  });
}

// Search hooks
export function useSearch(params: { q: string; type?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['search', params],
    queryFn: async () => {
      const response = await searchApi.search(params);
      return response.data.data;
    },
    enabled: params.q.length > 0,
  });
}

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: async () => {
      const response = await searchApi.global(q);
      return response.data.data;
    },
    enabled: q.length > 0,
  });
}

// Storage hooks
export function useStorageUsage() {
  return useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const response = await storageApi.getUsage();
      return response.data.data as StorageInfo;
    },
  });
}

export function useStorageAnalytics() {
  return useQuery({
    queryKey: ['storage-analytics'],
    queryFn: async () => {
      const response = await storageApi.getAnalytics();
      return response.data.data;
    },
  });
}

export function useActivityLogs(params?: { page?: number; limit?: number; action?: string }) {
  return useQuery({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const response = await storageApi.getActivity(params);
      return response.data.data;
    },
  });
}
