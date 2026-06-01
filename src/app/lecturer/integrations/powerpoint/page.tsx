'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import DashboardShell from '@/components/ui/DashboardShell';
import { PowerPointIcon } from '@/components/ui/IntegrationIcons';
import { useAuth } from '@/hooks/useAuth';

export default function PowerPointIntegrationPage() {
  const router = useRouter();
  const { lecturer, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <div className="border-b border-[#E2EBE6] bg-white">
            <DashboardShell className="py-4">
            <h1 className="text-lg font-bold">PowerPoint Integration</h1>
            <p className="text-xs text-[#6B7B8D]">Install SlideEngage into Microsoft PowerPoint.</p>
            </DashboardShell>
          </div>

          <DashboardShell>
            <section className="max-w-3xl rounded-[18px] border border-[#E2EBE6] bg-white p-7">
              <PowerPointIcon className="mb-5" />
              <h2 className="mb-3 text-xl font-extrabold text-[#17172F]">SlideEngage for PowerPoint</h2>
              <p className="mb-6 max-w-2xl text-sm leading-6 text-[#6B7B8D]">
                Use the hosted PowerPoint manifest for supported sideloading, AppSource submission, or Microsoft 365 admin deployment. The add-in opens a SlideEngage task pane from the PowerPoint ribbon.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/download" className="rounded-[9px] bg-[#2D8A4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#226f3e]">
                  Download PowerPoint Add-in
                </Link>
                <Link href="/addin-install" className="rounded-[9px] border border-[#E2EBE6] px-4 py-2 text-sm font-semibold hover:bg-[#F4F7F4]">
                  Install guide
                </Link>
                <a href="/manifest.xml" download="SlideEngage-PowerPoint-Addin.xml" className="rounded-[9px] border border-[#E2EBE6] px-4 py-2 text-sm font-semibold hover:bg-[#F4F7F4]">
                  Download manifest
                </a>
              </div>
            </section>
          </DashboardShell>
        </main>
      </div>
    </>
  );
}
