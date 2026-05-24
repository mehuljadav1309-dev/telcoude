'use client';

import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import UploadModal from '@/components/upload/UploadModal';
import ShareModal from '@/components/shared/ShareModal';
import { useFileStore } from '@/store';

export default function DriveLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const isUploadModalOpen = useFileStore((s) => s.isUploadModalOpen);
  const isShareModalOpen = useFileStore((s) => s.isShareModalOpen);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      {isUploadModalOpen && <UploadModal />}
      {isShareModalOpen && <ShareModal />}
    </div>
  );
}
