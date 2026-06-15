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

const macInstallSteps = [
  {
    title: 'Click Download macOS.',
    caption: 'Download the SlideEngage macOS installer from the PowerPoint integration page.',
    image: '/guides/mac-install/step-1-download.png',
  },
  {
    title: 'Open SlideEngage-macOS.pkg.',
    caption: 'Open the downloaded package from your browser download history or Downloads folder.',
    image: '/guides/mac-install/step-2-open-package.png',
  },
  {
    title: 'If macOS says Not Opened, click Done.',
    caption: 'Do not click Move to Bin. Choose Done so you can allow the installer from Privacy & Security.',
    image: '/guides/mac-install/step-3-not-opened.png',
  },
  {
    title: 'Open System Settings.',
    caption: 'Go to the macOS System Settings app.',
    image: '/guides/mac-install/step-4-system-settings.png',
  },
  {
    title: 'Go to Privacy & Security.',
    caption: 'Scroll to the Security section and click Open Anyway for SlideEngage-macOS.pkg.',
    image: '/guides/mac-install/step-5-open-anyway.png',
  },
  {
    title: 'Confirm Open Anyway.',
    caption: 'When macOS shows the warning again, click Open Anyway.',
    image: '/guides/mac-install/step-6-confirm-open-anyway.png',
  },
  {
    title: 'Continue the installer.',
    caption: 'In the SlideEngage installer, click Continue and follow the prompts.',
    image: '/guides/mac-install/step-7-installer.png',
  },
  {
    title: 'Allow installer access.',
    caption: 'If macOS asks for permission to access data from other apps, click Allow.',
    image: '/guides/mac-install/step-8-allow.png',
  },
  {
    title: 'Finish installation.',
    caption: 'Continue until you see The installation was successful, then click Close.',
    image: '/guides/mac-install/step-9-success.png',
  },
];

const powerPointUseSteps = [
  {
    title: 'Click Add-ins from the PowerPoint ribbon.',
    caption: 'Open PowerPoint and choose Add-ins from the ribbon.',
    image: '/guides/mac-install/step-9-add-ins.png',
  },
  {
    title: 'Select SlideEngage from Developer Add-ins.',
    caption: 'Choose SlideEngage from the Developer Add-ins menu.',
    image: '/guides/mac-install/step-10-developer-addins.png',
  },
  {
    title: 'The SlideEngage task pane opens on the right side.',
    caption: 'The add-in opens beside your PowerPoint slide.',
    image: '/guides/mac-install/step-11-taskpane.png',
  },
  {
    title: 'Sign in using your SlideEngage email/Gmail and password.',
    caption: 'Use the same account that you use on the SlideEngage website.',
    image: '/guides/mac-install/step-11-taskpane.png',
  },
  {
    title: 'Create events, add interactions, and present live results.',
    caption: 'After login, manage SlideEngage directly inside PowerPoint.',
    image: '/guides/mac-install/step-12-powerpoint-dashboard.png',
  },
];

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

          <section className="mt-6 rounded-lg border border-[#E2EBE6] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-extrabold text-[#2D8A4E]">
                  macOS Installation Guide
                </div>
                <h2 className="text-2xl font-extrabold">Install SlideEngage PowerPoint Add-in on macOS</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6B7B8D]">
                  Follow these steps to install the SlideEngage package, allow it in macOS Privacy & Security, and open the add-in inside PowerPoint.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-[#FFD7A8] bg-[#FFF8E6] p-4 text-sm font-semibold leading-relaxed text-[#7A4B00]">
              Do not click Move to Bin. Choose Done, then allow it from Privacy & Security.
            </div>
            <div className="mb-5 rounded-xl border border-[#D8EEE0] bg-[#F3FBF6] p-4 text-sm leading-relaxed text-[#2D8A4E]">
              <strong>Note:</strong> This warning appears because the installer is not notarized by Apple yet.
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {macInstallSteps.map((step, index) => (
                <article key={step.title} className="overflow-hidden rounded-xl border border-[#E2EBE6] bg-[#FBFDFB] shadow-sm">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D8A4E] text-sm font-extrabold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#6B7B8D]">{step.caption}</p>
                    </div>
                  </div>
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-56 w-full border-t border-[#E2EBE6] object-contain p-3"
                    loading="lazy"
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-[#E2EBE6] bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-2xl font-extrabold">Open SlideEngage in PowerPoint</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#6B7B8D]">
                After installation, open the add-in from PowerPoint and sign in to start creating interactions.
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-[#BDE4C8] bg-[#EAF7EF] p-4 text-sm font-semibold text-[#168A3A]">
              <strong>Tip:</strong> Use the same account that you use on the SlideEngage website.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {powerPointUseSteps.map((step, index) => (
                <article key={step.title} className="overflow-hidden rounded-xl border border-[#E2EBE6] bg-[#FBFDFB] shadow-sm">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D8A4E] text-sm font-extrabold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#6B7B8D]">{step.caption}</p>
                    </div>
                  </div>
                  <img
                    src={step.image}
                    alt={step.title}
                    className="h-64 w-full border-t border-[#E2EBE6] object-contain p-3"
                    loading="lazy"
                  />
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-[#E2EBE6] bg-white p-5">
              <h2 className="mb-4 text-base font-extrabold">Windows PowerPoint</h2>
              <ol className="space-y-3 text-sm text-[#1A1A2E]">
                <li><strong>1.</strong> Download and unzip the Windows installer package.</li>
                <li><strong>2.</strong> Close PowerPoint, then run <strong>Install SlideEngage.cmd</strong>.</li>
                <li><strong>3.</strong> The installer checks Office Web Add-in support and Microsoft Edge WebView2 Runtime.</li>
                <li><strong>4.</strong> If WebView2 is missing, follow the prompt to install it.</li>
                <li><strong>5.</strong> Restart PowerPoint, then open <strong>Insert</strong> {'->'} <strong>My Add-ins</strong> or <strong>Home</strong> {'->'} <strong>Add-ins</strong>.</li>
                <li><strong>6.</strong> Choose <strong>SlideEngage</strong>.</li>
              </ol>
              <div className="mt-5 rounded-lg border border-[#D8EEE0] bg-[#F3FBF6] p-4 text-sm leading-relaxed text-[#2D8A4E]">
                The Windows installer verifies the manifest copy, PowerPoint WEF manifest, and trusted catalog registration. It opens a success page after installation.
              </div>
              <div className="mt-3 rounded-lg border border-[#FFD7A8] bg-[#FFF8E6] p-4 text-sm leading-relaxed text-[#7A4B00]">
                If PowerPoint does not show Add-ins, open the troubleshooting page created by the installer at <strong>%LOCALAPPDATA%\SlideEngage\OfficeAddin</strong>.
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
              <p><strong className="text-[#1A1A2E]">Windows Add-ins button is missing:</strong> Confirm you are using desktop PowerPoint 2016 or newer, Microsoft 365 PowerPoint, or a managed Office install with Office Web Add-ins enabled.</p>
              <p><strong className="text-[#1A1A2E]">WebView2 is missing:</strong> Install Microsoft Edge WebView2 Runtime, then rerun the SlideEngage Windows installer.</p>
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
