import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

const guideSteps = [
  {
    number: 1,
    title: 'Download the Google Slides add-on',
    caption: 'Click “Install Google Slides Add-on” on the SlideEngage website to download the .gs file.',
    image: '/guides/google-slides-install/step-1-download-addon.png',
  },
  {
    number: 2,
    title: 'Open the downloaded file',
    caption: 'For macOS users, open Finder → Downloads. Right-click SlideEngage_GoogleSlides_Addon.gs, choose “Open With”, then select “TextEdit”. For Windows users, open it with Notepad.',
    image: '/guides/google-slides-install/step-2-open-with-textedit.png',
  },
  {
    number: 3,
    title: 'Copy all code',
    caption: 'The file contains the SlideEngage Apps Script code. Press Command + A to select all, then Command + C to copy. On Windows, use Ctrl + A and Ctrl + C.',
    image: '/guides/google-slides-install/step-3-copy-code.png',
  },
  {
    number: 4,
    title: 'Open Apps Script in Google Slides',
    caption: 'Open your Google Slides presentation. Click Extensions → Apps Script.',
    image: '/guides/google-slides-install/step-4-open-apps-script.png',
  },
  {
    number: 5,
    title: 'Paste the code into Code.gs',
    caption: 'Inside Apps Script, open Code.gs, remove the existing content, then paste the copied SlideEngage code.',
    image: '/guides/google-slides-install/step-5-paste-code.png',
  },
  {
    number: 6,
    title: 'Save the project',
    caption: 'Click the “Save project to Drive” icon to save the Apps Script project.',
    image: '/guides/google-slides-install/step-6-save-project.png',
  },
  {
    number: 7,
    title: 'Run the code and confirm setup',
    caption: 'Click Run. If Google asks for authorization, choose your account and allow the required permissions. After the script runs successfully, return to Google Slides and refresh the page.',
    image: '/guides/google-slides-install/step-7-run-code.png',
  },
  {
    number: 8,
    title: 'Open SlideEngage',
    caption: 'You should now see 🎯 SlideEngage on the Google Slides top menu bar. Click it and choose “Open SlideEngage”.',
    image: '/guides/google-slides-install/step-8-slideengage-menu.png',
  },
  {
    number: 9,
    title: 'Sign in',
    caption: 'Sign in using the same SlideEngage email/Gmail and password used on the SlideEngage website.',
    image: '/guides/google-slides-install/step-9-sign-in.png',
  },
  {
    number: 10,
    title: 'Start using interactions',
    caption: 'After login, go to the interaction page, select or create an event, create interactions, and add them to your Google Slides presentation.',
    image: '/guides/google-slides-install/step-10-dashboard.png',
  },
];

export default function GoogleSlidesInstallationGuidePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-64px)] bg-[#F4F7F4] px-5 py-6 text-[#17172F]">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B7B8D]" aria-label="Breadcrumb">
            <Link className="hover:text-[#168A3A]" href="/">Home</Link>
            <span aria-hidden="true">→</span>
            <span>Guides</span>
            <span aria-hidden="true">→</span>
            <span className="text-[#17172F]">Google Slides Installation</span>
          </nav>

          <section className="rounded-lg border border-[#E2EBE6] bg-white p-5 shadow-sm">
            <div className="max-w-3xl">
              <p className="mb-2 inline-flex rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-extrabold text-[#2D8A4E]">Development guide</p>
              <h1 className="text-2xl font-extrabold tracking-tight">Google Slides Installation Guide</h1>
              <p className="mt-2 text-sm leading-relaxed text-[#66758A]">
                Install the SlideEngage Google Slides add-on manually during development. In production, SlideEngage should be installed through Google Workspace Marketplace.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#F3D58A] bg-[#FFF8E6] p-4 text-sm leading-relaxed text-[#7A4B00]">
                <strong className="block text-[#5E3C00]">Important</strong>
                This manual Apps Script method is for development/testing only. Normal users should install SlideEngage from Google Workspace Marketplace once published.
              </div>
              <div className="rounded-xl border border-[#BFE4CB] bg-[#F0FAF3] p-4 text-sm leading-relaxed text-[#216D3A]">
                <strong className="block text-[#168A3A]">Tip</strong>
                After saving and running the Apps Script, refresh Google Slides to see the SlideEngage menu.
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guideSteps.map((step) => (
              <article key={step.number} className="overflow-hidden rounded-xl border border-[#E2EBE6] bg-[#FBFDFB] shadow-sm">
                <div className="flex min-h-[112px] items-start gap-3 border-b border-[#E2EBE6] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2D8A4E] text-sm font-extrabold text-white">
                    {step.number}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-extrabold leading-snug">{step.title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#66758A]">{step.caption}</p>
                  </div>
                </div>
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-56 w-full bg-white object-contain p-3"
                  loading="lazy"
                />
              </article>
            ))}
          </section>

          <section className="mt-6 flex flex-col gap-3 rounded-lg border border-[#E2EBE6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold">Need another setup path?</h2>
              <p className="mt-1 text-sm text-[#66758A]">Return to downloads or review the Google Workspace Marketplace publishing checklist.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/download" className="rounded-lg bg-[#168A3A] px-4 py-2 text-center text-sm font-extrabold text-white hover:bg-[#0F6F2D]">
                Back to Downloads
              </Link>
              <Link href="/google-slides-polling" className="rounded-lg border border-[#DDEAE2] px-4 py-2 text-center text-sm font-extrabold hover:border-[#168A3A] hover:text-[#168A3A]">
                Open Google Workspace Marketplace Publishing Guide
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
