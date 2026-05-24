'use client';

import { useState } from 'react';
import { useFileStore, useAuthStore } from '@/store';
import { useBreadcrumb } from '@/hooks/useQueries';
import { searchApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Grid3X3,
  List,
  ChevronRight,
  Home,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from '@/lib/utils';
import Link from 'next/link';

export default function TopBar() {
  const {
    currentFolderId,
    setCurrentFolder,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    searchQuery,
    setSearchQuery,
  } = useFileStore();

  const { data: breadcrumb } = useBreadcrumb(currentFolderId || undefined);
  const [showSearch, setShowSearch] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async () => {
      const res = await searchApi.global(searchQuery);
      return res.data.data;
    },
    enabled: searchQuery.length > 1,
  });

  const handleSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm min-w-0">
          {breadcrumb?.map((item, index) => (
            <div key={item.id || 'root'} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <button
                onClick={() => setCurrentFolder(item.id)}
                className={cn(
                  'hover:text-foreground transition-colors truncate max-w-[150px]',
                  index === breadcrumb.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="w-3.5 h-3.5" />
                    {item.name}
                  </span>
                ) : (
                  item.name
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files..."
                defaultValue={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-40 focus:w-56 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort */}
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as any);
              setSortOrder(order as any);
            }}
            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest</option>
            <option value="size-asc">Smallest</option>
            <option value="updatedAt-desc">Recently modified</option>
          </select>
        </div>
      </div>
    </header>
  );
}
