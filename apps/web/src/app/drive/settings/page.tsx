'use client';

import { useAuthStore, useFileStore } from '@/store';
import { useStorageUsage, useStorageAnalytics, useActivityLogs } from '@/hooks/useQueries';
import { formatFileSize } from '@/lib/utils';
import {
  HardDrive,
  User,
  Shield,
  Activity,
  Monitor,
  LogOut,
  Trash2,
  Bell,
  Key,
  Smartphone,
  Laptop,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, clearAuth, isAuthenticated } = useAuthStore();
  const { data: storage } = useStorageUsage();
  const { data: analytics } = useStorageAnalytics();
  const { data: activity } = useActivityLogs({ limit: 10 });

  const handleLogoutAll = async () => {
    clearAuth();
    toast.success('Logged out from all sessions');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {user?.firstName?.[0] || '?'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-muted-foreground">@{user?.username}</p>
            <p className="text-sm text-muted-foreground">Telegram ID: {user?.telegramId}</p>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Storage</h2>
        </div>
        {storage && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Used</span>
              <span className="font-medium">
                {formatFileSize(storage.used)} / {formatFileSize(storage.limit)}
              </span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  storage.usagePercent > 90
                    ? 'bg-destructive'
                    : storage.usagePercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${Math.min(storage.usagePercent, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold">{storage.totalFiles}</p>
                <p className="text-xs text-muted-foreground">Files</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold">{storage.totalFolders}</p>
                <p className="text-xs text-muted-foreground">Folders</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold">{storage.fileTypes.length}</p>
                <p className="text-xs text-muted-foreground">File types</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Activity */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Recent Activity</h2>
        </div>
        {activity?.data && activity.data.length > 0 ? (
          <div className="space-y-2">
            {activity.data.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.file?.name || '—'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        )}
      </section>

      {/* Sessions */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Sessions</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your active sessions
        </p>
        <button
          onClick={handleLogoutAll}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out from all sessions
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-card border border-destructive/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4 text-destructive">
          <Trash2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Danger Zone</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Irreversible actions for your account
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This will delete all your data.')) {
              toast.error('Account deletion not yet implemented');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete account
        </button>
      </section>
    </div>
  );
}
