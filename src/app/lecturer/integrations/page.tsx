'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function LecturerIntegrationsPage() {
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
          <div className="border-b border-[#E2EBE6] bg-white px-7 py-3.5">
            <h1 className="text-lg font-bold">Integrations</h1>
            <p className="text-xs text-[#6B7B8D]">Install SlideEngage into your presentation tools.</p>
          </div>

          <div className="grid gap-5 p-7 md:grid-cols-2">
            <section className="rounded-[14px] border border-[#E2EBE6] bg-white p-6">
              <div className="mb-4 text-4xl">📊</div>
              <h2 className="mb-2 text-base font-bold">PowerPoint</h2>
              <p className="mb-5 text-sm leading-6 text-[#6B7B8D]">
                Use the production hosted manifest for AppSource or supported sideloading. Microsoft restricts fully automatic add-in installs, so production distribution should use AppSource or Microsoft 365 admin deployment.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/download" className="rounded-[9px] bg-[#2D8A4E] px-4 py-2 text-sm font-semibold text-white">
                  Download PowerPoint Add-in
                </Link>
                <Link href="/addin-install" className="rounded-[9px] border border-[#E2EBE6] px-4 py-2 text-sm font-semibold">
                  Install guide
                </Link>
              </div>
            </section>

            <section className="rounded-[14px] border border-[#E2EBE6] bg-white p-6">
              <div className="mb-4 text-4xl">🟨</div>
              <h2 className="mb-2 text-base font-bold">Google Slides</h2>
              <p className="mb-5 text-sm leading-6 text-[#6B7B8D]">
                Development uses Apps Script copy/install. Production should be published through Google Workspace Marketplace so users can install without code.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/SlideEngage_GoogleSlides_Addon.gs" download="SlideEngage_GoogleSlides_Addon.gs" className="rounded-[9px] bg-[#2D8A4E] px-4 py-2 text-sm font-semibold text-white">
                  Install Google Slides Add-on
                </a>
                <Link href="/google-slides-polling" className="rounded-[9px] border border-[#E2EBE6] px-4 py-2 text-sm font-semibold">
                  Publishing guide
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
