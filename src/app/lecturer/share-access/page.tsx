'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { isLocalUrl, normalizePublicUrl } from '@/lib/public-url';
import type { Event } from '@/lib/types';

const PUBLIC_URL_ERROR = 'Public app URL is required before generating QR codes for students.';

function statusStyle(status: string) {
  if (status === 'live') return 'bg-[#EAF7EF] text-[#168A3A]';
  if (status === 'archived') return 'bg-[#F3F4F6] text-[#6B7280]';
  return 'bg-[#FFF8E6] text-[#8A5A00]';
}

function statusLabel(status: string) {
  if (status === 'live') return 'Live';
  if (status === 'archived') return 'Archived';
  return 'Closed';
}

export default function ShareAccessPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [message, setMessage] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const configuredPublicUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const publicUrlReady = Boolean(configuredPublicUrl && !isLocalUrl(configuredPublicUrl));

  useEffect(() => {
    if (!loading && !lecturer) router.push('/lecturer/login');
  }, [loading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    setLoadingEvents(true);
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
      .finally(() => setLoadingEvents(false));
  }, [clearSelectedEvent, currentEvent, lecturer]);

  const selectableEvents = useMemo(
    () => events.filter(event => event.status !== 'archived'),
    [events]
  );

  const selectedEvent = useMemo(
    () => selectableEvents.find(event => event.id === selectedEventId) || null,
    [selectableEvents, selectedEventId]
  );

  const eventCode = selectedEvent?.event_code.replace('#', '').toUpperCase() || '';
  const joinLink = selectedEvent && publicUrlReady ? `${configuredPublicUrl}/join?code=${encodeURIComponent(eventCode)}` : '';
  const qrSrc = selectedEvent && publicUrlReady ? `/api/qrcode?code=${encodeURIComponent(eventCode)}&format=svg&v=${selectedEvent.id}` : '';

  function chooseEvent(eventId: string) {
    setMessage('');
    setSelectedEventId(eventId);
    const event = selectableEvents.find(item => item.id === eventId);
    if (event) selectEvent(event);
  }

  async function copyText(text: string, success: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setMessage(success);
  }

  async function downloadQr() {
    if (!selectedEvent) {
      setMessage('Please select an event before generating QR code.');
      return;
    }
    if (!publicUrlReady) {
      setMessage(PUBLIC_URL_ERROR);
      return;
    }

    const res = await fetch(`/api/qrcode?code=${encodeURIComponent(eventCode)}&format=png`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SlideEngage-${eventCode}-QR.png`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function previewJoinPage() {
    if (!selectedEvent) {
      setMessage('Please select an event before generating QR code.');
      return;
    }
    if (!publicUrlReady) {
      setMessage(PUBLIC_URL_ERROR);
      return;
    }
    window.open(joinLink, '_blank', 'noopener,noreferrer');
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4] p-7">
          <div className="mb-5 rounded-[18px] border border-[#DDE8E1] bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#168A3A]">Public student access</div>
                <h1 className="text-2xl font-extrabold text-[#1A1A2E]">Share Access</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7B8D]">
                  One event has one public join link and one QR code. All interactions inside that event use the same access link.
                </p>
              </div>
              <div className={`rounded-full px-4 py-2 text-xs font-extrabold ${publicUrlReady ? 'bg-[#EAF7EF] text-[#168A3A]' : 'bg-red-50 text-red-600'}`}>
                {publicUrlReady ? 'Production URL ready' : 'Production URL missing'}
              </div>
            </div>
          </div>

          {!publicUrlReady && (
            <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
              {PUBLIC_URL_ERROR} Set <span className="font-mono">NEXT_PUBLIC_APP_URL</span> to your public Vercel URL, for example https://slide-engage.vercel.app.
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-[14px] border border-[#DDE8E1] bg-white px-5 py-4 text-sm font-semibold text-[#2D8A4E]">
              {message}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-[18px] border border-[#DDE8E1] bg-white p-6 shadow-sm">
              <label className="mb-2 block text-sm font-bold text-[#1A1A2E]">Selected event</label>
              <select
                value={selectedEventId}
                onChange={event => chooseEvent(event.target.value)}
                className="h-12 w-full rounded-[10px] border border-[#DDE8E1] bg-white px-4 text-sm font-semibold outline-none focus:border-[#168A3A]"
              >
                <option value="">Select an event before generating QR code</option>
                {selectableEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.event_name} · #{event.event_code} · {statusLabel(event.status)}
                  </option>
                ))}
              </select>

              {!selectedEvent ? (
                <div className="mt-6 rounded-[14px] border border-dashed border-[#C9D7CE] bg-[#FAFCFA] p-8 text-center">
                  <div className="mb-3 text-4xl">🔗</div>
                  <h2 className="mb-2 text-lg font-extrabold text-[#1A1A2E]">Please select an event before generating QR code.</h2>
                  <p className="text-sm text-[#6B7B8D]">The QR code is created from the selected event code, not from individual interactions.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[14px] bg-[#F4F7F4] p-5">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Event name</div>
                    <div className="truncate text-xl font-extrabold text-[#1A1A2E]">{selectedEvent.event_name}</div>
                  </div>
                  <div className="rounded-[14px] bg-[#F4F7F4] p-5">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Event code</div>
                    <div className="font-mono text-xl font-extrabold text-[#168A3A]">#{eventCode}</div>
                  </div>
                  <div className="rounded-[14px] bg-[#F4F7F4] p-5">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Status</div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusStyle(selectedEvent.status)}`}>
                      {statusLabel(selectedEvent.status)}
                    </span>
                  </div>
                  <div className="rounded-[14px] bg-[#F4F7F4] p-5">
                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Public URL</div>
                    <div className="truncate text-sm font-bold text-[#1A1A2E]">{configuredPublicUrl || 'Not configured'}</div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <div className="mb-2 text-sm font-bold text-[#1A1A2E]">Public student join link</div>
                <div className="flex flex-col gap-3 lg:flex-row">
                  <input
                    readOnly
                    value={joinLink || (selectedEvent ? PUBLIC_URL_ERROR : 'Please select an event before generating QR code.')}
                    className="min-w-0 flex-1 rounded-[10px] border border-[#DDE8E1] bg-[#FAFCFA] px-4 py-3 text-sm font-semibold text-[#1A1A2E]"
                  />
                  <button onClick={() => copyText(joinLink, 'Join link copied.')} disabled={!joinLink} className="rounded-[10px] bg-[#168A3A] px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50">
                    Copy link
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => copyText(eventCode, 'Event code copied.')} disabled={!selectedEvent} className="rounded-[10px] border border-[#DDE8E1] bg-white px-4 py-2.5 text-sm font-bold text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A] disabled:opacity-50">
                  Copy event code
                </button>
                <button onClick={downloadQr} disabled={!selectedEvent || !publicUrlReady} className="rounded-[10px] border border-[#DDE8E1] bg-white px-4 py-2.5 text-sm font-bold text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A] disabled:opacity-50">
                  Download QR
                </button>
                <button onClick={previewJoinPage} disabled={!selectedEvent || !publicUrlReady} className="rounded-[10px] border border-[#DDE8E1] bg-white px-4 py-2.5 text-sm font-bold text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A] disabled:opacity-50">
                  Preview student join page
                </button>
                <button onClick={() => setMessage(selectedEvent ? 'QR preview regenerated.' : 'Please select an event before generating QR code.')} className="rounded-[10px] border border-[#DDE8E1] bg-white px-4 py-2.5 text-sm font-bold text-[#1A1A2E] hover:border-[#168A3A] hover:text-[#168A3A]">
                  Regenerate QR preview
                </button>
              </div>
            </section>

            <aside className="rounded-[18px] border border-[#DDE8E1] bg-white p-6 text-center shadow-sm">
              <div className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-[#168A3A]">QR preview</div>
              <div className="mx-auto flex min-h-[330px] max-w-[330px] items-center justify-center rounded-[22px] border border-[#DDE8E1] bg-[#FAFCFA] p-6">
                {selectedEvent && publicUrlReady ? (
                  <img src={qrSrc} alt={`QR code for #${eventCode}`} className="h-[260px] w-[260px] bg-white" />
                ) : (
                  <div className="px-4 text-sm font-semibold text-[#6B7B8D]">
                    {selectedEvent ? PUBLIC_URL_ERROR : 'Please select an event before generating QR code.'}
                  </div>
                )}
              </div>
              {selectedEvent && (
                <div className="mt-5">
                  <div className="inline-flex rounded-[14px] border-2 border-dashed border-[#168A3A] bg-[#EAF7EF] px-5 py-2 font-mono text-2xl font-extrabold text-[#168A3A]">
                    #{eventCode}
                  </div>
                  <p className="mx-auto mt-3 max-w-[300px] text-sm leading-6 text-[#6B7B8D]">
                    Students scan this QR to open the join page with the teacher event code filled in.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
