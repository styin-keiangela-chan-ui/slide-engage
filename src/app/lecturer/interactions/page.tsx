'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { Event, Interaction } from '@/lib/types';

function statusLabel(status: string) {
  if (status === 'live') return 'Live';
  if (status === 'closed') return 'Closed';
  return 'Draft';
}

export default function LecturerInteractionsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !lecturer) router.push('/lecturer/login');
  }, [loading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    setLoadingData(true);
    fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rows = (data.events || []) as Event[];
        setEvents(rows);

        if (currentEvent && rows.some(event => event.id === currentEvent.id && event.status !== 'archived')) {
          setSelectedEventId(currentEvent.id);
          return;
        }

        if (currentEvent?.status === 'archived') {
          clearSelectedEvent();
          setSelectedEventId('');
        }
      })
      .finally(() => setLoadingData(false));
  }, [clearSelectedEvent, currentEvent, lecturer]);

  const selectableEvents = useMemo(
    () => events.filter(event => event.status !== 'archived'),
    [events]
  );

  const selectedEvent = useMemo(
    () => selectableEvents.find(event => event.id === selectedEventId) || null,
    [selectableEvents, selectedEventId]
  );

  useEffect(() => {
    if (!selectedEvent) {
      setInteractions([]);
      return;
    }

    setLoadingData(true);
    fetch(`/api/interactions?event_id=${selectedEvent.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setInteractions(data.interactions || []))
      .finally(() => setLoadingData(false));
  }, [selectedEvent]);

  function chooseEvent(eventId: string) {
    setError('');
    setSelectedEventId(eventId);
    const event = selectableEvents.find(item => item.id === eventId);
    if (event) selectEvent(event);
  }

  function addInteraction() {
    if (!selectedEvent) {
      setError('Please select or create an event before adding interactions.');
      return;
    }
    router.push(`/lecturer/events/${selectedEvent.id}`);
  }

  async function toggleInteractionLive(interaction: Interaction) {
    if (!selectedEvent) {
      setError('Please select or create an event before adding interactions.');
      return;
    }

    if (interaction.status !== 'live' && selectedEvent.status !== 'live') {
      setError('Make this event active before starting an interaction.');
      return;
    }

    setError('');
    const nextStatus = interaction.status === 'live' ? 'closed' : 'live';
    const res = await fetch('/api/interactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: interaction.id, status: nextStatus }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Unable to update interaction status.');
      return;
    }

    setInteractions(prev => prev.map(item => item.id === interaction.id ? data.interaction : item));
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4] p-7">
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-[14px] border border-[#E2EBE6] bg-white p-5 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-extrabold text-[#1A1A2E]">Interactions</h1>
              <p className="mt-1 text-sm text-[#6B7B8D]">
                Select one event first. New interactions will use that event&apos;s code and event_id.
              </p>
            </div>
            <button
              onClick={addInteraction}
              className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1A5C32]"
            >
              + Add Interaction
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <section className="mb-5 rounded-[14px] border border-[#E2EBE6] bg-white p-5">
            <label className="mb-2 block text-sm font-bold text-[#1A1A2E]">Selected event</label>
            <select
              value={selectedEventId}
              onChange={event => chooseEvent(event.target.value)}
              className="h-11 w-full max-w-[460px] rounded-[9px] border border-[#E2EBE6] bg-white px-3.5 text-sm outline-none focus:border-[#2D8A4E]"
            >
              <option value="">Select an event</option>
              {selectableEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.event_name} · #{event.event_code} · {event.status === 'live' ? 'Active now' : 'Past'}
                </option>
              ))}
            </select>

            {selectedEvent ? (
              <div className="mt-4 rounded-[10px] bg-[#F4F7F4] px-4 py-3 text-sm">
                <div className="font-bold text-[#1A1A2E]">{selectedEvent.event_name}</div>
                <div className="mt-1 text-[#6B7B8D]">Event code: #{selectedEvent.event_code}</div>
              </div>
            ) : (
              <div className="mt-4 rounded-[10px] border border-[#E2EBE6] bg-[#FAFCFA] px-4 py-3 text-sm font-semibold text-[#6B7B8D]">
                Please select or create an event before adding interactions.
              </div>
            )}
          </section>

          <section className="rounded-[14px] border border-[#E2EBE6] bg-white">
            <div className="border-b border-[#E2EBE6] px-5 py-4 text-sm font-bold text-[#1A1A2E]">
              Interactions for selected event
            </div>
            {!selectedEvent ? (
              <div className="px-7 py-10 text-center text-sm text-[#6B7B8D]">
                Please select or create an event before adding interactions.
              </div>
            ) : loadingData ? (
              <div className="px-7 py-10 text-center text-sm text-[#6B7B8D]">Loading interactions...</div>
            ) : interactions.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7EF] text-xl text-[#2D8A4E]">▦</div>
                <h2 className="mb-1.5 text-base font-bold">No interactions yet</h2>
                <p className="mb-6 text-sm text-[#6B7B8D]">Add a poll, quiz, word cloud, or Q&A to this event.</p>
                <button onClick={addInteraction} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white">
                  Add Interaction
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2EBE6]">
                {interactions.map(interaction => (
                  <div key={interaction.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#1A1A2E]">{interaction.title}</div>
                      <div className="mt-1 text-xs capitalize text-[#6B7B8D]">{interaction.type.replace('_', ' ')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleInteractionLive(interaction)}
                      title={interaction.status === 'live' ? 'Set to closed' : 'Set to live'}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold transition hover:shadow-sm ${
                      interaction.status === 'live'
                        ? 'bg-[#EAF7EF] text-[#168A3A] hover:bg-[#D8F0E0]'
                        : 'bg-[#F3F4F6] text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#168A3A]'
                    }`}>
                      {statusLabel(interaction.status)}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
