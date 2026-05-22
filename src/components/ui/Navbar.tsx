'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const { lecturer, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-[#E2EBE6] flex items-center justify-between px-8 h-16 sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2.5 font-extrabold text-xl text-[#1A1A2E]">
        <div className="w-9 h-9 bg-[#2D8A4E] rounded-[9px] flex items-center justify-center text-white text-lg">🎯</div>
        SlideEngage
      </Link>

      <div className="flex gap-1">
        <Link href="/" className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#2D8A4E] transition">
          Home
        </Link>
        <Link href="/lecturer/events" className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#2D8A4E] transition">
          Lecturer
        </Link>
        <Link href="/join" className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#2D8A4E] transition">
          Student
        </Link>
      </div>

      <div className="flex gap-2.5">
        {lecturer ? (
          <>
            <span className="px-3 py-2 text-sm font-medium text-[#2D8A4E]">Hi, {lecturer.name}</span>
            <button onClick={logout} className="px-5 py-2 rounded-[9px] text-sm font-semibold border border-[#E2EBE6] text-[#1A1A2E] hover:border-[#2D8A4E] hover:text-[#2D8A4E] transition">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/join">
              <button className="px-5 py-2 rounded-[9px] text-sm font-semibold border border-[#E2EBE6] text-[#1A1A2E] hover:border-[#2D8A4E] hover:text-[#2D8A4E] transition">
                Join session
              </button>
            </Link>
            <Link href="/lecturer/login">
              <button className="px-5 py-2 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition">
                Lecturer portal
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
