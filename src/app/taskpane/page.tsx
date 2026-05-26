'use client';

import Script from 'next/script';
import { useEffect, useMemo, useState } from 'react';
import {
  insertPresentationFromBase64,
  insertTextIntoCurrentSelection,
  onPowerPointSelectionChanged,
  readCurrentSelectionText,
  waitForOfficeReady,
} from '@/lib/office/powerpoint';
import { DEFAULT_PUBLIC_APP_URL, isLocalUrl } from '@/lib/public-url';
import type { Event, Interaction } from '@/lib/types';

type LecturerSession = {
  id: string;
  email: string;
  name: string;
};

type InteractionTemplate = {
  label: string;
  icon: string;
  type: 'poll' | 'quiz' | 'qa' | 'word_cloud' | 'feedback';
  config?: Record<string, unknown>;
  options?: { option_text: string; is_correct?: boolean }[];
};

type PollForm = {
  id?: string;
  question: string;
  options: string[];
};

const SESSION_KEY = 'slideengage_lecturer';

const interactionTemplates: InteractionTemplate[] = [
  {
    label: 'Multiple choice',
    icon: '≡',
    type: 'poll',
    options: [
      { option_text: 'First option' },
      { option_text: 'Second option' },
      { option_text: 'Third option' },
    ],
  },
  { label: 'Open text', icon: '✎', type: 'feedback', config: { poll_kind: 'open_text', include_open_text: true } },
  { label: 'Word cloud', icon: '☁', type: 'word_cloud', config: { max_words_per_participant: 3 } },
  { label: 'Rating', icon: '★', type: 'feedback', config: { poll_kind: 'rating', include_star_ratings: true } },
  {
    label: 'Ranking',
    icon: '↕',
    type: 'poll',
    config: { poll_kind: 'ranking' },
    options: [{ option_text: 'Rank item 1' }, { option_text: 'Rank item 2' }, { option_text: 'Rank item 3' }],
  },
  {
    label: 'Quiz',
    icon: '🏆',
    type: 'quiz',
    config: { time_limit_seconds: 30 },
    options: [
      { option_text: 'Correct answer', is_correct: true },
      { option_text: 'Distractor' },
      { option_text: 'Distractor' },
    ],
  },
  { label: 'Audience Q&A', icon: '?', type: 'qa', config: { allow_anonymous_questions: true } },
  { label: 'Live reactions', icon: '♥', type: 'feedback', config: { poll_kind: 'reactions' } },
  { label: 'Attendance check-in', icon: '✓', type: 'feedback', config: { poll_kind: 'attendance' } },
];

function getAppUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || '';
  if (configured && !isLocalUrl(configured)) return configured;
  return DEFAULT_PUBLIC_APP_URL;
}

