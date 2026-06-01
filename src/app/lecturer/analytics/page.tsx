'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import SETooltip from '@/components/ui/SETooltip';
import DashboardShell from '@/components/ui/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';

type Metrics = {
  active_events: number;
  created_events: number;
  questions: number;
  poll_votes: number;
  quiz_answers: number;
  participants: number;
  active_interactions: number;
  engagement_score: number;
  response_rate: number;
};

type AccountActivity = {
  user_id: string;
  name: string;
  email: string;
  events: number;
  interactions: number;
  questions: number;
  votes: number;
  activity_period: string;
};

type RangePreset = '30' | '90' | '365' | 'custom';

const emptyMetrics: Metrics = {
  active_events: 0,
  created_events: 0,
  questions: 0,
  poll_votes: 0,
  quiz_answers: 0,
  participants: 0,
  active_interactions: 0,
  engagement_score: 0,
  response_rate: 0,
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: RangePreset, customFrom: string, customTo: string) {
  if (preset === 'custom') {
    return { from: customFrom, to: customTo };
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - Number(preset));
  return { from: isoDate(from), to: isoDate(to) };
}

function downloadCsv(rows: AccountActivity[], metrics: Metrics) {
  const lines = [
    ['Metric', 'Value'],
    ['Active events', metrics.active_events],
    ['Questions', metrics.questions],
    ['Poll votes', metrics.poll_votes],
    [],
    ['User', 'Email', 'Events', 'Interactions', 'Questions', 'Votes', 'Activity Period'],
    ...rows.map(row => [
      row.name,
      row.email,
      row.events,
      row.interactions,
      row.questions,
      row.votes,
      row.activity_period,
    ]),
  ];

  const csv = lines
    .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `slideengage-analytics-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LecturerAnalyticsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading, selectEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [rangePreset, setRangePreset] = useState<RangePreset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [activity, setActivity] = useState<AccountActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

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

  const selectedEvent = useMemo(() => events.find(event => event.id === selectedEventId) || null, [events, selectedEventId]);
  const selectedRange = useMemo(
    () => rangeFromPreset(rangePreset, customFrom, customTo),
    [customFrom, customTo, rangePreset]
  );

  useEffect(() => {
    if (!lecturer) return;
    if (selectedEvent) selectEvent(selectedEvent);

    const params = new URLSearchParams({ lecturer_id: lecturer.id });
    if (selectedEventId) params.set('event_id', selectedEventId);
    if (selectedRange.from) params.set('from', selectedRange.from);
    if (selectedRange.to) params.set('to', selectedRange.to);

    setLoading(true);
    setError('');
    fetch(`/api/analytics?${params.toString()}`, { cache: 'no-store' })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Unable to load analytics.');
        setMetrics({ ...emptyMetrics, ...data.metrics });
        setActivity(data.account_activity || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [lecturer, selectedEvent, selectedEventId, selectedRange, selectEvent]);

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  const overviewCards = [
    {
      label: 'Active events',
      value: metrics.active_events,
      helper: `${metrics.created_events} created in selected period`,
      icon: '📅',
      accent: 'from-[#EAF7EF] to-white text-[#168A3A]',
      tooltip: 'Number of currently active events',
    },
    {
      label: 'Questions',
      value: metrics.questions,
      helper: `${metrics.active_interactions} active interactions`,
      icon: '❔',
      accent: 'from-[#EFF6FF] to-white text-[#1A6BB5]',
      tooltip: 'Total audience questions received',
    },
    {
      label: 'Poll votes',
      value: metrics.poll_votes,
      helper: `${metrics.quiz_answers} quiz answers · ${metrics.response_rate}% response rate`,
      icon: '📜',
      accent: 'from-[#FFF7E8] to-white text-[#B36200]',
      tooltip: 'Total participant votes submitted',
    },
  ];

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <div className="border-b border-[#E2EBE6] bg-white">
            <DashboardShell className="py-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-[#1A1A2E]">Analytics</h1>
                <p className="mt-1 text-sm text-[#6B7B8D]">
                  {selectedEvent ? `${selectedEvent.event_name} · #${selectedEvent.event_code}` : 'Account activity overview'}
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <select
                  value={selectedEventId}
                  onChange={event => setSelectedEventId(event.target.value)}
                  className="h-11 min-w-[220px] rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#168A3A]"
                >
                  <option value="">All events</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.event_name} · #{event.event_code}</option>
                  ))}
                </select>

                <SETooltip text="Select reporting period">
                  <select
                    value={rangePreset}
                    onChange={event => setRangePreset(event.target.value as RangePreset)}
                    aria-label="Select reporting period"
                    className="h-11 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#168A3A]"
                  >
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">1 Year</option>
                    <option value="custom">Custom range</option>
                  </select>
                </SETooltip>

                <div className="relative">
                  <SETooltip text="Export analytics data">
                    <button
                      type="button"
                      onClick={() => setExportOpen(open => !open)}
                      aria-label="Export analytics data"
                      className="h-11 rounded-[10px] bg-[#168A3A] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0F6F2D]"
                    >
                      Export ▾
                    </button>
                  </SETooltip>
                  {exportOpen && (
                    <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-[12px] border border-[#DDE8E1] bg-white py-1 text-sm font-bold shadow-[0_16px_35px_rgba(15,23,42,0.14)]">
                      <button
                        type="button"
                        onClick={() => {
                          downloadCsv(activity, metrics);
                          setExportOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-[#1A1A2E] hover:bg-[#EAF7EF]"
                      >
                        Download export
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotice('Google export is ready to connect once your Google Workspace integration is published.');
                          setExportOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-[#1A1A2E] hover:bg-[#EAF7EF]"
                      >
                        Export to Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {rangePreset === 'custom' && (
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <input
                  type="date"
                  value={customFrom}
                  onChange={event => setCustomFrom(event.target.value)}
                  className="h-10 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#168A3A]"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={event => setCustomTo(event.target.value)}
                  className="h-10 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-semibold outline-none focus:border-[#168A3A]"
                />
              </div>
            )}
            </DashboardShell>
          </div>

          <DashboardShell className="space-y-6">
            {error && <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
            {notice && <div className="rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-[#168A3A]">{notice}</div>}

            <div className="grid gap-5 lg:grid-cols-3">
              {overviewCards.map(card => (
                <SETooltip key={card.label} text={card.tooltip} className="w-full">
                  <div aria-label={card.tooltip} className={`rounded-[18px] border border-[#DDE8E1] bg-gradient-to-br ${card.accent} p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6B7B8D]">{card.label}</div>
                        <div className="mt-4 text-5xl font-black text-[#1A1A2E]">{loading ? '...' : card.value}</div>
                      </div>
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-2xl shadow-sm">{card.icon}</div>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#6B7B8D]">{card.helper}</p>
                  </div>
                </SETooltip>
              ))}
            </div>

            <section className="rounded-[18px] border border-[#DDE8E1] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col justify-between gap-2 border-b border-[#E2EBE6] px-6 py-5 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1A1A2E]">Account activity</h2>
                  <p className="mt-1 text-sm text-[#6B7B8D]">Events, interactions, questions, and votes from the selected period.</p>
                </div>
                <span className="rounded-full bg-[#EAF7EF] px-3 py-1 text-xs font-extrabold text-[#168A3A]">
                  {activity.length} account{activity.length === 1 ? '' : 's'}
                </span>
              </div>

              {activity.length === 0 || (activity[0]?.events === 0 && activity[0]?.interactions === 0 && activity[0]?.questions === 0 && activity[0]?.votes === 0) ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF7EF] text-2xl">📜</div>
                  <h3 className="text-base font-extrabold text-[#1A1A2E]">No activity yet.</h3>
                  <p className="mt-1 text-sm text-[#6B7B8D]">Create events and collect responses to see analytics here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-[#FAFCFA] text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7B8D]">
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Events</th>
                        <th className="px-6 py-4">Interactions</th>
                        <th className="px-6 py-4">Questions</th>
                        <th className="px-6 py-4">Votes</th>
                        <th className="px-6 py-4">Activity Period</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2EBE6]">
                      {activity.map(row => (
                        <tr key={row.user_id} className="hover:bg-[#FAFCFA]">
                          <td className="px-6 py-5">
                            <div className="font-extrabold text-[#1A1A2E]">{row.name}</div>
                            <div className="mt-1 text-xs font-semibold text-[#6B7B8D]">{row.email}</div>
                          </td>
                          <td className="px-6 py-5 font-bold text-[#1A1A2E]">{row.events}</td>
                          <td className="px-6 py-5 font-bold text-[#1A1A2E]">{row.interactions}</td>
                          <td className="px-6 py-5 font-bold text-[#1A1A2E]">{row.questions}</td>
                          <td className="px-6 py-5 font-bold text-[#1A1A2E]">{row.votes}</td>
                          <td className="px-6 py-5 font-semibold text-[#6B7B8D]">{row.activity_period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </DashboardShell>
        </main>
      </div>
    </>
  );
}
