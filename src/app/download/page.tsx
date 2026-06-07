'use client';

import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

const steps = [
  'Visit SlideEngage',
  'Download installer',
  'Install once',
  'Open PowerPoint',
  'Use SlideEngage from the ribbon',
];

export default function DownloadInstallerPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F4F7F4] text-[#1A1A2E]">
        <section className="mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EAF7EF] px-3.5 py-1 text-sm font-bold text-[#2D8A4E]">
              <img src="/assets/icons/icon-32.png" alt="" className="h-5 w-5 rounded-full" />
              PowerPoint add-in installer
            </div>
            <h1 className="mb-5 text-[42px] font-extrabold leading-tight tracking-normal md:text-[58px]">
              Install SlideEngage once. Use it inside PowerPoint forever.
            </h1>
            <p className="mb-8 max-w-[640px] text-lg leading-8 text-[#5F6F80]">
              Download the installer for your computer, restart PowerPoint, then open SlideEngage from Insert → Add-ins → My Add-ins. The installer registers the production Office manifest for you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/downloads/SlideEngage-macOS.pkg"
                className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#168A3A] px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-[#0f6f2d]"
              >
                <span className="text-xl">⌘</span>
                Download for macOS
              </a>
              <a
                href="/downloads/SlideEngage-Windows-Installer.zip"
                className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#1A1A2E] px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-[#2a2a50]"
              >
                <span className="text-xl">▦</span>
                Download for Windows
              </a>
            </div>
            <div className="mt-3 text-sm font-semibold text-[#6B7B8D]">
              Advanced download:{' '}
              <a href="/downloads/SlideEngage-macOS-Installer.zip" className="text-[#2D8A4E] hover:underline">
                macOS script package
              </a>
              <span className="mx-2">·</span>
              Windows MSI can be generated on Windows with WiX using <span className="font-mono">npm run installer:windows</span>
              <span className="mx-2">·</span>
              <a href="/addin-install" className="text-[#2D8A4E] hover:underline">
                Manual fallback
              </a>
            </div>
            <div className="mt-4 text-sm font-semibold text-[#6B7B8D]">
              Production task pane: <span className="text-[#2D8A4E]">https://slide-engage.vercel.app/taskpane</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#DDE9E1] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 border-b border-[#E2EBE6] pb-4">
              <img src="/assets/icons/icon-64.png" alt="SlideEngage" className="h-12 w-12 rounded-full" />
              <div>
                <div className="text-lg font-extrabold">SlideEngage Installer</div>
                <div className="text-sm font-semibold text-[#6B7B8D]">PowerPoint ribbon integration</div>
              </div>
            </div>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-[#E2EBE6] bg-[#FAFCFA] p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D8A4E] text-sm font-extrabold text-white">
                    {index + 1}
                  </div>
                  <div className="text-sm font-bold">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#E2EBE6] bg-white">
          <div className="mx-auto grid max-w-[1120px] grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3">
            {[
              ['Automatic registration', 'The installer places the PowerPoint manifest in the Office add-in location and registers the trusted catalog.'],
              ['Production domain', 'The task pane loads from https://slide-engage.vercel.app with HTTPS-hosted icons and support URLs.'],
              ['After install', 'Restart PowerPoint, then open Insert → Add-ins → My Add-ins and choose SlideEngage.'],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-xl border border-[#E2EBE6] p-5">
                <h2 className="mb-2 text-base font-extrabold">{title}</h2>
                <p className="text-sm leading-6 text-[#6B7B8D]">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1120px] px-6 py-10">
          <div className="rounded-2xl border border-[#E2EBE6] bg-white p-6">
            <h2 className="mb-3 text-xl font-extrabold">For IT admins</h2>
            <p className="mb-4 text-sm leading-6 text-[#6B7B8D]">
              For managed schools or companies, Microsoft AppSource or Microsoft 365 centralized deployment is the most reliable way to make SlideEngage appear automatically for everyone. These installers are prepared for individual lecturer machines and pilot deployments.
            </p>
            <Link href="/addin-install" className="text-sm font-extrabold text-[#2D8A4E] hover:underline">
              View manifest fallback instructions
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
