'use client';

import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      {/* Hero */}
      <section className="pt-20 pb-16 px-8 max-w-[1100px] mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#EAF7EF] text-[#2D8A4E] px-3.5 py-1 rounded-full text-[13px] font-semibold mb-6">
          🚀 No sign-up needed for participants
        </div>
        <h1 className="text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.1] mb-5">
          Make every slide<br /><span className="text-[#2D8A4E]">interactive &amp; engaging</span>
        </h1>
        <p className="text-lg text-[#6B7B8D] max-w-[600px] mx-auto mb-10 leading-[1.7]">
          Add polls, quizzes, Q&amp;A, word clouds, and live feedback directly inside PowerPoint and Google Slides — without leaving your presentation.
        </p>
        <div className="flex gap-3.5 justify-center flex-wrap">
          <Link href="/lecturer/login">
            <button className="px-7 py-3 rounded-[11px] text-base font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition inline-flex items-center gap-2">
              🎓 I&apos;m a Lecturer
            </button>
          </Link>
          <Link href="/join">
            <button className="px-7 py-3 rounded-[11px] text-base font-semibold bg-[#1A1A2E] text-white hover:bg-[#2a2a50] transition inline-flex items-center gap-2">
              🙋 I&apos;m a Student
            </button>
          </Link>
        </div>
      </section>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[900px] mx-auto mt-16 px-8">
        <Link href="/lecturer/login" className="bg-white rounded-[20px] p-9 border-2 border-[#E2EBE6] border-t-4 border-t-[#2D8A4E] hover:-translate-y-1 hover:shadow transition text-left">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-[#EAF7EF] flex items-center justify-center text-[26px] mb-4">🎓</div>
          <h2 className="text-[22px] font-bold mb-2">Lecturer Portal</h2>
          <p className="text-sm text-[#6B7B8D] leading-relaxed mb-5">Create and manage interactive sessions. Build polls, quizzes, and Q&amp;A activities, then insert them directly into your presentation files.</p>
          <ul className="flex flex-col gap-[7px]">
            {['Build polls, quizzes, word clouds, Q&A, feedback', 'Download PowerPoint add-in template', 'Get Google Slides Apps Script code', 'Live dashboard with real-time results', 'Export results to Excel / Google Sheets'].map(item => (
              <li key={item} className="text-[13px] text-[#6B7B8D] flex items-center gap-2">
                <span className="text-[#2D8A4E] font-bold">✓</span> {item}
              </li>
            ))}
          </ul>
        </Link>

        <Link href="/join" className="bg-white rounded-[20px] p-9 border-2 border-[#E2EBE6] border-t-4 border-t-[#1A6BB5] hover:-translate-y-1 hover:shadow transition text-left">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-[#E6F1FB] flex items-center justify-center text-[26px] mb-4">🙋</div>
          <h2 className="text-[22px] font-bold mb-2">Student Portal</h2>
          <p className="text-sm text-[#6B7B8D] leading-relaxed mb-5">Join any live session instantly with an event code. Vote, answer quizzes, submit questions, and leave feedback — all in real time.</p>
          <ul className="flex flex-col gap-[7px]">
            {['Join instantly — no account required', 'Answer polls and quizzes live', 'Submit and upvote Q&A questions', 'Contribute to word clouds', 'Leave anonymous feedback', 'See live results and leaderboard'].map(item => (
              <li key={item} className="text-[13px] text-[#6B7B8D] flex items-center gap-2">
                <span className="text-[#2D8A4E] font-bold">✓</span> {item}
              </li>
            ))}
          </ul>
        </Link>
      </div>

      {/* Features */}
      <div className="max-w-[1100px] mx-auto mt-20 mb-20 px-8">
        <div className="text-center text-[32px] font-extrabold mb-2">Everything you need in one place</div>
        <div className="text-center text-[#6B7B8D] mb-12 text-[15px]">Designed for classrooms, webinars, and corporate trainings</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: '📊', title: 'Live Polls', desc: 'Multiple choice, rating scales, and ranking polls that display results in real-time on your slide.' },
            { icon: '🧠', title: 'Quizzes', desc: 'Gamified quizzes with timers, correct-answer reveals, and a live leaderboard after each question.' },
            { icon: '❓', title: 'Q&A Sessions', desc: 'Attendees submit questions and upvote their favourites. AI can auto-answer common questions.' },
            { icon: '☁️', title: 'Word Clouds', desc: 'Real-time word cloud that grows as participants submit their responses.' },
            { icon: '⭐', title: 'Feedback Forms', desc: 'Star ratings, open text, and NPS-style feedback collected anonymously at the end of sessions.' },
            { icon: '📥', title: 'PowerPoint Add-in', desc: 'Install once, open PowerPoint, and use SlideEngage from the ribbon without uploading XML manually.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-[14px] p-6 border border-[#E2EBE6]">
              <div className="text-[28px] mb-3">{f.icon}</div>
              <h3 className="text-[15px] font-bold mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-[#6B7B8D] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
