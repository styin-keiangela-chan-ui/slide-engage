'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';

type TabKey = 'all' | 'active' | 'past' | 'archived';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active now' },
  { key: 'past', label: 'Past' },
  { key: 'archived', label: 'Archive bin' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateRange(event: Event) {
  const start = event.start_date || event.created_at?.slice(0, 10);
  const end = event.end_date || event.start_date || event.created_at?.slice(0, 10);
  if (!start) return 'No date set';

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = startDate.getMonth() === endDate.getMonth() && sameYear;
  const month = startDate.toLocaleDateString('en-US', { month: 'long' });
  const startText = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const endText = endDate.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (start === end) return endText;
  if (sameMonth) return `${month} ${startDate.getDate()} – ${endDate.getDate()}, ${endDate.getFullYear()}`;
  return `${startText} – ${endText}`;
}

function isPastEvent(event: Event) {
  return event.status === 'closed' || event.status === 'draft';
}

function isArchivedEvent(event: Event) {
  return event.status === 'archived';
}

function eventCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function LecturerEventsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    fetchEvents();
  }, [lecturer]);

  async function fetchEvents() {
    if (!lecturer) return;
    const res = await fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' });
    const data = await res.json();
    setEvents(data.events || []);
  }

  async function createEvent() {
    if (!lecturer || !eventName.trim()) {
      setError('Enter an event name.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be after the start date.');
      return;
    }

    setSaving(true);
    setError('');
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lecturer_id: lecturer.id,
        event_name: eventName.trim(),
        event_code: eventCode(),
        start_date: startDate,
        end_date: endDate,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Unable to create event.');
      return;
    }

    setEvents(prev => [data.event, ...prev]);
    selectEvent(data.event);
    setModalOpen(false);
    setEventName('');
    setStartDate(todayIso());
    setEndDate(addDaysIso(2));
    router.push(`/lecturer/events/${data.event.id}`);
  }

  async function renameEvent(event: Event) {
    const nextName = window.prompt('Rename event', event.event_name)?.trim();
    if (!nextName || nextName === event.event_name) return;

    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, event_name: nextName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to rename event.');
      return;
    }
    setEvents(prev => prev.map(item => item.id === event.id ? data.event : item));
    selectEvent(data.event);
  }

  async function archiveEvent(event: Event) {
    if (!window.confirm(`Archive "${event.event_name}"? It will stay in the database but disappear from active events.`)) return;

    const res = await fetch(`/api/events?id=${event.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to archive event.');
      return;
    }
    const archived = { ...event, status: 'archived' as const };
    setEvents(prev => prev.map(item => item.id === event.id ? archived : item));
    if (currentEvent?.id === event.id) clearSelectedEvent();
  }

  async function restoreEvent(event: Event) {
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, status: 'closed' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to restore event.');
      return;
    }
    setEvents(prev => prev.map(item => item.id === event.id ? data.event : item));
  }

  async function activateEvent(event: Event) {
    setError('');
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, status: 'live' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to activate event.');
      return;
    }
    setEvents(prev => prev.map(item => item.id === event.id ? data.event : item));
    selectEvent(data.event);
  }

  async function closeEvent(event: Event) {
    setError('');
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event.id, status: 'closed' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to close event.');
      return;
    }
    setEvents(prev => prev.map(item => item.id === event.id ? data.event : item));
    selectEvent(data.event);
  }

  const counts = useMemo(() => {
    const activeEvents = events.filter(event => !isArchivedEvent(event));
    const past = activeEvents.filter(isPastEvent).length;
    const active = activeEvents.filter(event => event.status === 'live').length;
    const archived = events.filter(isArchivedEvent).length;
    return {
      all: activeEvents.length,
      active,
      past,
      archived,
    };
  }, [events]);

  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      const archived = isArchivedEvent(event);
      const past = isPastEvent(event);
      const matchesTab = activeTab === 'archived'
        ? archived
        : !archived && (activeTab === 'all' || (activeTab === 'past' ? past : event.status === 'live'));
      const search = `${event.event_name} ${event.event_code} ${lecturer?.name || ''}`.toLowerCase();
      const matchesSearch = search.includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [activeTab, events, lecturer?.name, query, statusFilter]);

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <div className="bg-white border-b border-[#E2EBE6] px-7 py-3.5 flex items-center justify-between">
            <h1 className="text-lg font-bold">My event</h1>
            <button
              onClick={() => {
                setError('');
                setModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-[7px] text-xs font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition"
            >
              + Create event
            </button>
          </div>

          <div className="p-7">
            {error && (
              <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1 rounded-[10px] bg-[#F4F7F4] p-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-[7px] px-4 py-1.5 text-[13px] font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-white text-[#1A1A2E] shadow-sm'
                      : 'text-[#6B7B8D] hover:text-[#1A1A2E]'
                  }`}
                >
                  {tab.label}
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${activeTab === tab.key ? 'bg-[#2D8A4E] text-white' : 'bg-white text-[#6B7B8D]'}`}>
                    {counts[tab.key]}
                  </span>
                </button>
              ))}
              </div>
            </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex h-10 w-full max-w-[420px] items-center rounded-[9px] border border-[#E2EBE6] bg-white px-3.5">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, owner, code"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B7B8D]"
              />
              <span className="text-base text-[#6B7B8D]">⌕</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 w-[190px] rounded-[9px] border border-[#E2EBE6] bg-white px-3.5 text-sm text-[#6B7B8D] outline-none"
            >
              <option value="all">All events</option>
              <option value="live">Live</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <section className="overflow-hidden rounded-[14px] border border-[#E2EBE6] bg-white">
            <div className="grid grid-cols-[44px_1fr_150px_220px] items-center border-b border-[#E2EBE6] bg-white px-5 py-4 text-xs font-bold text-[#1A1A2E]">
              <input type="checkbox" className="h-4 w-4 rounded border-[#DADADA]" readOnly />
              <div>Event details</div>
              <div>Status</div>
              <div className="text-right">More actions</div>
            </div>

            {visibleEvents.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7EF] text-xl text-[#2D8A4E]">▥</div>
                <h2 className="mb-1.5 text-base font-bold">{activeTab === 'archived' ? 'Archive bin is empty' : 'No events here yet'}</h2>
                <p className="mb-6 text-sm text-[#6B7B8D]">
                  {activeTab === 'archived'
                    ? 'Archived events will appear here. You can restore them later.'
                    : 'Create your first event to collect polls, Q&A, and live responses.'}
                </p>
                {activeTab !== 'archived' && (
                  <button onClick={() => setModalOpen(true)} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white">
                    Create event
                  </button>
                )}
              </div>
            ) : (
              visibleEvents.map(event => (
                <div
                  key={event.id}
                  className="grid w-full grid-cols-[44px_1fr_150px_220px] items-center border-b border-[#E2EBE6] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#FAFCFA]"
                >
                  <input type="checkbox" className="h-4 w-4 rounded border-[#DADADA]" readOnly onClick={e => e.stopPropagation()} />
                  <button
                    type="button"
                    onClick={() => {
                      selectEvent(event);
                      router.push(`/lecturer/events/${event.id}`);
                    }}
                    className="min-w-0 text-left"
                  >
                    <div className="text-sm font-semibold text-[#1A1A2E]">
                      {event.event_name} <span className="ml-2 font-medium text-[#777]">(#{event.event_code})</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[#6B7B8D]">{formatDateRange(event)}</div>
                  </button>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7B8D]">
                    <span className={`h-2 w-2 rounded-full ${event.status === 'live' ? 'bg-[#2D8A4E]' : event.status === 'archived' ? 'bg-[#9CA3AF]' : 'bg-[#9CA3AF]'}`} />
                    <span className="capitalize">{event.status === 'live' ? 'Active now' : event.status === 'archived' ? 'archived' : 'past'}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <button onClick={() => renameEvent(event)} className="rounded border border-[#E2EBE6] px-2 py-1 font-semibold text-[#6B7B8D] hover:border-[#2D8A4E] hover:text-[#2D8A4E]">
                      Rename
                    </button>
                    {event.status === 'archived' ? (
                      <button onClick={() => restoreEvent(event)} className="rounded border border-[#E2EBE6] px-2 py-1 font-semibold text-[#2D8A4E] hover:border-[#2D8A4E]">
                        Restore
                      </button>
                    ) : (
                      <>
                        {event.status === 'live' ? (
                          <button onClick={() => closeEvent(event)} className="rounded border border-[#E2EBE6] px-2 py-1 font-semibold text-[#6B7B8D] hover:border-[#2D8A4E] hover:text-[#2D8A4E]">
                            Close
                          </button>
                        ) : (
                          <button onClick={() => activateEvent(event)} className="rounded border border-[#E2EBE6] px-2 py-1 font-semibold text-[#2D8A4E] hover:border-[#2D8A4E]">
                            Make active
                          </button>
                        )}
                        <button onClick={() => archiveEvent(event)} className="rounded border border-[#E2EBE6] px-2 py-1 font-semibold text-[#A33A3A] hover:border-[#A33A3A]">
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          <div className="mt-5 flex items-center justify-between text-sm text-[#6B7B8D]">
            <div>Page 1</div>
            <div className="flex items-center gap-5 text-[#C7C7C7]">
              <span>‹ Previous</span>
              <span>Next ›</span>
            </div>
          </div>
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5">
          <div className="w-full max-w-[640px] rounded-[14px] bg-white p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-bold text-[#1A1A2E]">Create your event</h2>
            <label className="mb-2 block text-sm font-semibold text-[#1A1A2E]">Give your event a name</label>
            <input
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="Event name"
              className="mb-5 h-11 w-full rounded-[9px] border border-[#E2EBE6] px-3.5 text-sm outline-none placeholder:text-[#858585] focus:border-[#2D8A4E]"
              autoFocus
            />

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold text-[#1A1A2E]">Start date</span>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="h-11 w-full rounded-[9px] border border-[#E2EBE6] px-3.5 text-sm outline-none focus:border-[#2D8A4E]"
                  />
                </div>
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold text-[#1A1A2E]">End date</span>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-11 w-full rounded-[9px] border border-[#E2EBE6] px-3.5 text-sm outline-none focus:border-[#2D8A4E]"
                  />
                </div>
              </label>
            </div>

            {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">{error}</div>}

            <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
              <div className="rounded-[9px] border border-[#1A6BB5] bg-[#EAF5FF] px-3.5 py-2.5 text-sm text-[#1F1F1F]">
                ⓘ Anyone with the code or link can participate
              </div>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="rounded-[9px] px-4 py-2 text-sm font-semibold text-[#6B7B8D] hover:bg-[#F3F4F6]">
                  Cancel
                </button>
                <button
                  onClick={createEvent}
                  disabled={saving}
                  className="rounded-[9px] bg-[#2D8A4E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A5C32] disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
