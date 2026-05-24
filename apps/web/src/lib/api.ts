import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for JWT
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  sendCode: (phoneNumber: string) =>
    api.post('/auth/send-code', { phoneNumber }),

  verifyCode: (data: { phoneNumber: string; code: string; phoneCodeHash: string; password?: string }) =>
    api.post('/auth/verify-code', data),

  telegramWebAppLogin: (initData: string) =>
    api.post('/auth/telegram-webapp', { initData }),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: (sessionId: string) =>
    api.post('/auth/logout', { sessionId }),

  logoutAll: () =>
    api.post('/auth/logout-all'),

  getSessions: () =>
    api.get('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    api.post(`/auth/sessions/${sessionId}/revoke`),

  getProfile: () =>
    api.get('/auth/profile'),
};

export const filesApi = {
  upload: (file: File, folderId?: string, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
  },

  uploadMultiple: (files: File[], folderId?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (folderId) formData.append('folderId', folderId);

    return api.post('/files/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (params?: {
    folderId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    type?: string;
    starred?: boolean;
    trashed?: boolean;
  }) => api.get('/files', { params }),

  get: (id: string) =>
    api.get(`/files/${id}`),

  update: (id: string, data: { name?: string; isStarred?: boolean; description?: string; tags?: string[] }) =>
    api.patch(`/files/${id}`, data),

  move: (id: string, folderId?: string) =>
    api.post(`/files/${id}/move`, { folderId }),

  copy: (id: string, folderId?: string) =>
    api.post(`/files/${id}/copy`, { folderId }),

  toggleStar: (id: string) =>
    api.post(`/files/${id}/star`),

  delete: (id: string) =>
    api.delete(`/files/${id}`),

  restore: (id: string) =>
    api.post(`/files/${id}/restore`),

  permanentDelete: (id: string) =>
    api.delete(`/files/${id}/permanent`),

  emptyTrash: () =>
    api.delete('/files/trash/empty'),

  getRecent: (limit?: number) =>
    api.get('/files/recent', { params: { limit } }),

  getVersions: (id: string) =>
    api.get(`/files/${id}/versions`),

  getStats: () =>
    api.get('/files/stats'),
};

export const foldersApi = {
  create: (name: string, parentId?: string) =>
    api.post('/folders', { name, parentId }),

  list: (parentId?: string) =>
    api.get('/folders', { params: { parentId } }),

  get: (id: string) =>
    api.get(`/folders/${id}`),

  update: (id: string, data: { name?: string; icon?: string; color?: string; isStarred?: boolean }) =>
    api.patch(`/folders/${id}`, data),

  move: (id: string, parentId?: string) =>
    api.post(`/folders/${id}/move`, { parentId }),

  toggleStar: (id: string) =>
    api.post(`/folders/${id}/star`),

  delete: (id: string) =>
    api.delete(`/folders/${id}`),

  restore: (id: string) =>
    api.post(`/folders/${id}/restore`),

  permanentDelete: (id: string) =>
    api.delete(`/folders/${id}/permanent`),

  getTree: () =>
    api.get('/folders/tree'),

  getBreadcrumb: (folderId?: string) =>
    api.get('/folders/breadcrumb', { params: { folderId } }),

  getContents: (folderId?: string) =>
    api.get('/folders/contents', { params: { folderId } }),
};

export const sharesApi = {
  create: (data: ShareCreateData) =>
    api.post('/shares', data),

  list: () =>
    api.get('/shares'),

  get: (id: string) =>
    api.get(`/shares/${id}`),

  update: (id: string, data: any) =>
    api.patch(`/shares/${id}`, data),

  delete: (id: string) =>
    api.delete(`/shares/${id}`),

  access: (token: string, password?: string) =>
    api.get(`/shares/access/${token}`, { params: { password } }),

  getAnalytics: (id: string) =>
    api.get(`/shares/${id}/analytics`),
};

export const searchApi = {
  search: (params: {
    q: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => api.get('/search', { params }),

  global: (q: string) =>
    api.get('/search/global', { params: { q } }),

  folders: (q: string) =>
    api.get('/search/folders', { params: { q } }),
};

export const storageApi = {
  getUsage: () =>
    api.get('/storage/usage'),

  getAnalytics: () =>
    api.get('/storage/analytics'),

  getHistory: (days?: number) =>
    api.get('/storage/history', { params: { days } }),

  getActivity: (params?: { page?: number; limit?: number; action?: string }) =>
    api.get('/storage/activity', { params }),
};

export const streamApi = {
  getStreamInfo: (fileId: string) =>
    api.get(`/stream/${fileId}`),

  getStreamUrl: (fileId: string) =>
    `${API_BASE}/api/v1/stream/${fileId}`,
};

export interface ShareCreateData {
  fileId?: string;
  folderId?: string;
  permission?: 'VIEW' | 'DOWNLOAD' | 'EDIT';
  password?: string;
  maxDownloads?: number;
  expiresInDays?: number;
}

export default api;
