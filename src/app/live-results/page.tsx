'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import DashboardShell from '@/components/ui/DashboardShell';
import LiveResultsView from '@/components/live-results/LiveResultsView';

export default function LiveResultsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading } = useAuth();

  useEffect(() => {
    if (!loading && !lecturer) router.push('/');
  }, [lecturer, loading, router]);

  if (loading || !lecturer) {
    return (
      <div className="min-h-screen bg-[#F6F8F7] flex items-center justify-center">
        <div className="text-[#6B7B8D]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8F7]">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <DashboardShell className="h-full overflow-hidden py-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-bold text-[#17172F]">Live Results</h1>
              <p className="mt-1 text-sm text-[#6B7B8D]">
                {currentEvent
                  ? `${currentEvent.event_name} · #${currentEvent.event_code}`
                  : 'Presentation results for your selected event'}
              </p>
            </div>
            {currentEvent && (
              <span className="rounded-full bg-[#EAF7EF] px-3 py-1 text-sm font-bold text-[#16833A]">
                {currentEvent.status}
              </span>
            )}
          </div>

          <LiveResultsView event={currentEvent} />
          </DashboardShell>
        </main>
      </div>
    </div>
  );
}
