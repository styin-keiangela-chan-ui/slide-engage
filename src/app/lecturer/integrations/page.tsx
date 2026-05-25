'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';

function PowerPointIcon() {
  return (
    <div className="relative mb-5 h-[56px] w-[56px]" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]" />
      <div className="absolute left-[18px] top-[12px] h-8 w-8 rounded-full bg-[#D94D2B]">
        <div className="absolute right-0 top-0 h-4 w-4 rounded-tr-full bg-[#FF8B6B]" />
      </div>
      <div className="absolute left-[9px] top-[19px] flex h-7 w-8 items-center justify-center rounded-[5px] bg-[#C83B1C] text-lg font-black text-white shadow-[4px_5px_10px_rgba(120,30,10,0.25)]">
        P
      </div>
    </div>
  );
}

function GoogleSlidesIcon() {
  return (
    <div className="relative mb-5 h-[56px] w-[56px]" aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]" />
      <div className="absolute left-[17px] top-[11px] h-9 w-7 rounded-[5px] bg-[#F6B800] shadow-sm">
        <div className="absolute right-0 top-0 h-3.5 w-3.5 rounded-bl-[3px] bg-[#FFE08A] [clip-path:polygon(0_0,100%_100%,100%_0)]" />
        <div className="absolute left-1/2 top-[18px] h-[13px] w-[16px] -translate-x-1/2 rounded-[2px] bg-white">
          <div className="absolute inset-[3px] rounded-[1px] bg-[#F6B800]" />
        </div>
      </div>
    </div>
  );
}

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
              <PowerPointIcon />
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
              <GoogleSlidesIcon />
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
