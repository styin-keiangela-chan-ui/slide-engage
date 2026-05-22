'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/ui/Navbar';

export default function LecturerLoginPage() {
  const router = useRouter();
  const { login, register, selectEvent, clearSelectedEvent } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let lecturer;
      if (isRegister) {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        lecturer = await register(name, email, password);
      } else {
        lecturer = await login(email, password);
      }

      if (lecturer) {
        const res = await fetch(`/api/events?lecturer_id=${lecturer.id}`);
        const data = await res.json();
        const firstEvent = (data.events || []).find((event: any) => event.status !== 'archived');
        if (firstEvent) {
          selectEvent(firstEvent);
        } else {
          clearSelectedEvent();
        }
      }

      router.push('/lecturer/events');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-10">
        <div className="bg-white rounded-[24px] p-12 max-w-[460px] w-full shadow border border-[#E2EBE6]">
          <div className="text-5xl text-center mb-4">🎓</div>
          <h2 className="text-[28px] font-extrabold text-center mb-2">
            {isRegister ? 'Create account' : 'Lecturer login'}
          </h2>
          <p className="text-[15px] text-[#6B7B8D] text-center mb-8 leading-relaxed">
            {isRegister
              ? 'Sign up to create interactive sessions for your students.'
              : 'Sign in to manage your interactive sessions.'}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="mb-4">
                <label className="text-[13px] font-semibold block mb-1.5">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Dr. Sarah Chen"
                  className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E] transition"
                />
              </div>
            )}

            <div className="mb-4">
              <label className="text-[13px] font-semibold block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="lecturer@university.edu"
                required
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E] transition"
              />
            </div>

            <div className="mb-6">
              <label className="text-[13px] font-semibold block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E] transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition disabled:opacity-50"
            >
              {loading ? 'Please wait…' : isRegister ? 'Create account →' : 'Sign in →'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-[#6B7B8D]">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-[#2D8A4E] font-semibold hover:underline"
            >
              {isRegister ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
