'use client';

import { Cloud, Upload } from 'lucide-react';
import { useFileStore } from '@/store';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  const setUploadModalOpen = useFileStore((s) => s.setUploadModalOpen);

  return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
        <Cloud className="w-10 h-10 text-primary/40" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      <button
        onClick={() => setUploadModalOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        <Upload className="w-4 h-4" />
        Upload Files
      </button>
    </div>
  );
}
