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
type DialogMode = 'create' | 'transfer' | 'duplicate' | 'delete' | 'bulk-delete' | null;
type PopupPosition = { top: number; left: number } | null;
type StatusMenuState = { event: EventRow; top: number; left: number } | null;
type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
} | null;

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
  return event.status !== 'archived' && event.status !== 'live' && hasEnded(event);
}

function statusLabel(event: EventRow) {
  if (isPastEvent(event)) return 'Past';
  if (event.status === 'draft') return 'Draft';
  if (event.status === 'live') return 'Active';
  if (event.status === 'archived') return 'Archived';
  return 'Closed';
}

function hasEnded(event: EventRow) {
  const end = event.end_date || event.start_date;
  return Boolean(end && end < todayIso());
}

function statusTooltip(event: EventRow) {
  const label = statusLabel(event);
  if (label === 'Draft') return 'Event has not started yet';
  if (label === 'Active') return 'Currently accepting responses';
  if (label === 'Closed') return 'Responses are disabled';
  return 'Event has ended';
}

function statusPillClass(event: EventRow) {
  const label = statusLabel(event);
  if (label === 'Draft') return 'bg-[#F3F4F6] text-[#5B6470]';
  if (label === 'Active') return 'bg-[#EAF7EF] text-[#168A3A]';
  if (label === 'Closed') return 'bg-[#FFF3E2] text-[#B85B00]';
  return 'bg-[#F6F7F8] text-[#8A96A3]';
}

