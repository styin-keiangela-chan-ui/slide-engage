'use client';

import Link from 'next/link';

const steps = [
  ['1', 'Install the add-on', 'Add SlideEngage to Google Slides and open it from the Extensions menu.'],
  ['2', 'Create interactions', 'Add polls, Q&A, quizzes and word clouds directly from the sidebar.'],
  ['3', 'Present live', 'Students join with a QR code or event code and answer from any device.'],
];

const useCases = [
  ['Pulse check', 'Ask how confident students feel before starting a topic.'],
  ['Collect questions', 'Let students submit and upvote questions anonymously or by name.'],
  ['Quick feedback', 'Collect a short rating or open text response at the end of class or training.'],
];

export default function GoogleSlidesPollingPage() {
  return (
    <main className="min-h-screen bg-white text-[#1A1A2E]">
      <header className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-[#168A3A]">
          <img src="/assets/icons/icon-32.png" alt="" className="h-8 w-8 rounded-full" />
          SlideEngage
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/lecturer/login" className="text-sm font-bold text-[#168A3A]">Log in</Link>
          <a href="/SlideEngage_GoogleSlides_Addon.gs" download="SlideEngage_GoogleSlides_Addon.gs" className="rounded-[9px] bg-[#168A3A] px-4 py-2 text-sm font-bold text-white">
            Get the add-on
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1120px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-4 text-sm font-extrabold uppercase tracking-wider text-[#168A3A]">SlideEngage for Google Slides</div>
          <h1 className="mb-5 text-[42px] font-extrabold leading-tight md:text-[58px]">
            Live polling and Q&A for Google Slides
          </h1>
          <p className="mb-8 max-w-[620px] text-lg leading-8 text-[#5F6F80]">
            Make presentations interactive with a Google Slides add-on that lets lecturers create polls, quizzes, word clouds and Q&A without leaving the deck.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/SlideEngage_GoogleSlides_Addon.gs" download="SlideEngage_GoogleSlides_Addon.gs" className="rounded-xl bg-[#168A3A] px-6 py-3 text-base font-extrabold text-white">
              Add SlideEngage to Google Slides
            </a>
            <Link href="/join" className="rounded-xl border border-[#DDE9E1] px-6 py-3 text-base font-extrabold text-[#168A3A]">
              Try student join
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DDE9E1] bg-[#F7FAF8] p-5">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-extrabold">Google Slides sidebar</div>
              <span className="rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-bold text-[#168A3A]">Live</span>
            </div>
            {['Multiple choice poll', 'Audience Q&A', 'Word cloud', 'Quiz'].map((item, index) => (
              <div key={item} className="mb-3 rounded-[10px] border border-[#E2EBE6] p-4">
                <div className="text-sm font-bold">{item}</div>
                <div className="mt-2 h-2 rounded-full bg-[#E7E7E7]">
                  <div className="h-2 rounded-full bg-[#168A3A]" style={{ width: `${80 - index * 13}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E2EBE6] bg-[#F7FAF8]">
        <div className="mx-auto max-w-[1120px] px-6 py-14">
          <h2 className="mb-8 text-3xl font-extrabold">Get started in 3 steps</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {steps.map(([number, title, desc]) => (
              <div key={title} className="rounded-xl border border-[#E2EBE6] bg-white p-6">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#168A3A] font-extrabold text-white">{number}</div>
                <h3 className="mb-2 text-lg font-extrabold">{title}</h3>
                <p className="text-sm leading-6 text-[#6B7B8D]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-14">
        <h2 className="mb-8 text-3xl font-extrabold">How you can use it</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {useCases.map(([title, desc]) => (
            <div key={title} className="rounded-xl border border-[#E2EBE6] p-6">
              <h3 className="mb-2 text-lg font-extrabold">{title}</h3>
              <p className="text-sm leading-6 text-[#6B7B8D]">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
