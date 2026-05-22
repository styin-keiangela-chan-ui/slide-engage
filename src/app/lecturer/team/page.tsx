'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';

type Collaborator = {
  id: string;
  role: string;
  can_manage_interactions: boolean;
  can_view_results: boolean;
  lecturers?: { email: string; name: string };
};

export default function LecturerTeamPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [canManageInteractions, setCanManageInteractions] = useState(true);
  const [canViewResults, setCanViewResults] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!currentEvent) return;
    fetchCollaborators();
  }, [currentEvent?.id]);

  async function fetchCollaborators() {
    if (!currentEvent) return;
    const res = await fetch(`/api/collaborators?event_id=${currentEvent.id}`, { cache: 'no-store' });
    const data = await res.json();
    setCollaborators(data.collaborators || []);
  }

  async function inviteCollaborator() {
    if (!currentEvent || !email.trim()) return;
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: currentEvent.id,
        email,
        role: 'guest',
        can_manage_interactions: canManageInteractions,
        can_view_results: canViewResults,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || 'Unable to invite collaborator.');
      return;
    }
    setEmail('');
    setMessage(`${data.lecturer.email} was added to this event.`);
    fetchCollaborators();
  }

  async function removeCollaborator(id: string) {
    if (!window.confirm('Remove this collaborator from the event?')) return;
    const res = await fetch(`/api/collaborators?id=${id}`, { method: 'DELETE' });
    if (res.ok) setCollaborators(prev => prev.filter(item => item.id !== id));
  }

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <div className="border-b border-[#E2EBE6] bg-white px-7 py-3.5">
            <h1 className="text-lg font-bold">Team</h1>
            <p className="text-xs text-[#6B7B8D]">
              {currentEvent ? `Manage guests for ${currentEvent.event_name} · #${currentEvent.event_code}` : 'Select an event to invite collaborators'}
            </p>
          </div>

          <div className="p-7">
            {!currentEvent ? (
              <div className="rounded-[14px] border border-[#E2EBE6] bg-white p-8 text-center">
                <h2 className="mb-2 text-xl font-extrabold">No event selected</h2>
                <p className="mb-5 text-sm text-[#6B7B8D]">Guests can only be invited to one selected event at a time.</p>
                <button onClick={() => router.push('/lecturer/events')} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white">
                  Go to Events
                </button>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
                <section className="rounded-[14px] border border-[#E2EBE6] bg-white p-6">
                  <h2 className="mb-4 text-base font-bold">Invite guest</h2>
                  <p className="mb-4 text-sm text-[#6B7B8D]">The invited Gmail must already have a SlideEngage account.</p>
                  <input
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="guest@gmail.com"
                    className="mb-4 h-11 w-full rounded-[9px] border border-[#E2EBE6] px-3.5 text-sm outline-none focus:border-[#2D8A4E]"
                  />
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={canManageInteractions} onChange={event => setCanManageInteractions(event.target.checked)} />
                    Manage interactions
                  </label>
                  <label className="mb-5 flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={canViewResults} onChange={event => setCanViewResults(event.target.checked)} />
                    View results
                  </label>
                  <button disabled={loading} onClick={inviteCollaborator} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {loading ? 'Inviting...' : 'Invite'}
                  </button>
                  {message && <p className="mt-4 text-sm font-semibold text-[#6B7B8D]">{message}</p>}
                </section>

                <section className="rounded-[14px] border border-[#E2EBE6] bg-white">
                  <div className="border-b border-[#E2EBE6] px-5 py-4 text-base font-bold">Event collaborators</div>
                  {collaborators.length === 0 ? (
                    <div className="px-5 py-8 text-sm text-[#6B7B8D]">No guests invited yet.</div>
                  ) : (
                    collaborators.map(item => (
                      <div key={item.id} className="flex items-center justify-between border-b border-[#E2EBE6] px-5 py-4 last:border-b-0">
                        <div>
                          <div className="text-sm font-bold">{item.lecturers?.name || item.lecturers?.email || 'Guest'}</div>
                          <div className="text-xs text-[#6B7B8D]">
                            {item.can_manage_interactions ? 'Manage interactions' : 'View event'} · {item.can_view_results ? 'View results' : 'No result access'}
                          </div>
                        </div>
                        <button onClick={() => removeCollaborator(item.id)} className="text-xs font-semibold text-red-600">Remove</button>
                      </div>
                    ))
                  )}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
