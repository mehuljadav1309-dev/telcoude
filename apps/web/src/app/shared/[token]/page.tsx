import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared Files - Telegram Drive',
};

interface SharedFilePageProps {
  params: { token: string };
}

export default function SharedFilePage({ params }: SharedFilePageProps) {
  return <SharedFileClient token={params.token} />;
}

function SharedFileClient({ token }: { token: string }) {
  // This would be a client component that fetches the shared file
  // For now, redirect to the full page
  if (typeof window !== 'undefined') {
    // In a real app, this would fetch share data and show file preview
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading shared file...</p>
    </div>
  );
}