export default function TaskpanePage() {
  const [lecturer, setLecturer] = useState<LecturerSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventName, setEventName] = useState('');
  const [interactionTitle, setInteractionTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(interactionTemplates[0]);
  const [pollForm, setPollForm] = useState<PollForm | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [results, setResults] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [slideIndex, setSlideIndex] = useState(1);
  const [slideTitle, setSlideTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [officeReady, setOfficeReady] = useState(false);
  const [officeScriptLoaded, setOfficeScriptLoaded] = useState(false);
  const [officeStatus, setOfficeStatus] = useState('Loading Office.js...');
  const [taskpaneDebug, setTaskpaneDebug] = useState<string[]>(['Taskpane loaded']);

  const appUrl = useMemo(() => getAppUrl().replace(/\/$/, ''), []);
  const displayedAppUrl = appUrl || 'not configured';
  const missingProductionUrl = useMemo(() => !process.env.NEXT_PUBLIC_APP_URL || isLocalUrl(process.env.NEXT_PUBLIC_APP_URL), []);

  useEffect(() => {
    try {
      setTaskpaneDebug(prev => [...prev, 'React mounted']);
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          setLecturer(JSON.parse(stored));
        } catch {}
      }
    } catch (error: any) {
      setTaskpaneDebug(prev => [...prev, `Storage unavailable: ${error?.message || 'unknown error'}`]);
    }
  }, []);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setOfficeStatus(event.message || 'Taskpane runtime error');
      setTaskpaneDebug(prev => [...prev, `Window error: ${event.message}`]);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason || 'Unhandled promise rejection');
      setOfficeStatus(message);
      setTaskpaneDebug(prev => [...prev, `Promise rejection: ${message}`]);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  useEffect(() => {
    if (!officeScriptLoaded) return;

    let cancelled = false;
    waitForOfficeReady()
      .then(ready => {
        if (cancelled) return;
        setOfficeReady(ready);
        setOfficeStatus(ready ? 'Office ready: PowerPoint connected.' : 'Office.js loaded. Browser preview mode.');
        setTaskpaneDebug(prev => [...prev, ready ? 'Office initialized' : 'Office.js loaded outside PowerPoint']);
        console.log('[SlideEngage] Office ready', { ready });
      })
      .catch(error => {
        if (cancelled) return;
        setOfficeReady(false);
        setOfficeStatus(error?.message || 'Office.js failed to initialize.');
        setTaskpaneDebug(prev => [...prev, `Office initialization failed: ${error?.message || 'unknown error'}`]);
        console.error('[SlideEngage] Office initialization failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [officeScriptLoaded]);

  useEffect(() => {
    if (!lecturer) return;
    fetchEvents();
  }, [lecturer]);

  useEffect(() => {
    if (!selectedEvent) return;
    fetchInteractions(selectedEvent.id);
    let socket: any;
    let mounted = true;

    import('@/lib/realtime/socket')
      .then(({ joinRealtimeEvent }) => {
        if (!mounted) return;
        socket = joinRealtimeEvent(selectedEvent.event_code);
        socket.on('participants:update', (payload: any) => {
          if (payload.eventCode === selectedEvent.event_code) {
            setParticipantCount(payload.count || 0);
          }
        });
        socket.on('reaction:new', (payload: any) => {
          if (payload.eventCode === selectedEvent.event_code) {
            setStatus(`Live reaction: ${payload.reaction || 'reaction'}`);
          }
        });
      })
      .catch(error => {
        setTaskpaneDebug(prev => [...prev, `Realtime disabled: ${error?.message || 'unable to load socket client'}`]);
      });

    return () => {
      mounted = false;
      socket?.off?.('participants:update');
      socket?.off?.('reaction:new');
    };
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent || !officeReady) return;

    return onPowerPointSelectionChanged(async () => {
      const selectedText = await readCurrentSelectionText();
      const nextTitle = selectedText.split('\n').find(Boolean)?.slice(0, 80) || 'Current slide';
      setSlideTitle(nextTitle);
      setSlideIndex(prev => {
        const next = prev + 1;
        import('@/lib/realtime/socket')
          .then(({ emitSlideChange }) => emitSlideChange(selectedEvent.event_code, next, nextTitle))
          .catch(() => {});
        return next;
      });
    });
  }, [selectedEvent, officeReady]);

  useEffect(() => {
    if (!interactions[0]) return;
    const active = interactions.find(item => item.status === 'live') || interactions[0];
    fetchResults(active.id);
    const timer = setInterval(() => fetchResults(active.id), 5000);
    return () => clearInterval(timer);
  }, [interactions]);

  async function login() {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setLecturer(data.lecturer);
      localStorage.setItem(SESSION_KEY, JSON.stringify(data.lecturer));
    } catch (error: any) {
      setStatus(error.message);
    }
    setLoading(false);
  }

  async function fetchEvents() {
    if (!lecturer) return;
    const res = await fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' });
    const data = await res.json();
    const rows = data.events || [];
    setEvents(rows);
    setSelectedEvent(prev => prev || rows[0] || null);
  }

  async function createEvent() {
    if (!lecturer || !eventName.trim()) return;
    const eventCode = Math.random().toString(36).slice(2, 7).toUpperCase();
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lecturer_id: lecturer.id, event_name: eventName.trim(), event_code: eventCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to create event');
      return;
    }
    setEventName('');
    setSelectedEvent(data.event);
    fetchEvents();
  }

  async function updateEvent(status: 'draft' | 'live' | 'closed') {
    if (!selectedEvent) return;
    const res = await fetch('/api/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedEvent.id, status }),
    });
    const data = await res.json();
    if (data.event) {
      setSelectedEvent(data.event);
      fetchEvents();
    }
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    setSelectedEvent(null);
    fetchEvents();
  }

  async function fetchInteractions(eventId: string) {
    const res = await fetch(`/api/interactions?event_id=${eventId}`, { cache: 'no-store' });
    const data = await res.json();
    setInteractions(data.interactions || []);
  }

  async function createInteraction(template = selectedTemplate) {
    if (!selectedEvent) return;
    const title = interactionTitle.trim() || `${template.label} question`;
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: selectedEvent.id,
        type: template.type,
        title,
        config: template.config || {},
        options: template.options,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to create interaction');
      return;
    }
    setInteractionTitle('');
    fetchInteractions(selectedEvent.id);
  }

  async function saveMultipleChoicePoll() {
    if (!selectedEvent || !pollForm) return;

    const cleanOptions = pollForm.options.map(option => option.trim()).filter(Boolean);
    if (!pollForm.question.trim() || cleanOptions.length < 2) {
      setStatus('Enter a question and at least two answer options.');
      return;
    }

    const payload = {
      type: 'poll',
      title: pollForm.question.trim(),
      config: { poll_kind: 'multiple_choice' },
      options: cleanOptions.map(option_text => ({ option_text })),
    };

    const res = await fetch('/api/interactions', {
      method: pollForm.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pollForm.id ? { id: pollForm.id, ...payload } : { event_id: selectedEvent.id, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to save poll');
      return;
    }

    const savedInteraction = data.interaction;
    setPollForm({ id: savedInteraction.id, question: savedInteraction.title, options: cleanOptions });
    await fetchInteractions(selectedEvent.id);
    await insertPollSlide(savedInteraction.id, pollForm.question.trim(), cleanOptions);
  }

  async function insertPollSlide(interactionId: string, question: string, options: string[]) {
    if (!selectedEvent) return;
    const joinUrl = `${appUrl}/join?code=${selectedEvent.event_code}`;
    const res = await fetch('/api/powerpoint/poll-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interactionId,
        question,
        options,
        eventCode: selectedEvent.event_code,
        joinUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Unable to generate poll slide');
      return;
    }

    await insertPresentationFromBase64(data.base64);
    import('@/lib/realtime/socket')
      .then(({ launchInteraction }) => launchInteraction(selectedEvent.event_code, interactionId))
      .catch(() => {});
    setStatus(pollForm?.id ? 'Poll updated in Supabase. Inserted a refreshed poll slide into this PowerPoint.' : 'Poll saved and inserted as a new slide in this PowerPoint.');
  }

  async function fetchResults(interactionId: string) {
    const res = await fetch(`/api/results?interaction_id=${interactionId}`, { cache: 'no-store' });
    const data = await res.json();
    setResults(data);
  }

  async function insertJoiningSlide() {
    if (!selectedEvent) return;
    const joinUrl = `${appUrl}/join?code=${selectedEvent.event_code}`;
    await insertTextIntoCurrentSelection(
      `Slide Engage joining instructions\n\nScan the QR code from the task pane or go to:\n${joinUrl}\n\nEvent code: #${selectedEvent.event_code}\n\nStudents can answer live polls, quizzes, Q&A, and feedback for ${selectedEvent.event_name}.`
    );
    setStatus('Joining instructions inserted into the current slide.');
  }

  async function presentWithSlideEngage() {
    if (!selectedEvent) return;
    await updateEvent('live');
    import('@/lib/realtime/socket')
      .then(({ emitSlideChange }) => emitSlideChange(selectedEvent.event_code, slideIndex, slideTitle || 'Presentation started'))
      .catch(() => {});
    await insertJoiningSlide();
  }

  function renderOfficeScript() {
    return (
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="afterInteractive"
        onLoad={() => {
          setOfficeScriptLoaded(true);
          setTaskpaneDebug(prev => [...prev, 'Office.js script loaded']);
        }}
        onError={() => {
          setOfficeStatus('Office.js could not load. Check network access to appsforoffice.microsoft.com.');
          setTaskpaneDebug(prev => [...prev, 'Office.js script failed to load']);
          console.error('[SlideEngage] Office.js script failed to load');
        }}
      />
    );
  }

  function renderDebugPanel() {
    return (
      <details className="mb-4 rounded-lg border border-[#E2EBE6] bg-white px-4 py-3 text-xs text-[#6B7B8D]" open>
        <summary className="cursor-pointer font-extrabold text-[#1A1A2E]">Office debug</summary>
        <div className="mt-2 space-y-1 font-semibold">
          <div>Taskpane loaded</div>
          <div>{officeStatus}</div>
          {taskpaneDebug.map((item, index) => (
            <div key={`${item}-${index}`}>• {item}</div>
          ))}
        </div>
      </details>
    );
  }

  if (!lecturer) {
    return (
      <>
        {renderOfficeScript()}
        <main className="min-h-screen bg-[#F4F7F4] p-5 text-[#1A1A2E]">
          <div className="mb-8 flex items-center gap-3">
            <img src="/assets/icons/icon-64.png" alt="SlideEngage" className="h-10 w-10 rounded-full" />
            <div>
              <h1 className="text-xl font-extrabold">Slide Engage</h1>
              <p className="text-xs text-[#6B7B8D]">PowerPoint add-in</p>
            </div>
          </div>

          {missingProductionUrl && (
            <div className="mb-4 rounded-lg border border-[#FFD7A8] bg-[#FFF8E6] px-4 py-3 text-xs font-semibold text-[#8A5A00]">
              Production URL is missing. The add-in URL is {displayedAppUrl}; set NEXT_PUBLIC_APP_URL in Vercel before publishing.
            </div>
          )}

          {renderDebugPanel()}

          <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
            <h2 className="mb-4 text-base font-extrabold">Lecturer login</h2>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="mb-3 w-full rounded-lg border border-[#E2EBE6] px-3 py-2 text-sm outline-none focus:border-[#2D8A4E]" />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" className="mb-3 w-full rounded-lg border border-[#E2EBE6] px-3 py-2 text-sm outline-none focus:border-[#2D8A4E]" />
            <button onClick={login} disabled={loading} className="w-full rounded-lg bg-[#2D8A4E] py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            {status && <p className="mt-3 text-sm font-semibold text-red-600">{status}</p>}
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      {renderOfficeScript()}
      <main className="min-h-screen bg-[#F4F7F4] text-[#1A1A2E]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2EBE6] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/assets/icons/icon-32.png" alt="SlideEngage" className="h-8 w-8 rounded-full" />
            <div>
              <h1 className="text-base font-extrabold">Slide Engage</h1>
              <p className="text-[11px] text-[#6B7B8D]">{officeReady ? 'PowerPoint connected' : 'Browser preview'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              setLecturer(null);
            }}
            className="text-xs font-bold text-[#6B7B8D]"
          >
            Logout
          </button>
        </header>

        <div className="space-y-4 p-4">
          {missingProductionUrl && (
            <div className="rounded-lg border border-[#FFD7A8] bg-[#FFF8E6] px-4 py-3 text-xs font-semibold text-[#8A5A00]">
              Production URL is missing. The add-in URL is {displayedAppUrl}; set NEXT_PUBLIC_APP_URL in Vercel before distributing.
            </div>
          )}

          {renderDebugPanel()}

          <button onClick={presentWithSlideEngage} disabled={!selectedEvent} className="w-full rounded-lg bg-[#168A3A] py-3 text-sm font-extrabold text-white disabled:opacity-60">
            ▷ Present with Slide Engage
          </button>

          {selectedEvent && (
            <section className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[#E2EBE6] bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7B8D]">Participants</div>
                <div className="mt-1 text-2xl font-extrabold text-[#2D8A4E]">{participantCount}</div>
              </div>
              <div className="rounded-lg border border-[#E2EBE6] bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7B8D]">Current slide</div>
                <div className="mt-1 text-2xl font-extrabold text-[#1A6BB5]">{slideIndex}</div>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Events</h2>
              <span className="text-xs font-semibold text-[#6B7B8D]">{events.length} total</span>
            </div>
            <div className="mb-3 flex gap-2">
              <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="New event name" className="min-w-0 flex-1 rounded-lg border border-[#E2EBE6] px-3 py-2 text-sm outline-none focus:border-[#2D8A4E]" />
              <button onClick={createEvent} className="rounded-lg bg-[#2D8A4E] px-3 text-sm font-bold text-white">Create</button>
            </div>
            <div className="space-y-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full rounded-lg border px-3 py-3 text-left ${selectedEvent?.id === event.id ? 'border-[#2D8A4E] bg-[#EAF7EF]' : 'border-[#E2EBE6] bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold">{event.event_name}</div>
                      <div className="font-mono text-xs text-[#6B7B8D]">#{event.event_code}</div>
                    </div>
                    <span className="rounded-full bg-[#F3F4F6] px-2 py-1 text-[11px] font-bold capitalize text-[#6B7B8D]">{event.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {selectedEvent && (
            <>
              <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-extrabold">{selectedEvent.event_name}</h2>
                    <p className="font-mono text-xs text-[#6B7B8D]">#{selectedEvent.event_code}</p>
                  </div>
                  <button onClick={() => deleteEvent(selectedEvent.id)} className="text-xs font-bold text-red-500">Delete</button>
                </div>
                <div className="mb-3 flex gap-2">
                  <button onClick={() => updateEvent('live')} className="flex-1 rounded-lg bg-[#2D8A4E] py-2 text-xs font-bold text-white">Go live</button>
                  <button onClick={() => updateEvent('closed')} className="flex-1 rounded-lg border border-[#E2EBE6] py-2 text-xs font-bold">Close</button>
                </div>
                {slideTitle && (
                  <div className="mb-3 rounded-lg bg-[#F8FAF8] p-3 text-xs font-semibold text-[#6B7B8D]">
                    Last detected slide text: {slideTitle}
                  </div>
                )}
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={`/api/qrcode?code=${encodeURIComponent(selectedEvent.event_code)}&format=svg`}
                    alt={`QR code for event #${selectedEvent.event_code}`}
                    width={150}
                    height={150}
                    className="rounded-xl border border-[#E2EBE6] bg-white p-3"
                  />
                  <div className="font-mono text-sm font-extrabold text-[#2D8A4E]">#{selectedEvent.event_code}</div>
                </div>
                <button onClick={insertJoiningSlide} className="mt-3 w-full rounded-lg border border-[#E2EBE6] py-2 text-xs font-bold hover:border-[#2D8A4E] hover:text-[#2D8A4E]">
                  Insert joining slide
                </button>
              </section>

              <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
                <h2 className="mb-3 text-sm font-extrabold">Create new interaction</h2>
                <div className="space-y-2">
                  {interactionTemplates.map(template => (
                    <button
                      key={template.label}
                      onClick={() => {
                        setSelectedTemplate(template);
                        if (template.label === 'Multiple choice') {
                          setPollForm({
                            question: 'How familiar are you with the topic?',
                            options: [
                              'I have some basic understanding',
                              'I am an expert',
                              'I have some solid background',
                              'I am completely new',
                            ],
                          });
                        } else {
                          createInteraction(template);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-[#E2EBE6] bg-white px-3 py-3 text-left text-sm font-bold hover:border-[#2D8A4E]"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF7EF] text-[#2D8A4E]">{template.icon}</span>
                      {template.label}
                    </button>
                  ))}
                </div>
              </section>

              {pollForm && (
                <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-extrabold">Multiple choice poll</h2>
                    <button onClick={() => setPollForm(null)} className="text-xs font-bold text-[#6B7B8D]">Close</button>
                  </div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Poll question</label>
                  <textarea
                    value={pollForm.question}
                    onChange={e => setPollForm({ ...pollForm, question: e.target.value })}
                    className="mb-3 min-h-20 w-full rounded-lg border border-[#E2EBE6] px-3 py-2 text-sm outline-none focus:border-[#2D8A4E]"
                  />
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#6B7B8D]">Answer options</label>
                  <div className="space-y-2">
                    {pollForm.options.map((option, index) => (
                      <input
                        key={index}
                        value={option}
                        onChange={e => {
                          const options = [...pollForm.options];
                          options[index] = e.target.value;
                          setPollForm({ ...pollForm, options });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="w-full rounded-lg border border-[#E2EBE6] px-3 py-2 text-sm outline-none focus:border-[#2D8A4E]"
                      />
                    ))}
                  </div>
                  <button
                    onClick={saveMultipleChoicePoll}
                    className="mt-3 w-full rounded-lg bg-[#2D8A4E] py-2.5 text-sm font-extrabold text-white"
                  >
                    {pollForm.id ? 'Update poll and insert refreshed slide' : 'Save poll and insert slide'}
                  </button>
                  <p className="mt-2 text-xs leading-relaxed text-[#6B7B8D]">
                    This inserts a new Slide Engage poll slide into the currently open PowerPoint. It does not download or replace your deck.
                  </p>
                </section>
              )}

              <section className="rounded-lg border border-[#E2EBE6] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-extrabold">Live results</h2>
                  <span className="text-xs text-[#6B7B8D]">{interactions.length} interactions</span>
                </div>
                {results?.results && Array.isArray(results.results) ? (
                  <div className="space-y-2">
                    {results.results.map((item: any, index: number) => (
                      <div key={`${item.option_text}-${index}`} className="rounded-lg border border-[#E2EBE6] bg-[#FAFCFA] p-3">
                        <div className="mb-1 flex items-center justify-between gap-3 text-xs font-extrabold">
                          <span>{item.option_letter ? `${item.option_letter}. ` : ''}{item.option_text}</span>
                          <span>{item.count || 0} votes</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#E2EBE6]">
                          <div className="h-full rounded-full bg-[#2D8A4E]" style={{ width: `${Math.min(100, Number(item.percentage || 0))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B7B8D]">Create a poll or quiz to preview live charts.</p>
                )}
              </section>
            </>
          )}

          {status && <div className="rounded-lg border border-[#E2EBE6] bg-white p-3 text-sm font-semibold text-[#6B7B8D]">{status}</div>}
        </div>
      </main>
    </>
  );
}
