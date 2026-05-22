'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import { DEFAULT_PUBLIC_APP_URL, isProductionUrlConfigured } from '@/lib/public-url';

function getAppBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_APP_URL;
}

export default function AddinInstallPage() {
  const [copied, setCopied] = useState(false);
  const baseUrl = useMemo(() => getAppBaseUrl(), []);
  const productionUrlConfigured = useMemo(() => isProductionUrlConfigured(), []);
  const manifestUrl = `${baseUrl}/manifest.xml`;

  async function copyManifestUrl() {
    await navigator.clipboard.writeText(manifestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-8 text-[#1A1A2E]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-bold text-[#2D8A4E]">
              PowerPoint add-in only
            </div>
            <h1 className="text-3xl font-extrabold">Install Slide Engage in PowerPoint</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#6B7B8D]">
              Add the Slide Engage logo button to PowerPoint. Lecturers open their own PowerPoint file, click the ribbon button, and use the right-side task pane to create live polls.
            </p>
          </div>

          <section className="mb-6 rounded-lg border border-[#E2EBE6] bg-white p-5">
            <h2 className="mb-2 text-base font-extrabold">Manifest URL</h2>
            <p className="mb-3 text-sm text-[#6B7B8D]">Use this hosted manifest for sideloading. It targets PowerPoint only and uses HTTPS app URLs.</p>
            {!productionUrlConfigured && (
              <div className="mb-3 rounded-lg border border-[#FFD7A8] bg-[#FFF8E6] px-4 py-3 text-sm font-semibold text-[#8A5A00]">
                NEXT_PUBLIC_APP_URL is not set to a production URL. Deploy to Vercel, then set it to your real HTTPS domain before distributing the add-in.
              </div>
            )}
            <div className="flex flex-col gap-2 md:flex-row">
              <input readOnly value={manifestUrl} className="min-w-0 flex-1 rounded-lg border border-[#E2EBE6] bg-[#F8FAF8] px-3 py-2 text-sm font-semibold" />
              <button onClick={copyManifestUrl} className="rounded-lg bg-[#2D8A4E] px-4 py-2 text-sm font-bold text-white">
                {copied ? 'Copied' : 'Copy manifest URL'}
              </button>
              <a href="/manifest.xml" download="manifest.xml" className="rounded-lg border border-[#E2EBE6] px-4 py-2 text-center text-sm font-bold hover:border-[#2D8A4E] hover:text-[#2D8A4E]">
                Download manifest.xml
              </a>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-[#E2EBE6] bg-white p-5">
              <h2 className="mb-4 text-base font-extrabold">Windows PowerPoint</h2>
              <ol className="space-y-3 text-sm text-[#1A1A2E]">
                <li><strong>1.</strong> Open your existing PowerPoint file.</li>
                <li><strong>2.</strong> Go to <strong>Insert</strong> {'->'} <strong>Add-ins</strong> {'->'} <strong>My Add-ins</strong>.</li>
                <li><strong>3.</strong> Choose <strong>Upload My Add-in</strong>.</li>
                <li><strong>4.</strong> Select the downloaded <strong>manifest.xml</strong>.</li>
                <li><strong>5.</strong> Click the <strong>Slide Engage</strong> logo in the ribbon.</li>
              </ol>
              <div className="mt-5 rounded-lg border border-dashed border-[#AFCBBC] bg-[#F8FAF8] p-5 text-center text-sm font-bold text-[#6B7B8D]">
                Screenshot placeholder: Insert {'->'} Add-ins {'->'} My Add-ins {'->'} Upload My Add-in
              </div>
            </section>

            <section className="rounded-lg border border-[#E2EBE6] bg-white p-5">
              <h2 className="mb-4 text-base font-extrabold">Mac PowerPoint</h2>
              <ol className="space-y-3 text-sm text-[#1A1A2E]">
                <li><strong>1.</strong> Open your existing PowerPoint file.</li>
                <li><strong>2.</strong> Go to <strong>Insert</strong> {'->'} <strong>Add-ins</strong> {'->'} <strong>My Add-ins</strong>.</li>
                <li><strong>3.</strong> Choose <strong>Upload My Add-in</strong>.</li>
                <li><strong>4.</strong> Pick the downloaded <strong>manifest.xml</strong>.</li>
                <li><strong>5.</strong> The Slide Engage logo appears in the PowerPoint ribbon.</li>
              </ol>
              <div className="mt-5 rounded-lg border border-dashed border-[#AFCBBC] bg-[#F8FAF8] p-5 text-center text-sm font-bold text-[#6B7B8D]">
                Screenshot placeholder: PowerPoint ribbon with Slide Engage logo button
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-lg border border-[#E2EBE6] bg-white p-5">
            <h2 className="mb-4 text-base font-extrabold">What lecturers do after install</h2>
            <div className="grid gap-3 md:grid-cols-4">
              {[
                'Open their own deck',
                'Click Slide Engage',
                'Sign in',
                'Create poll slides',
              ].map((step, index) => (
                <div key={step} className="rounded-lg bg-[#F8FAF8] p-4 text-sm font-bold">
                  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2D8A4E] text-xs text-white">{index + 1}</div>
                  {step}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-[#E2EBE6] bg-white p-5">
            <h2 className="mb-4 text-base font-extrabold">Troubleshooting</h2>
            <div className="space-y-3 text-sm text-[#6B7B8D]">
              <p><strong className="text-[#1A1A2E]">Upload My Add-in is missing:</strong> Make sure you are using desktop PowerPoint with add-ins enabled by your organization.</p>
              <p><strong className="text-[#1A1A2E]">PowerPoint blocks the add-in:</strong> Confirm the manifest URL and task pane use HTTPS, not localhost.</p>
              <p><strong className="text-[#1A1A2E]">Slide Engage button does not appear:</strong> Restart PowerPoint after uploading the manifest.</p>
              <p><strong className="text-[#1A1A2E]">Corporate device restrictions:</strong> Ask IT to deploy the manifest through Microsoft 365 admin center.</p>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-[#E2EBE6] bg-white p-5">
            <h2 className="mb-3 text-base font-extrabold">AppSource readiness</h2>
            <div className="grid gap-2 text-sm text-[#6B7B8D] md:grid-cols-2">
              <div>PowerPoint-only host: <strong className="text-[#2D8A4E]">Presentation</strong></div>
              <div>Manifest endpoint: <strong className="text-[#2D8A4E]">/manifest.xml</strong></div>
              <div>Privacy policy: <Link className="font-bold text-[#2D8A4E]" href="/privacy">/privacy</Link></div>
              <div>Terms of use: <Link className="font-bold text-[#2D8A4E]" href="/terms">/terms</Link></div>
              <div>Support: <Link className="font-bold text-[#2D8A4E]" href="/support">/support</Link></div>
              <div>Icons: <strong className="text-[#2D8A4E]">16, 32, 80 px</strong></div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
