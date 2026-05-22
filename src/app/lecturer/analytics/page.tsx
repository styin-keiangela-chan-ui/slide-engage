'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';

type Metrics = {
  participants: number;
  questions: number;
  poll_votes: number;
  quiz_answers: number;
  engagement_score: number;
  active_interactions: number;
  response_rate: number;
};

const emptyMetrics: Metrics = {
  participants: 0,
  questions: 0,
  poll_votes: 0,
  quiz_answers: 0,
  engagement_score: 0,
  active_interactions: 0,
  response_rate: 0,
};

export default function LecturerAnalyticsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading, selectEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rows = (data.events || []).filter((event: Event) => event.status !== 'archived');
        setEvents(rows);
        if (!selectedEventId && rows[0]) {
          setSelectedEventId(rows[0].id);
          selectEvent(rows[0]);
        }
      });
  }, [lecturer, selectedEventId, selectEvent]);

  useEffect(() => {
    if (!lecturer || !selectedEventId) return;
    const event = events.find(item => item.id === selectedEventId);
    if (event) selectEvent(event);

    setLoading(true);
    setError('');
    fetch(`/api/analytics?lecturer_id=${lecturer.id}&event_id=${selectedEventId}`, { cache: 'no-store' })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Unable to load analytics.');
        setMetrics({ ...emptyMetrics, ...data.metrics });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [lecturer, selectedEventId, events, selectEvent]);

  const selectedEvent = useMemo(() => events.find(event => event.id === selectedEventId) || null, [events, selectedEventId]);

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <div className="flex items-center justify-between border-b border-[#E2EBE6] bg-white px-7 py-3.5">
            <div>
              <h1 className="text-lg font-bold">Analytics</h1>
              <p className="text-xs text-[#6B7B8D]">
                {selectedEvent ? `${selectedEvent.event_name} · #${selectedEvent.event_code}` : 'Select an event to view analytics'}
              </p>
            </div>
            <select
              value={selectedEventId}
              onChange={event => setSelectedEventId(event.target.value)}
              className="h-10 min-w-[240px] rounded-[9px] border border-[#E2EBE6] bg-white px-3 text-sm outline-none"
            >
              <option value="">Select event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.event_name} · #{event.event_code}</option>
              ))}
            </select>
          </div>

          <div className="p-7">
            {!selectedEvent ? (
              <div className="rounded-[14px] border border-[#E2EBE6] bg-white p-8 text-center">
                <h2 className="mb-2 text-xl font-extrabold">No event selected</h2>
                <p className="mb-5 text-sm text-[#6B7B8D]">Analytics are event-based. Choose or create an event first.</p>
                <button onClick={() => router.push('/lecturer/events')} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white">
                  Go to Events
                </button>
              </div>
            ) : (
              <>
                {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ['Participants', metrics.participants],
                    ['Questions', metrics.questions],
                    ['Poll votes', metrics.poll_votes],
                    ['Quiz answers', metrics.quiz_answers],
                    ['Engagement score', `${metrics.engagement_score}%`],
                    ['Active interactions', metrics.active_interactions],
                    ['Response rate', `${metrics.response_rate}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[14px] border border-[#E2EBE6] bg-white p-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">{label}</div>
                      <div className="mt-3 text-3xl font-extrabold text-[#1A1A2E]">{loading ? '...' : value}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