function statusDotClass(event: EventRow) {
  const label = statusLabel(event);
  if (label === 'Draft') return 'bg-[#9AA6B2]';
  if (label === 'Active') return 'bg-[#168A3A]';
  if (label === 'Closed') return 'bg-[#E18B24]';
  return 'bg-[#C7CDD4]';
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
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [popupPosition, setPopupPosition] = useState<PopupPosition>(null);
  const [statusMenu, setStatusMenu] = useState<StatusMenuState>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [eventName, setEventName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(2));
  const [duplicateCode, setDuplicateCode] = useState(eventCode());
  const [transferEmail, setTransferEmail] = useState('');
  const [transferUserExists, setTransferUserExists] = useState(false);
  const [checkingTransferUser, setCheckingTransferUser] = useState(false);
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
    setSelectedEventIds(prev => prev.filter(id => events.some(event => event.id === id && event.status !== 'archived')));
  }, [events]);

  useEffect(() => {
    if (dialog || (!popupPosition && !statusMenu)) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-event-action-popup]')) return;
      if (target?.closest('[data-event-status-menu]')) return;
      setSelectedEvent(null);
      setPopupPosition(null);
      setStatusMenu(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedEvent(null);
        setPopupPosition(null);
        setStatusMenu(null);
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [dialog, popupPosition, statusMenu]);

  useEffect(() => {
    if (dialog !== 'transfer') return;
    const email = transferEmail.trim().toLowerCase();
    setTransferUserExists(false);
    setError('');

    if (!/.+@.+\..+/.test(email)) {
      setCheckingTransferUser(false);
      return;
    }

    let cancelled = false;
    setCheckingTransferUser(true);
    const timeout = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/events?cohost_email=${encodeURIComponent(email)}`, { method: 'HEAD' });
        if (!cancelled) {
          setTransferUserExists(res.status === 204);
          setError(res.status === 404 ? 'User not found in SlideEngage.' : '');
        }
      } catch {
        if (!cancelled) setError('Unable to check this SlideEngage user.');
      } finally {
        if (!cancelled) setCheckingTransferUser(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [dialog, transferEmail]);

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
    setEventName('');
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
    setTransferUserExists(false);
    setCheckingTransferUser(false);
    setError('');
    setDialog('transfer');
  }

  function openDeleteDialog(event: EventRow) {
    setSelectedEvent(event);
    setPopupPosition(null);
    setError('');
    setDialog('delete');
  }

  function openBulkDeleteDialog() {
    if (selectedEventIds.length === 0) return;
    setSelectedEvent(null);
    setPopupPosition(null);
    setError('');
    setDialog('bulk-delete');
  }

  function openActionPopup(event: EventRow, anchor: HTMLButtonElement) {
    const rect = anchor.getBoundingClientRect();
    const width = 340;
    const viewportPadding = 18;
    const popupHeight = Math.min(420, window.innerHeight - 120);
    const left = Math.max(
      viewportPadding,
      Math.min(rect.right - width, window.innerWidth - width - viewportPadding)
    );
    const top = Math.min(rect.bottom + 8, Math.max(viewportPadding, window.innerHeight - popupHeight - viewportPadding));
    setSelectedEvent(event);
    setPopupPosition({ top, left });
    setDialog(null);
    setError('');
  }

  function openStatusMenu(event: EventRow, anchor: HTMLButtonElement) {
    if (statusLabel(event) === 'Past') return;
    const rect = anchor.getBoundingClientRect();
    const width = 180;
    const viewportPadding = 18;
    const left = Math.max(
      viewportPadding,
      Math.min(rect.left, window.innerWidth - width - viewportPadding)
    );
    const top = Math.min(rect.bottom + 8, window.innerHeight - 220);
    setStatusMenu({ event, top: Math.max(viewportPadding, top), left });
    setSelectedEvent(null);
    setPopupPosition(null);
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
    if (!selectedEvent || !transferEmail.trim() || !transferUserExists) return;

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

  async function permanentlyDeleteSelectedEvents() {
    if (selectedEventIds.length === 0) return;

    setSaving(true);
    setError('');
    const results = await Promise.all(
      selectedEventIds.map(async id => {
        const res = await fetch(`/api/events?id=${id}&permanent=true`, { method: 'DELETE' });
        const data = await res.json();
        return { id, ok: res.ok, error: data.error as string | undefined };
      })
    );
    setSaving(false);

    const failed = results.find(result => !result.ok);
    if (failed) {
      setError(failed.error || 'Unable to delete selected events.');
      return;
    }

    setEvents(prev => prev.filter(item => !selectedEventIds.includes(item.id)));
    if (currentEvent && selectedEventIds.includes(currentEvent.id)) clearSelectedEvent();
    setSelectedEventIds([]);
    setDialog(null);
    setMessage(`${results.length} ${results.length === 1 ? 'event' : 'events'} deleted.`);
  }

  async function patchEventStatus(id: string, status: Event['status']) {
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to update event status.');
    setEvents(prev => prev.map(event => event.id === id ? data.event : event));
    if (currentEvent?.id === id) selectEvent(data.event);
    return data.event as EventRow;
  }

  async function patchSelectedEventStatuses(status: Event['status']) {
    const editableIds = selectedEventIds.filter(id => {
      const event = events.find(item => item.id === id);
      return event && !isPastEvent(event);
    });

    for (const id of editableIds) {
      await patchEventStatus(id, status);
    }
    setSelectedEventIds([]);
    return editableIds.length;
  }

  async function resetEventResults(eventId: string) {
    const interactionsRes = await fetch(`/api/interactions?event_id=${eventId}`, { cache: 'no-store' });
    const interactionsData = await interactionsRes.json();
    if (!interactionsRes.ok) throw new Error(interactionsData.error || 'Unable to load event interactions.');

    const interactions = interactionsData.interactions || [];
    for (const interaction of interactions) {
      const res = await fetch(`/api/responses?interaction_id=${interaction.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reset event results.');
    }
  }

  function confirmStatusChange(event: EventRow, status: Event['status'], title: string, description: string, confirmLabel: string) {
    setStatusMenu(null);
    setConfirmAction({
      title,
      description,
      confirmLabel,
      run: async () => {
        const updated = await patchEventStatus(event.id, status);
        setMessage(`${updated.event_name} is now ${statusLabel(updated).toLowerCase()}.`);
      },
    });
  }

  function confirmBulkStatus(status: Event['status'], title: string, description: string, confirmLabel: string) {
    if (selectedEventIds.length === 0) return;
    setConfirmAction({
      title,
      description,
      confirmLabel,
      run: async () => {
        const updatedCount = await patchSelectedEventStatuses(status);
        setMessage(updatedCount === 0
          ? 'Past events are read-only. No events were updated.'
          : `${updatedCount} ${updatedCount === 1 ? 'event' : 'events'} updated.`
        );
      },
    });
  }

  async function runConfirmedAction() {
    if (!confirmAction) return;
    setSaving(true);
    setError('');
    try {
      await confirmAction.run();
      setConfirmAction(null);
    } catch (eventError: any) {
      setError(eventError.message || 'Unable to complete this action.');
    } finally {
      setSaving(false);
    }
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

  const visibleEventIds = useMemo(() => visibleEvents.map(event => event.id), [visibleEvents]);
  const selectedVisibleCount = selectedEventIds.filter(id => visibleEventIds.includes(id)).length;
  const allVisibleSelected = visibleEvents.length > 0 && selectedVisibleCount === visibleEvents.length;
  const hasPartialSelection = selectedVisibleCount > 0 && !allVisibleSelected;

  function toggleEventSelection(id: string) {
    setSelectedEventIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  }

  function toggleAllVisibleEvents() {
    if (allVisibleSelected) {
      setSelectedEventIds(prev => prev.filter(id => !visibleEventIds.includes(id)));
      return;
    }

    setSelectedEventIds(prev => Array.from(new Set([...prev, ...visibleEventIds])));
  }

  function selectAllVisibleEvents() {
    setSelectedEventIds(prev => Array.from(new Set([...prev, ...visibleEventIds])));
  }

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

            <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div className="flex flex-wrap gap-3">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-sm font-extrabold transition ${
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
                className="h-11 rounded-[11px] bg-[#168A3A] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0F6F2D]"
              >
                <SETooltip text="Create a new event">+ Create event</SETooltip>
              </button>
            </div>

            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <SETooltip text="Search events by name, owner, or event code" className="w-full max-w-[520px]">
                <div className="flex h-11 w-full items-center rounded-[11px] border border-[#DDE8E1] bg-white px-4">
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
                  className="h-11 w-full rounded-[11px] border border-[#DDE8E1] bg-white px-4 text-sm font-semibold text-[#6B7B8D] outline-none"
                >
                  <option value="all">All events</option>
                  <option value="mine">Created by me</option>
                  <option value="organization">Organization events</option>
                </select>
              </SETooltip>
            </div>

            {selectedVisibleCount > 0 && (
              <div className="mb-3 flex flex-col gap-3 rounded-[14px] border border-[#DDE8E1] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#ECF8F0] px-3 py-1 text-sm font-extrabold text-[#168A3A]">
                    {selectedVisibleCount} {selectedVisibleCount === 1 ? 'event' : 'events'} selected
                  </span>
                  {selectedVisibleCount < visibleEvents.length && (
                    <button
                      type="button"
                      onClick={selectAllVisibleEvents}
                      className="text-sm font-extrabold text-[#168A3A] hover:underline"
                    >
                      Select all {visibleEvents.length} events
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <SETooltip text="Make selected events live">
                    <button
                      type="button"
                      onClick={() => confirmBulkStatus(
                        'live',
                        'Make selected events live?',
                        'Are you sure you want to make the selected events live?',
                        'Go Live'
                      )}
                      aria-label="Make selected events live"
                      className="rounded-[10px] border border-[#CFE4D5] bg-white px-4 py-2 text-sm font-extrabold text-[#168A3A] transition hover:bg-[#ECF8F0]"
                    >
                      Go Live
                    </button>
                  </SETooltip>
                  <SETooltip text="Close selected events">
                    <button
                      type="button"
                      onClick={() => confirmBulkStatus(
                        'closed',
                        'Close selected events?',
                        'Close the selected events and stop accepting responses?',
                        'Close'
                      )}
                      aria-label="Close selected events"
                      className="rounded-[10px] border border-[#F3D5B0] bg-white px-4 py-2 text-sm font-extrabold text-[#B85B00] transition hover:bg-[#FFF3E2]"
                    >
                      Close
                    </button>
                  </SETooltip>
                  <SETooltip text="Delete selected events">
                    <button
                      type="button"
                      onClick={openBulkDeleteDialog}
                      aria-label="Delete selected events"
                      className="rounded-[10px] border border-red-200 bg-white px-4 py-2 text-sm font-extrabold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </SETooltip>
                  <SETooltip text="Clear selected events">
                    <button
                      type="button"
                      onClick={() => setSelectedEventIds([])}
                      aria-label="Clear selected events"
                      className="grid h-9 w-9 place-items-center rounded-full text-xl font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]"
                    >
                      ×
                    </button>
                  </SETooltip>
                </div>
              </div>
            )}

            <section className="overflow-hidden rounded-[18px] border border-[#DDE8E1] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.04)]">
              <div className="grid grid-cols-[40px_minmax(220px,1fr)_150px_132px] items-center border-b border-[#E2EBE6] px-5 py-3.5 text-sm font-extrabold text-[#1A1A2E]">
                <SETooltip text="Select event">
                  <input
                    type="checkbox"
                    aria-label="Select event"
                    checked={allVisibleSelected}
                    ref={node => {
                      if (node) node.indeterminate = hasPartialSelection;
                    }}
                    onChange={toggleAllVisibleEvents}
                    className="h-4 w-4 rounded border-[#DADADA] accent-[#168A3A]"
                  />
                </SETooltip>
                <div>Event details</div>
                <div>Status</div>
                <div className="text-right">More actions</div>
              </div>

              {visibleEvents.length === 0 ? (
                <div className="px-7 py-14 text-center">
                  <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#EAF7EF] text-xl">📅</div>
                  <h2 className="mb-1.5 text-base font-extrabold text-[#1A1A2E]">No events here yet</h2>
                  <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">Create an event to collect polls, Q&A, and live responses.</p>
                  <button onClick={openCreateDialog} className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-bold text-white">
                    Create event
                  </button>
                </div>
              ) : (
                visibleEvents.map(event => {
                  const isSelected = selectedEventIds.includes(event.id);
                  return (
                    <div
                      key={event.id}
                      className={`grid grid-cols-[40px_minmax(220px,1fr)_150px_132px] items-center border-b border-[#E2EBE6] px-5 py-4 transition last:border-b-0 ${
                        isSelected ? 'bg-[#ECF8F0] hover:bg-[#E4F5EA]' : 'hover:bg-[#FAFCFA]'
                      }`}
                    >
                      <SETooltip text="Select event">
                        <input
                          type="checkbox"
                          aria-label="Select event"
                          checked={isSelected}
                          onChange={() => toggleEventSelection(event.id)}
                          className="h-4 w-4 rounded border-[#DADADA] accent-[#168A3A]"
                        />
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
                        <SETooltip text={statusTooltip(event)}>
                          <button
                            type="button"
                            onClick={clickEvent => openStatusMenu(event, clickEvent.currentTarget)}
                            disabled={statusLabel(event) === 'Past'}
                            aria-label={statusTooltip(event)}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold transition ${statusPillClass(event)} ${
                              statusLabel(event) === 'Past' ? 'cursor-default opacity-80' : 'hover:shadow-sm'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${statusDotClass(event)}`} />
                            {statusLabel(event)}
                            {statusLabel(event) !== 'Past' && <span className="text-[10px]">⌄</span>}
                          </button>
                        </SETooltip>
                        <div className="mt-1 text-xs font-semibold text-[#9AA6B2]">{relativeTime(event.updated_at || event.created_at)}</div>
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <SETooltip text="Duplicate event">
                          <button
                            type="button"
                            onClick={() => openDuplicateDialog(event)}
                            aria-label="Duplicate event"
                            className="grid h-8 w-8 place-items-center rounded-[9px] border border-[#DDE8E1] text-base text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A]"
                          >
                            ⧉
                          </button>
                        </SETooltip>
                        <SETooltip text="More actions">
                          <button
                            type="button"
                            onClick={clickEvent => openActionPopup(event, clickEvent.currentTarget)}
                            aria-label="More actions"
                            className="grid h-8 w-8 place-items-center rounded-[9px] text-lg font-bold text-[#1A1A2E] hover:bg-[#EAF7EF]"
                          >
                            ...
                          </button>
                        </SETooltip>
                      </div>
                    </div>
                  );
                })
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

      {statusMenu && !dialog && (
        <StatusDropdown
          event={statusMenu.event}
          position={{ top: statusMenu.top, left: statusMenu.left }}
          onGoLive={() => confirmStatusChange(
            statusMenu.event,
            'live',
            'Make event live?',
            'Are you sure you want to make this event live?',
            'Go Live'
          )}
          onCloseEvent={() => confirmStatusChange(
            statusMenu.event,
            'closed',
            'Close event?',
            'Close this event and stop accepting responses?',
            'Close Event'
          )}
          onReopen={() => confirmStatusChange(
            statusMenu.event,
            'live',
            'Reopen event?',
            'Reopen this event and allow responses again?',
            'Reopen Event'
          )}
          onDeleteDraft={() => {
            setStatusMenu(null);
            openDeleteDialog(statusMenu.event);
          }}
          onArchive={() => confirmStatusChange(
            statusMenu.event,
            'archived',
            'Archive event?',
            'Archive this event and move it out of active and past lists?',
            'Archive Event'
          )}
          onResetResults={() => {
            const target = statusMenu.event;
            setStatusMenu(null);
            setConfirmAction({
              title: 'Reset event results?',
              description: 'Reset all submitted responses and questions for this event? Interactions and settings will remain.',
              confirmLabel: 'Reset Results',
              destructive: true,
              run: async () => {
                await resetEventResults(target.id);
                setMessage('Results cleared successfully.');
              },
            });
          }}
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
          suggestedName={`${selectedEvent.event_name} copy`}
          onNameChange={setEventName}
          onStartChange={value => {
            setStartDate(value);
            if (endDate < value) setEndDate(value);
          }}
          onEndChange={setEndDate}
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
          userExists={transferUserExists}
          checking={checkingTransferUser}
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

      {dialog === 'bulk-delete' && (
        <DeleteModal
          saving={saving}
          eventName={`${selectedVisibleCount} ${selectedVisibleCount === 1 ? 'event' : 'events'}`}
          title="Delete selected events?"
          description="This will permanently delete the selected events and their interactions. This action cannot be undone."
          onCancel={() => setDialog(null)}
          onSubmit={permanentlyDeleteSelectedEvents}
          error={error}
        />
      )}

      {confirmAction && (
        <ConfirmModal
          saving={saving}
          title={confirmAction.title}
          description={confirmAction.description}
          confirmLabel={confirmAction.confirmLabel}
          destructive={confirmAction.destructive}
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
          error={error}
        />
      )}
    </>
  );
}

function ModalShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5">
      <div className="w-full max-w-[560px] rounded-[18px] bg-white p-6 shadow-2xl">
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
      <h2 className="mb-5 text-xl font-extrabold text-[#1A1A2E]">{title}</h2>
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
        className="mb-5 h-11 w-full rounded-[11px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none placeholder:text-[#858585] focus:border-[#168A3A]"
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
          className="h-11 w-full rounded-[11px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]"
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
  suggestedName,
  onNameChange,
  onStartChange,
  onEndChange,
  onCancel,
  onSubmit,
  error,
}: {
  saving: boolean;
  eventName: string;
  startDate: string;
  endDate: string;
  eventCode: string;
  suggestedName: string;
  onNameChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <ModalShell>
      <h2 className="mb-5 text-xl font-extrabold text-[#1A1A2E]">Duplicate your event</h2>
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
        <input
          value={eventName}
          onChange={event => onNameChange(event.target.value)}
          placeholder={suggestedName}
          className="h-11 w-full rounded-[11px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none placeholder:text-[#9AA6B2] focus:border-[#168A3A]"
        />
        {!eventName.trim() && (
          <span className="mt-2 block text-xs font-bold text-[#6B7B8D]">Please enter an event name.</span>
        )}
      </label>
      <label className="mb-6 block">
        <span className="mb-2 block text-sm font-bold text-[#1A1A2E]">Event code</span>
        <input
          value={eventCode}
          readOnly
          disabled
          className="h-11 w-full cursor-not-allowed rounded-[11px] border border-[#DDE8E1] bg-[#F3F4F6] px-4 text-sm font-semibold text-[#6B7B8D] outline-none"
        />
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

function TransferModal({
  saving,
  value,
  onChange,
  onCancel,
  onSubmit,
  userExists,
  checking,
  error,
}: {
  saving: boolean;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  userExists: boolean;
  checking: boolean;
  error?: string;
}) {
  const valid = /.+@.+\..+/.test(value.trim());
  return (
    <ModalShell>
      <h2 className="mb-3 text-xl font-extrabold text-[#1A1A2E]">Transfer event</h2>
      <p className="mb-5 text-sm font-semibold text-[#6B7B8D]">Transfer this event to a new owner within your organization.</p>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Search by name or email"
        className="mb-5 h-11 w-full rounded-[11px] border border-[#DDE8E1] px-4 text-sm font-semibold outline-none focus:border-[#168A3A]"
        autoFocus
      />
      {valid && !error && (
        <p className="mb-5 text-xs font-bold text-[#6B7B8D]">
          {checking ? 'Checking SlideEngage account...' : userExists ? 'SlideEngage user found.' : 'Enter a registered SlideEngage email.'}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">Cancel</button>
        <button onClick={onSubmit} disabled={saving || !valid || !userExists || checking} className="rounded-[10px] bg-[#168A3A] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#0F6F2D] disabled:opacity-60">
          {saving ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmModal({
  saving,
  title,
  description,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
  error,
}: {
  saving: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  error?: string;
}) {
  return (
    <ModalShell>
      <h2 className="mb-3 text-xl font-extrabold text-[#1A1A2E]">{title}</h2>
      <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">{description}</p>
      {error && (
        <div className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="rounded-[10px] px-5 py-2.5 text-sm font-bold text-[#6B7B8D] hover:bg-[#F3F4F6]">Cancel</button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className={`rounded-[10px] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-60 ${
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#168A3A] hover:bg-[#0F6F2D]'
          }`}
        >
          {saving ? 'Saving...' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function StatusDropdown({
  event,
  position,
  onGoLive,
  onCloseEvent,
  onReopen,
  onDeleteDraft,
  onArchive,
  onResetResults,
}: {
  event: EventRow;
  position: { top: number; left: number };
  onGoLive: () => void;
  onCloseEvent: () => void;
  onReopen: () => void;
  onDeleteDraft: () => void;
  onArchive: () => void;
  onResetResults: () => void;
}) {
  const label = statusLabel(event);
  const actions = label === 'Draft'
    ? [
      { label: 'Go Live', onClick: onGoLive, className: 'text-[#168A3A]' },
      { label: 'Delete Draft', onClick: onDeleteDraft, className: 'text-red-600' },
    ]
    : label === 'Active'
      ? [
        { label: 'Close Event', onClick: onCloseEvent, className: 'text-[#B85B00]' },
        { label: 'Reset Results', onClick: onResetResults, className: 'text-red-600' },
      ]
      : label === 'Closed'
        ? [
          { label: 'Reopen Event', onClick: onReopen, className: 'text-[#168A3A]' },
          { label: 'Archive Event', onClick: onArchive, className: 'text-[#5B6470]' },
        ]
        : [];

  if (actions.length === 0) return null;

  return (
    <div
      data-event-status-menu
      className="fixed z-50 w-[180px] overflow-hidden rounded-[12px] border border-[#E4EAE6] bg-white py-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
      style={{ top: position.top, left: position.left }}
    >
      {actions.map(action => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`block w-full px-3.5 py-2.5 text-left text-sm font-extrabold transition hover:bg-[#F7FAF8] ${action.className}`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function DeleteModal({
  saving,
  eventName,
  title = 'Delete event?',
  description,
  onCancel,
  onSubmit,
  error,
}: {
  saving: boolean;
  eventName: string;
  title?: string;
  description?: string;
  onCancel: () => void;
  onSubmit: () => void;
  error?: string;
}) {
  return (
    <ModalShell>
      <h2 className="mb-3 text-xl font-extrabold text-[#1A1A2E]">{title}</h2>
      <p className="mb-6 text-sm font-semibold text-[#6B7B8D]">
        {description || (
          <>
            This will permanently delete <span className="font-extrabold text-[#1A1A2E]">{eventName}</span> and its interactions. This action cannot be undone.
          </>
        )}
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
      className="fixed z-50 max-h-[calc(100vh-120px)] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-[15px] border border-[#E4EAE6] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
      style={{ top: position.top, left: position.left }}
    >
      <div className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3 rounded-[12px] bg-[#FAFCFA] px-3 py-2.5">
          <div className="min-w-0 flex-1 text-xs font-semibold text-[#5F6B7A]">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="min-w-0 flex-1 truncate text-base font-black text-[#1A1A2E]">{event.event_name}</h2>
              <span className="shrink-0 rounded-full bg-[#EAF7EF] px-2 py-0.5 text-[11px] font-black text-[#168A3A]">
                {statusLabel(event)}
              </span>
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">📅 {formatDateRange(event)}</span>
                <span className="shrink-0">↻ {relativeTime(event.updated_at || event.created_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">♙ {owner}</span>
                <span className="shrink-0 font-black text-[#1A1A2E]">#{event.event_code}</span>
              </div>
            </div>
          </div>
          <SETooltip text="Close actions">
            <button onClick={onClose} aria-label="Close actions" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-lg text-[#6B7B8D] hover:bg-[#F3F4F6]">×</button>
          </SETooltip>
        </div>

        <div className="space-y-2">
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
      </div>

      <div className="sticky bottom-0 grid grid-cols-2 overflow-hidden border-t border-[#E4EAE6] bg-white/95 p-3 pt-2 backdrop-blur">
        <SETooltip text="Transfer ownership to another member" className="flex-1">
          <button onClick={onTransfer} aria-label="Transfer ownership to another member" className="w-full rounded-l-[11px] bg-[#F4F4F4] px-3 py-2 text-xs font-extrabold text-[#5B6470] hover:bg-[#EAF7EF] hover:text-[#168A3A]">
            ↔ Transfer
          </button>
        </SETooltip>
        <SETooltip text="Permanently delete this event" className="flex-1">
          <button onClick={onDelete} aria-label="Permanently delete this event" className="w-full rounded-r-[11px] border-l border-white bg-[#F4F4F4] px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-50">
            🗑 Delete
          </button>
        </SETooltip>
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
      <button aria-label={tooltip} onClick={onClick} className="flex w-full overflow-hidden rounded-[12px] border border-[#DDE8E1] bg-white text-left transition hover:border-[#168A3A] hover:shadow-sm">
        <span className={`grid w-[56px] shrink-0 place-items-center text-xl ${iconClassName}`}>{icon}</span>
        <span className="px-3 py-2.5">
          <span className="block text-base font-extrabold leading-tight text-[#1A1A2E]">{title}</span>
          <span className="mt-0.5 block text-[13px] font-semibold leading-snug text-[#6B7B8D]">{description}</span>
        </span>
      </button>
    </SETooltip>
  );
}
