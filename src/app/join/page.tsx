'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParticipant } from '@/hooks/useParticipant';
import Navbar from '@/components/ui/Navbar';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { participant, joinEvent, leaveEvent, loading: partLoading } = useParticipant();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const scannedCode = searchParams.get('code')?.toUpperCase().replace('#', '') || '';

  useEffect(() => {
    if (scannedCode) {
      setCode(scannedCode);
    }
  }, [scannedCode]);

  useEffect(() => {
    if (partLoading || !participant) return;

    if (scannedCode && participant.event_code !== scannedCode) {
      leaveEvent();
      return;
    }

    if (!scannedCode) {
      router.push(`/join/${participant.event_code}`);
    }
  }, [partLoading, participant, scannedCode, leaveEvent, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedCode = code.trim().replace('#', '');
    if (!trimmedCode) {
      setError('Please enter an event code');
      return;
    }
    setJoining(true);
    try {
      const session = await joinEvent(trimmedCode, name.trim() || undefined);
      router.push(`/join/${session.event_code}`);
    } catch (err: any) {
      setError(err.message);
    }
    setJoining(false);
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-10 text-center">
        <div className="bg-white rounded-[24px] p-12 max-w-[460px] w-full shadow border border-[#E2EBE6]">
          <div className="text-5xl mb-4">🙋</div>
          <h2 className="text-[28px] font-extrabold mb-2">Join a session</h2>
          <p className="text-[15px] text-[#6B7B8D] mb-8 leading-relaxed">
            Enter the event code shown on your lecturer&apos;s screen to join live polls, quizzes, and Q&amp;A.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleJoin}>
            {scannedCode && (
              <div className="mb-4 rounded-xl border border-[#E2EBE6] bg-[#EAF7EF] px-4 py-3 text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-[#2D8A4E]">Scanned teacher event</div>
                <div className="mt-1 font-mono text-2xl font-extrabold text-[#2D8A4E]">#{scannedCode}</div>
              </div>
            )}

            <div className="mb-4 text-left">
              <label className="text-[13px] font-semibold block mb-1.5">Your name (optional)</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Anonymous"
                className="w-full p-2.5 px-3.5 border-[1.5px] border-[#E2EBE6] rounded-[9px] text-sm outline-none focus:border-[#2D8A4E] transition"
              />
            </div>

            <div className="flex gap-2.5 mb-5">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="#KICK26"
                maxLength={10}
                className="flex-1 p-3 px-4 border-2 border-[#E2EBE6] rounded-[10px] text-lg font-bold font-mono text-center tracking-wider outline-none focus:border-[#2D8A4E] transition"
              />
              <button
                type="submit"
                disabled={joining}
                className="px-5 py-2 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition disabled:opacity-50"
              >
                {joining ? '...' : 'Join →'}
              </button>
            </div>
          </form>

          <div className="text-xs text-[#6B7B8D]">
            Ask your lecturer for the event code
          </div>
        </div>
      </div>
    </>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}
