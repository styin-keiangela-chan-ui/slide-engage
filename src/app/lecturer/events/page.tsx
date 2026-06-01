'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import SETooltip from '@/components/ui/SETooltip';
import DashboardShell from '@/components/ui/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';

type TabKey = 'all' | 'active' | 'past';
type OwnerFilter = 'all' | 'mine' | 'organization';
type DialogMode = 'create' | 'transfer' | 'duplicate' | 'delete' | null;
type PopupPosition = { top: number; left: number } | null;

type EventRow = Event & {
  lecturers?: {
    id: string;
    email: string;
    name: string;
  } | null;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active & upcoming' },
  { key: 'past', label: 'Past' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function eventCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'No date';
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(event: EventRow) {
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

function relativeTime(value: string | null | undefined) {
  if (!value) return 'Not updated yet';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function ownerName(event: EventRow, fallback: string) {
  return event.lecturers?.name || event.lecturers?.email || fallback;
}

function ownerEmail(event: EventRow, fallback: string) {
  return event.lecturers?.email || fallback;
}

function isActiveOrUpcoming(event: EventRow) {
  if (event.status === 'archived') return false;
  if (event.status === 'live') return true;

  const today = todayIso();
  const end = event.end_date || event.start_date;
  return Boolean(end && end >= today);
}

function isPastEvent(event: EventRow) {
  return event.status !== 'archived' && !isActiveOrUpcoming(event);
}

function statusLabel(event: EventRow) {
  if (event.status === 'live') return 'Active';
  if (event.status === 'archived') return 'Archived';
  if (isActiveOrUpcoming(event)) return 'Upcoming';
  return 'Past';
}

export default function LecturerEventsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>(null);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(2));
  const [duplicateCode, setDuplicateCode] = useState(eventCode());
  const [transferEmail, setTransferEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    fetchEvents();
  }, [lecturer]);

  useEffect(() => {
    if (!selectedEvent || dialog || !popupPosition) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-event-action-popup]')) return;
      setSelectedEvent(null);
      setPopupPosition(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedEvent(null);
        setPopupPosition(null);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [dialog, popupPosition, selectedEvent]);

  async function fetchEvents() {
    if (!lecturer) return;
    const res = await fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' });
    const data = await res.json();
    setEvents(data.events || []);
  }

  function openCreateDialog() {
    setError('');
    setMessage('');
    setSelectedEvent(null);
    setPopupPosition(null);
    setDialog('create');
    setEventName('');
    setStartDate(todayIso());
    setEndDate(addDaysIso(2));
  }

  function openDuplicateDialog(event: EventRow) {
    setSelectedEvent(event);
    setPopupPosition(null);
    setEventName(`${event.event_name} copy`);
    setStartDate(event.start_date || todayIso());
    setEndDate(event.end_date || event.start_date || addDaysIso(2));
    setDuplicateCode(eventCode());
    setError('');
    setDialog('duplicate');
  }

  function openTransferDialog(event: EventRow) {
    setSelectedEvent(event);
    setPopupPosition(null);
    setTransferEmail('');
    setError('');
    setDialog('transfer');
  }

  function openDeleteDialog(event: EventRow) {
    setSelectedEvent(event);
    setPopupPosition(null);
    setError('');
    setDialog('delete');
  }

  function openActionPopup(event: EventRow, anchor: HTMLButtonElement) {
    const rect = anchor.getBoundingClientRect();
    const width = 380;
    const viewportPadding = 18;
    const left = Math.max(
      viewportPadding,
      Math.min(rect.right - width, window.innerWidth - width - viewportPadding)
    );
    const top = Math.min(rect.bottom + 10, Math.max(viewportPadding, window.innerHeight - 520));
    setSelectedEvent(event);
    setPopupPosition({ top, left });
    setDialog(null);
    setError('');
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
    setDialog(null);
    router.push(`/lecturer/events/${data.event.id}`);
  }

  async function duplicateEvent() {
    if (!lecturer || !selectedEvent || !eventName.trim()) return;
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
        action: 'duplicate',
        lecturer_id: lecturer.id,
        source_event_id: selectedEvent.id,
        event_name: eventName.trim(),
        event_code: duplicateCode,
        start_date: startDate,
        end_date: endDate,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Unable to duplicate event.');
      return;
    }

    setEvents(prev => [data.event, ...prev]);
    setDialog(null);
    setSelectedEvent(data.event);
    setPopupPosition(null);
    setMessage('Event duplicated without responses.');
  }

  async function transferEvent() {
    if (!selectedEvent || !transferEmail.trim()) return;

    setSaving(true);
    setError('');
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedEvent.id, transfer_email: transferEmail.trim() }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Unable to transfer event.');
      return;
    }

    setEvents(prev => prev.filter(item => item.id !== selectedEvent.id));
    if (currentEvent?.id === selectedEvent.id) clearSelectedEvent();
    setSelectedEvent(null);
    setPopupPosition(null);
    setDialog(null);
    setMessage('Event transferred.');
  }

  async function permanentlyDeleteEvent() {
    if (!selectedEvent) return;

    setSaving(true);
    setError('');
    const res = await fetch(`/api/events?id=${selectedEvent.id}&permanent=true`, { method: 'DELETE' });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Unable to delete event.');
      return;
    }

    setEvents(prev => prev.filter(item => item.id !== selectedEvent.id));
    if (currentEvent?.id === selectedEvent.id) clearSelectedEvent();
    setDialog(null);
    setSelectedEvent(null);
    setPopupPosition(null);
    setMessage('Event deleted.');
  }

  const counts = useMemo(() => {
    const rows = events.filter(event => event.status !== 'archived');
    return {
      all: rows.length,
      active: rows.filter(isActiveOrUpcoming).length,
      past: rows.filter(isPastEvent).length,
    };
  }, [events]);

  const visibleEvents = useMemo(() => {
    return events.filter(event => {
      if (event.status === 'archived') return false;
      const matchesTab = activeTab === 'all'
        || (activeTab === 'active' ? isActiveOrUpcoming(event) : isPastEvent(event));
      const search = `${event.event_name} ${event.event_code} ${ownerName(event, lecturer?.name || '')} ${ownerEmail(event, lecturer?.email || '')}`.toLowerCase();
      const matchesSearch = search.includes(query.toLowerCase());
      const matchesOwner = ownerFilter === 'all'
        || (ownerFilter === 'mine' ? event.lecturer_id === lecturer?.id : event.lecturer_id !== lecturer?.id);
      return matchesTab && matchesSearch && matchesOwner;
    });
  }, [activeTab, events, lecturer?.email, lecturer?.id, lecturer?.name, ownerFilter, query]);

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F7FAF8]">
          <DashboardShell>
            {error && (
              <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-5 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-[#168A3A]">
                {message}
              </div>
            )}

            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div className="flex flex-wrap gap-4">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-[12px] px-5 py-3 text-sm font-extrabold transition ${
                      activeTab === tab.key
                        ? 'border border-[#168A3A] bg-[#EAF7EF] text-[#168A3A]'
                        : 'bg-transparent text-[#1A1A2E] hover:bg-white'
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-md px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-[#168A3A] text-white' : 'bg-white text-[#6B7B8D]'}`}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={openCreateDialog}
                aria-label="Create a new event"
                className="h-12 rounded-[12px] bg-[#168A3A] px-6 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0F6F2D]"
              >
                <SETooltip text="Create a new event">+ Create event</SETooltip>
              </button>
            </div>

            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <SETooltip text="Search events by name, owner, or event code" className="w-full max-w-[520px]">
                <div className="flex h-12 w-full items-center rounded-[12px] border border-[#DDE8E1] bg-white px-4">
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search by name, owner, code"
                  aria-label="Search events by name, owner, or event code"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#1A1A2E] outline-none placeholder:text-[#6B7B8D]"
                />
                <span className="text-xl text-[#6B7B8D]">⌕</span>
                </div>
              </SETooltip>

              <SETooltip text="Filter events" className="w-full md:w-[240px]">
                <select
                  value={ownerFilter}
                  onChange={event => setOwnerFilter(event.target.value as OwnerFilter)}
                  aria-label="Filter events"
                  className="h-12 w-full rounded-[12px] border border-[#DDE8E1] bg-white px-4 text-sm font-semibold text-[#6B7B8D] outline-none"
                >
                  <option value="all">All events</option>
                  <option value="mine">Created by me</option>
                  <option value="organization">Organization events</option>
                </select>
              </SETooltip>
            </div>

            <section className="overflow-hidden rounded-[18px] border border-[#DDE8E1] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-[44px_minmax(240px,1fr)_170px_150px] items-center border-b border-[#E2EBE6] px-6 py-4 text-sm font-extrabold text-[#1A1A2E]">
                <SETooltip text="Select event">
                  <input type="checkbox" aria-label="Select event" className="h-4 w-4 rounded border-[#DADADA]" readOnly />
                </SETooltip>
                <div>Event details</div>
                <div>Status</div>
                <div className="text-right">More actions</div>
              </div>

              {visibleEvents.length === 0 ? (
                <div className="px-7 py-14 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF7EF] text-2xl">📅</div>
                  <h2 className="mb-1.5 text-base font-extrabold text-[#1A1A2E]">No events here yet</h2>
                  <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">Create an event to collect polls, Q&A, and live responses.</p>
                  <button onClick={openCreateDialog} className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-bold text-white">
                    Create event
                  </button>
                </div>
              ) : (
                visibleEvents.map(event => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[44px_minmax(240px,1fr)_170px_150px] items-center border-b border-[#E2EBE6] px-6 py-5 last:border-b-0 hover:bg-[#FAFCFA]"
                  >
                    <SETooltip text="Select event">
                      <input type="checkbox" aria-label="Select event" className="h-4 w-4 rounded border-[#DADADA]" readOnly />
                    </SETooltip>
                    <button
                      type="button"
                      onClick={() => {
                        selectEvent(event);
                        router.push(`/lecturer/events/${event.id}`);
                      }}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate text-base font-extrabold text-[#1A1A2E]">
                        {event.event_name} <span className="ml-2 font-semibold text-[#777]">(#{event.event_code})</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#6B7B8D]">{formatDateRange(event)}</div>
                    </button>
                    <div className="text-sm font-bold text-[#6B7B8D]">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${event.status === 'live' ? 'bg-[#168A3A]' : 'bg-[#A8B1BA]'}`} />
                        <span>{statusLabel(event)}</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#9AA6B2]">{relativeTime(event.updated_at || event.created_at)}</div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <SETooltip text="Duplicate event">
                        <button
                          type="button"
                          onClick={() => openDuplicateDialog(event)}
                          aria-label="Duplicate event"
                          className="grid h-9 w-9 place-items-center rounded-[9px] border border-[#DDE8E1] text-lg text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A]"
                        >
                          ⧉
                        </button>
                      </SETooltip>
                      <SETooltip text="More actions">
                        <button
                          type="button"
                          onClick={clickEvent => openActionPopup(event, clickEvent.currentTarget)}
                          aria-label="More actions"
                          className="grid h-9 w-9 place-items-center rounded-[9px] text-xl font-bold text-[#1A1A2E] hover:bg-[#EAF7EF]"
                        >
                          ...
                        </button>
                      </SETooltip>
                    </div>
                  </div>
                ))
              )}
            </section>

            <div className="mt-5 flex items-center justify-between text-sm font-semibold text-[#6B7B8D]">
              <div>Page 1</div>
              <div className="flex items-center gap-5 text-[#C7C7C7]">
                <span>‹ Previous</span>
                <span>Next ›</span>
              </div>
            </div>
          </DashboardShell>
        </main>
      </div>

      {selectedEvent && popupPosition && !dialog && (
        <EventActionPopup
          event={selectedEvent}
          owner={ownerName(selectedEvent, lecturer.name)}
          position={popupPosition}
          onClose={() => {
            setSelectedEvent(null);
            setPopupPosition(null);
          }}
          onViewResults={() => {
            selectEvent(selectedEvent);
            router.push(`/lecturer/analytics?event_id=${selectedEvent.id}`);
          }}
          onDuplicate={() => openDuplicateDialog(selectedEvent)}
          onTransfer={() => openTransferDialog(selectedEvent)}
          onDelete={() => openDeleteDialog(selectedEvent)}
        />
      )}

      {dialog === 'create' && (
        <EventFormModal
          title="Create your event"
          actionLabel="Create event"
          saving={saving}
          eventName={eventName}
          startDate={startDate}
          endDate={endDate}
          onNameChange={setEventName}
          onStartChange={value => {
            setStartDate(value);
            if (endDate < value) setEndDate(value);
          }}
          onEndChange={setEndDate}
          onCancel={() => setDialog(null)}
          onSubmit={createEvent}
          error={error}
        />
      )}

      {dialog === 'duplicate' && selectedEvent && (
        <DuplicateModal
          saving={saving}
          eventName={eventName}
          startDate={startDate}
          endDate={endDate}
          eventCode={duplicateCode}
          onNameChange={setEventName}
          onStartChange={value => {
            setStartDate(value);
            if (endDate < value) setEndDate(value);
          }}
          onEndChange={setEndDate}
          onCodeChange={setDuplicateCode}
          onCancel={() => setDialog(null)}
          onSubmit={duplicateEvent}
          error={error}
        />
      )}

      {dialog === 'transfer' && selectedEvent && (
        <TransferModal
          saving={saving}
          value={transferEmail}
          onChange={setTransferEmail}
          onCancel={() => setDialog(null)}
          onSubmit={transferEvent}
          error={error}
        />
      )}

      {dialog === 'delete' && selectedEvent && (
        <DeleteModal
          saving={saving}
          eventName={selectedEvent.event_name}
          onCancel={() => setDialog(null)}
          onSubmit={permanentlyDeleteEvent}
          error={error}
        />
      )}
    </>
  );
}

function ModalShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5">
      <div className="w-full max-w-[720px] rounded-[18px] bg-white p-7 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function EventFormModal({
  title,
  actionLabel,
  saving,
  eventName,
  startDate,
  endDate,
  onNameChange,
  onStartChange,
  onEndChange,
  onCancel,
  onSubmit,
  error,
}: {
  title: string;
  actionLabel: string;
  saving: boolean;
  eventName: string;
  startDate: string;
  endDate: string;
  onNameChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <ModalShell>
      <h2 className="mb-6 text-2xl font-extrabold text-[#1A1A2E]">{title}</h2>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <label className="mb-2 block text-sm font-bold text-[#1A1A2E]">Give your event a name</label>
      <input
        value={eventName}
        onChange={event => onNameChange(event.target.value)}
        placeholder="Event name"
        className="mb-5 h-12 w-full rounded-[12px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none placeholder:text-[#858585] focus:border-[#168A3A]"
        autoFocus
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DateField label="Start date" value={startDate} onChange={onStartChange} />
        <DateField label="End date" value={endDate} min={startDate} onChange={onEndChange} />
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="rounded-[10px] border border-[#1A6BB5] bg-[#EAF5FF] px-4 py-3 text-sm font-semibold text-[#1F1F1F]">
          ⓘ Anyone with the code or link can participate
        </div>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#0F6F2D] disabled:opacity-60"
          >
            {saving ? 'Saving...' : actionLabel}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function DateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-[#1A1A2E]">{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={event => onChange(event.target.value)}
        className="h-12 w-full rounded-[12px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]"
      />
    </label>
  );
}

function DuplicateModal({
  saving,
  eventName,
  startDate,
  endDate,
  eventCode,
  onNameChange,
  onStartChange,
  onEndChange,
  onCodeChange,
  onCancel,
  onSubmit,
  error,
}: {
  saving: boolean;
  eventName: string;
  startDate: string;
  endDate: string;
  eventCode: string;
  onNameChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <ModalShell>
      <h2 className="mb-6 text-2xl font-extrabold text-[#1A1A2E]">Duplicate your event</h2>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DateField label="Start date" value={startDate} onChange={onStartChange} />
        <DateField label="End date" value={endDate} min={startDate} onChange={onEndChange} />
      </div>
      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-bold text-[#1A1A2E]">Give your event a name</span>
        <input value={eventName} onChange={event => onNameChange(event.target.value)} className="h-12 w-full rounded-[12px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]" />
      </label>
      <label className="mb-6 block">
        <span className="mb-2 block text-sm font-bold text-[#1A1A2E]">Event code</span>
        <input value={eventCode} onChange={event => onCodeChange(event.target.value.toUpperCase().replace('#', ''))} className="h-12 w-full rounded-[12px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]" />
      </label>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">Cancel</button>
        <button onClick={onSubmit} disabled={saving || !eventName.trim() || !eventCode.trim()} className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F6F2D] disabled:opacity-60">
          {saving ? 'Duplicating...' : 'Duplicate'}
        </button>
      </div>
    </ModalShell>
  );
}

function TransferModal({ saving, value, onChange, onCancel, onSubmit, error }: { saving: boolean; value: string; onChange: (value: string) => void; onCancel: () => void; onSubmit: () => void; error?: string }) {
  const valid = /.+@.+\..+/.test(value.trim());
  return (
    <ModalShell>
      <h2 className="mb-3 text-2xl font-extrabold text-[#1A1A2E]">Transfer event</h2>
      <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">Transfer your event to a new owner within your organization.</p>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Search by name or email"
        className="mb-6 h-12 w-full rounded-[12px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]"
        autoFocus
      />
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">Cancel</button>
        <button onClick={onSubmit} disabled={saving || !valid} className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F6F2D] disabled:opacity-60">
          {saving ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
    </ModalShell>
  );
}

function DeleteModal({ saving, eventName, onCancel, onSubmit, error }: { saving: boolean; eventName: string; onCancel: () => void; onSubmit: () => void; error?: string }) {
  return (
    <ModalShell>
      <h2 className="mb-3 text-2xl font-extrabold text-[#1A1A2E]">Delete event?</h2>
      <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">
        This will permanently delete <span className="font-extrabold text-[#1A1A2E]">{eventName}</span> and its interactions. This action cannot be undone.
      </p>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">Cancel</button>
        <button onClick={onSubmit} disabled={saving} className="rounded-[10px] bg-red-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60">
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </ModalShell>
  );
}

function EventActionPopup({
  event,
  owner,
  position,
  onClose,
  onViewResults,
  onDuplicate,
  onTransfer,
  onDelete,
}: {
  event: EventRow;
  owner: string;
  position: { top: number; left: number };
  onClose: () => void;
  onViewResults: () => void;
  onDuplicate: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}) {
  return (
    <aside
      data-event-action-popup
      className="fixed z-50 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-[18px] border border-[#E4EAE6] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#EEF2EF] p-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-black text-[#1A1A2E]">{event.event_name}</h2>
          <p className="mt-1 text-sm font-semibold text-[#6B7B8D]">{formatDateRange(event)}</p>
        </div>
        <SETooltip text="Close actions">
          <button onClick={onClose} aria-label="Close actions" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl text-[#6B7B8D] hover:bg-[#F3F4F6]">×</button>
        </SETooltip>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-black text-[#1A1A2E]">{event.event_name}</div>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#4B5563]">
              <div className="flex items-center gap-2">
                <span aria-hidden="true">📅</span>
                <span>{formatDateRange(event)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">♙</span>
                <span className="truncate">{owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">#</span>
                <span>{event.event_code}</span>
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-[10px] bg-[#F3F4F6] px-3 py-2 text-sm font-bold text-[#4B5563]">
            {relativeTime(event.updated_at || event.created_at)}
          </span>
        </div>

        <div className="inline-flex rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-extrabold text-[#168A3A]">
          {statusLabel(event)}
        </div>

        <div className="space-y-3">
          <ActionCard
            title="View results"
            description="See poll results, engagement and analysis of your event."
            icon="↗"
            iconClassName="bg-[#EAF4FF] text-[#1F6399]"
            tooltip="View analytics, engagement and results"
            onClick={onViewResults}
          />
          <ActionCard
            title="Duplicate"
            description="Create a fresh event using interactions and settings from this event."
            icon="⧉"
            iconClassName="bg-[#EAF7EF] text-[#168A3A]"
            tooltip="Create a copy of this event"
            onClick={onDuplicate}
          />
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-[12px] bg-[#F4F4F4]">
          <SETooltip text="Transfer ownership to another member" className="flex-1">
            <button onClick={onTransfer} aria-label="Transfer ownership to another member" className="w-full px-4 py-3 text-sm font-extrabold text-[#5B6470] hover:bg-[#EAF7EF] hover:text-[#168A3A]">
              ↔ Transfer
            </button>
          </SETooltip>
          <SETooltip text="Permanently delete this event" className="flex-1">
            <button onClick={onDelete} aria-label="Permanently delete this event" className="w-full border-l border-white px-4 py-3 text-sm font-extrabold text-red-600 hover:bg-red-50">
              🗑 Delete
            </button>
          </SETooltip>
        </div>
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#6B7B8D]">{label}</span>
      <span className="text-right text-[#1A1A2E]">{value}</span>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  iconClassName = 'bg-[#EAF7EF] text-[#168A3A]',
  tooltip,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  iconClassName?: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <SETooltip text={tooltip} className="w-full">
      <button aria-label={tooltip} onClick={onClick} className="flex w-full overflow-hidden rounded-[14px] border border-[#DDE8E1] bg-white text-left transition hover:border-[#168A3A] hover:shadow-sm">
        <span className={`grid w-[92px] shrink-0 place-items-center text-3xl ${iconClassName}`}>{icon}</span>
        <span className="px-4 py-4">
          <span className="block text-base font-extrabold text-[#1A1A2E]">{title}</span>
          <span className="mt-1 block text-sm font-semibold text-[#6B7B8D]">{description}</span>
        </span>
      </button>
    </SETooltip>
  );
}
