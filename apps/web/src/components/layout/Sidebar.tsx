'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore, useFileStore, useUploadStore } from '@/store';
import { useStorageUsage, useFolderTree } from '@/hooks/useQueries';
import { formatFileSize, cn } from '@/lib/utils';
import {
  HardDrive,
  Home,
  Star,
  Clock,
  Trash2,
  Settings,
  Share2,
  Search,
  Upload,
  ChevronDown,
  ChevronRight,
  Folder,
  Plus,
  LogOut,
  Cloud,
  Menu,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setUploadModalOpen = useFileStore((s) => s.setUploadModalOpen);
  const setCurrentFolder = useFileStore((s) => s.setCurrentFolder);
  const uploads = useUploadStore((s) => s.uploads);
  const [collapsed, setCollapsed] = useState(false);
  const [showTree, setShowTree] = useState(true);

  const { data: storage } = useStorageUsage();
  const { data: folderTree } = useFolderTree();

  const handleLogout = async () => {
    clearAuth();
    toast.success('Logged out');
  };

  const navItems = [
    { href: '/drive', icon: Home, label: 'My Drive', exact: true },
    { href: '/drive/shared', icon: Share2, label: 'Shared' },
    { href: '/drive/starred', icon: Star, label: 'Starred' },
    { href: '/drive/recent', icon: Clock, label: 'Recent' },
    { href: '/drive/trash', icon: Trash2, label: 'Trash' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <Link href="/drive" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cloud className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">Telegram Drive</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Upload Button */}
      <div className="p-3">
        <button
          onClick={() => setUploadModalOpen(true)}
          className={cn(
            'w-full bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2',
            collapsed ? 'p-3' : 'py-2.5 px-4',
          )}
        >
          <Upload className="w-4 h-4" />
          {!collapsed && <span>Upload</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setCurrentFolder(null)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(item.href, item.exact)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
              collapsed && 'justify-center px-2',
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Folder Tree */}
        {!collapsed && folderTree && folderTree.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowTree(!showTree)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showTree ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              Folders
            </button>
            {showTree && (
              <div className="ml-2 space-y-0.5 mt-1">
                {folderTree.map((folder) => (
                  <FolderTreeItem key={folder.id} folder={folder} collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Uploads */}
        {uploads.filter((u) => u.status === 'uploading').length > 0 && !collapsed && (
          <div className="mt-4 px-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Uploads</p>
            {uploads
              .filter((u) => u.status === 'uploading')
              .slice(0, 3)
              .map((u) => (
                <div key={u.id} className="mb-2">
                  <p className="text-xs truncate">{u.fileName}</p>
                  <div className="w-full h-1 bg-secondary rounded-full mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </nav>

      {/* Storage Bar */}
      {!collapsed && storage && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Storage</span>
            <span>
              {formatFileSize(storage.used)} / {formatFileSize(storage.limit)}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                storage.usagePercent > 90
                  ? 'bg-destructive'
                  : storage.usagePercent > 70
                  ? 'bg-yellow-500'
                  : 'bg-primary',
              )}
              style={{ width: `${Math.min(storage.usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* User Info */}
      <div className={cn('border-t border-border p-3', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {user?.firstName?.[0] || '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user?.username}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function FolderTreeItem({
  folder,
  collapsed,
}: {
  folder: any;
  collapsed: boolean;
}) {
  const setCurrentFolder = useFileStore((s) => s.setCurrentFolder);
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;

  if (collapsed) return null;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          setCurrentFolder(folder.id);
        }}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        <Folder className="w-4 h-4 flex-shrink-0 text-primary" />
        <span className="truncate">{folder.name}</span>
      </button>
      {expanded && hasChildren && (
        <div className="ml-4">
          {folder.children.map((child: any) => (
            <FolderTreeItem key={child.id} folder={child} collapsed={collapsed} />
          ))}
        </div>
      )}
    </div>
  );
}
