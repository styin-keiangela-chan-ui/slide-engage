'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import SETooltip from '@/components/ui/SETooltip';
import DashboardShell from '@/components/ui/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import type { Event } from '@/lib/types';

type RangePreset = '7' | '30' | '90' | 'custom';

type MetricValue = {
  label: string;
  value: number | string;
  helper: string;
  icon: string;
  tooltip: string;
  accent: string;
};

type AccountActivity = {
  user_id: string;
  name: string;
  email: string;
  events: number;
  interactions: number;
  questions: number;
  votes: number;
  total_responses: number;
  activity_period: string;
};

type MostActiveEvent = {
  id: string;
  event_name: string;
  event_code: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  participants: number;
  interactions: number;
  questions: number;
  poll_votes: number;
  response_rate: number;
  engagement_score: number;
};

type AnalyticsResponse = {
  metrics: Record<string, any>;
  events: Event[];
  account_activity: AccountActivity[];
  most_active_events: MostActiveEvent[];
  interaction_analytics: Record<string, any>;
  event_detail: any;
};

const emptyAnalytics: AnalyticsResponse = {
  metrics: {},
  events: [],
  account_activity: [],
  most_active_events: [],
  interaction_analytics: {},
  event_detail: null,
};

const chartColors = ['#168A3A', '#1A6BB5', '#D46B08', '#7C3AED', '#0F766E', '#BE185D', '#64748B'];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeFromPreset(preset: RangePreset, customFrom: string, customTo: string) {
  if (preset === 'custom') return { from: customFrom, to: customTo };
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - Number(preset));
  return { from: isoDate(from), to: isoDate(to) };
}

function formatDateRange(event: MostActiveEvent) {
  const start = event.start_date || event.created_at;
  const end = event.end_date || event.start_date || event.created_at;
  const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!start) return 'No date';
  const startDate = format.format(new Date(start));
  const endDate = end ? format.format(new Date(end)) : startDate;
  return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
}

function truncateText(value: unknown, max = 18) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function valueSizeClass(value: unknown) {
  const length = String(value ?? '').length;
  if (length > 26) return 'text-sm leading-snug';
  if (length > 16) return 'text-lg leading-tight';
  if (length > 9) return 'text-2xl leading-tight';
  return 'text-4xl leading-none';
}

function exportCsv(data: AnalyticsResponse) {
  const metrics = data.metrics || {};
  const rows = [
    ['Metric', 'Value'],
    ['Active events', metrics.active_events || 0],
    ['Total participants', metrics.total_participants || 0],
    ['Total interactions', metrics.total_interactions || 0],
    ['Total responses', metrics.total_responses || 0],
    ['Questions', metrics.questions || 0],
    ['Poll votes', metrics.poll_votes || 0],
    ['Response rate', `${metrics.response_rate || 0}%`],
    ['Engagement score', `${metrics.engagement_score || 0}%`],
    [],
    ['User', 'Email', 'Events', 'Interactions', 'Questions', 'Votes', 'Total Responses', 'Activity Period'],
    ...(data.account_activity || []).map(row => [
      row.name,
      row.email,
      row.events,
      row.interactions,
      row.questions,
      row.votes,
      row.total_responses,
      row.activity_period,
    ]),
    [],
    ['Event', 'Code', 'Participants', 'Interactions', 'Questions', 'Poll Votes', 'Response Rate', 'Engagement Score'],
    ...(data.most_active_events || []).map(row => [
      row.event_name,
      row.event_code,
      row.participants,
      row.interactions,
      row.questions,
      row.poll_votes,
      `${row.response_rate}%`,
      `${row.engagement_score}%`,
    ]),
  ];

  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `slideengage-analytics-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="h-[154px] rounded-[16px] border border-[#DDE8E1] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="h-4 w-28 animate-pulse rounded bg-[#E8F0EB]" />
      <div className="mt-5 h-10 w-20 animate-pulse rounded bg-[#E8F0EB]" />
      <div className="mt-5 h-4 w-40 animate-pulse rounded bg-[#E8F0EB]" />
    </div>
  );
});

const MetricCard = memo(function MetricCard({ card, loading }: { card: MetricValue; loading: boolean }) {
  const valueText = String(card.value ?? '');
  return (
    <SETooltip text={card.tooltip} className="w-full">
      <div aria-label={card.tooltip} className={`h-[154px] overflow-hidden rounded-[16px] border border-[#DDE8E1] bg-gradient-to-br ${card.accent} p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SETooltip text={card.label}>
              <p className="line-clamp-2 min-h-[30px] max-w-full text-xs font-extrabold uppercase tracking-[0.13em] text-[#6B7B8D]">{card.label}</p>
            </SETooltip>
            <div className={`mt-3 flex h-11 min-w-0 items-center font-black text-[#17172F] ${valueSizeClass(valueText)}`}>
              {loading ? (
                <span className="inline-block h-9 w-20 animate-pulse rounded bg-[#E8F0EB]" />
              ) : (
                <SETooltip text={valueText}>
                  <span className="block max-w-full truncate">{valueText}</span>
                </SETooltip>
              )}
            </div>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-xl shadow-sm">{card.icon}</div>
        </div>
        <p className="mt-4 line-clamp-2 min-h-[38px] text-sm font-semibold text-[#6B7B8D]">{card.helper}</p>
      </div>
    </SETooltip>
  );
});

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[#DDE8E1] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#E2EBE6] px-5 py-4">
        <h2 className="text-lg font-extrabold text-[#17172F]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-[#6B7B8D]">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  const valueText = String(value ?? '');
  return (
    <div className="h-[92px] min-w-0 overflow-hidden rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-4">
      <SETooltip text={label}>
        <p className="line-clamp-2 min-h-[28px] text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7B8D]">{label}</p>
      </SETooltip>
      <SETooltip text={valueText}>
        <p className={`mt-1 block max-w-full truncate font-black text-[#17172F] ${valueText.length > 22 ? 'text-sm' : valueText.length > 14 ? 'text-lg' : 'text-2xl'}`}>
          {valueText}
        </p>
      </SETooltip>
    </div>
  );
}

function ChartBox({ data, kind = 'bar' }: { data: Array<{ label: string; value: number }>; kind?: 'bar' | 'line' | 'pie' }) {
  if (!data?.length) return <div className="grid h-[240px] place-items-center rounded-[12px] bg-[#FAFCFA] text-sm font-bold text-[#6B7B8D]">No chart data</div>;
  return (
    <div className="h-[240px] rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-3">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2EBE6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={value => truncateText(value, 12)} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Line type="monotone" dataKey="value" stroke="#168A3A" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        ) : kind === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" outerRadius={76} label>
              {data.map(row => <Cell key={row.label} fill={chartColors[data.indexOf(row) % chartColors.length]} />)}
            </Pie>
            <ChartTooltip />
          </PieChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2EBE6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={value => truncateText(value, 12)} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#168A3A" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[16px] border border-dashed border-[#CFE0D6] bg-white px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[#EAF7EF] text-2xl">📜</div>
      <h3 className="text-base font-extrabold text-[#17172F]">No activity yet.</h3>
      <p className="mt-1 text-sm font-semibold text-[#6B7B8D]">Create events and collect responses to see analytics here.</p>
    </div>
  );
}

export default function LecturerAnalyticsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading: authLoading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [rangePreset, setRangePreset] = useState<RangePreset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsResponse>(emptyAnalytics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    const eventId = new URLSearchParams(window.location.search).get('event_id');
    if (eventId) setSelectedEventId(eventId);
  }, []);

  useEffect(() => {
    if (!lecturer) return;
    fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rows = (data.events || []).filter((event: Event) => event.status !== 'archived');
        setEvents(rows);
        if (currentEvent && !rows.some((event: Event) => event.id === currentEvent.id)) {
          clearSelectedEvent();
          setSelectedEventId('');
        }
      });
  }, [clearSelectedEvent, currentEvent, lecturer]);

  const selectedEvent = useMemo(() => events.find(event => event.id === selectedEventId) || null, [events, selectedEventId]);
  const selectedRange = useMemo(() => rangeFromPreset(rangePreset, customFrom, customTo), [customFrom, customTo, rangePreset]);

  useEffect(() => {
    if (!lecturer) return;
    if (selectedEvent) selectEvent(selectedEvent);

    const controller = new AbortController();
    const params = new URLSearchParams({ lecturer_id: lecturer.id });
    if (selectedEventId) params.set('event_id', selectedEventId);
    if (selectedRange.from) params.set('from', selectedRange.from);
    if (selectedRange.to) params.set('to', selectedRange.to);

    setLoading(true);
    setError('');
    fetch(`/api/analytics?${params.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Unable to load analytics.');
        setAnalytics({ ...emptyAnalytics, ...data });
      })
      .catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lecturer, selectedEvent, selectedEventId, selectedRange, selectEvent]);

  const metrics = analytics.metrics || {};
  const interactionAnalytics = analytics.interaction_analytics || {};
  const hasActivity = Number(metrics.total_responses || 0) + Number(metrics.total_participants || 0) + Number(metrics.total_interactions || 0) > 0;

  const overviewCards: MetricValue[] = [
    {
      label: 'Active Events',
      value: metrics.active_events || 0,
      helper: `${metrics.created_events || 0} events created during selected period`,
      icon: '📅',
      tooltip: 'Number of currently active events',
      accent: 'from-[#EAF7EF] to-white',
    },
    {
      label: 'Total Participants',
      value: metrics.total_participants || 0,
      helper: `${metrics.average_participants_per_event || 0} average participants per event`,
      icon: '👥',
      tooltip: 'Total participants joined',
      accent: 'from-[#EFF6FF] to-white',
    },
    {
      label: 'Total Interactions',
      value: metrics.total_interactions || 0,
      helper: `${(metrics.interaction_breakdown || []).map((item: any) => `${item.count} ${item.type}`).join(' · ') || 'No interactions yet'}`,
      icon: '🌐',
      tooltip: 'Total interactions created',
      accent: 'from-[#F3EFFF] to-white',
    },
    {
      label: 'Total Responses',
      value: metrics.total_responses || 0,
      helper: 'Votes, ratings, quiz answers, text responses, and questions',
      icon: '💬',
      tooltip: 'All valid participant responses',
      accent: 'from-[#FFF7E8] to-white',
    },
    {
      label: 'Questions',
      value: metrics.questions || 0,
      helper: `${metrics.anonymous_question_rate || 0}% anonymous question rate`,
      icon: '❔',
      tooltip: 'Total Q&A submissions',
      accent: 'from-[#FDF2F8] to-white',
    },
    {
      label: 'Poll Votes',
      value: metrics.poll_votes || 0,
      helper: `${metrics.average_votes_per_poll || 0} average votes per poll`,
      icon: '📊',
      tooltip: 'Total poll votes submitted',
      accent: 'from-[#ECFEFF] to-white',
    },
    {
      label: 'Response Rate',
      value: `${metrics.response_rate || 0}%`,
      helper: 'Total responses divided by total participants',
      icon: '📈',
      tooltip: 'Total responses divided by total participants',
      accent: 'from-[#F0FDF4] to-white',
    },
    {
      label: 'Engagement Score',
      value: `${metrics.engagement_score || 0}%`,
      helper: 'Responses, votes, ratings, questions, and quiz attempts per participant',
      icon: '⚡',
      tooltip: 'Overall audience engagement score',
      accent: 'from-[#FFF1F2] to-white',
    },
  ];

  if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

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
                  <h1 className="text-2xl font-extrabold text-[#17172F]">Analytics</h1>
                  <p className="mt-1 text-sm font-semibold text-[#6B7B8D]">
                    {selectedEvent ? `${selectedEvent.event_name} · #${selectedEvent.event_code}` : 'Organization overview'}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <SETooltip text="Filter analytics by event">
                    <select
                      value={selectedEventId}
                      onChange={event => setSelectedEventId(event.target.value)}
                      aria-label="Filter analytics by event"
                      className="h-10 min-w-[220px] rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-bold text-[#17172F] outline-none focus:border-[#168A3A]"
                    >
                      <option value="">All events</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.event_name} · #{event.event_code}</option>
                      ))}
                    </select>
                  </SETooltip>

                  <SETooltip text="Select reporting period">
                    <select
                      value={rangePreset}
                      onChange={event => setRangePreset(event.target.value as RangePreset)}
                      aria-label="Select reporting period"
                      className="h-10 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-bold text-[#17172F] outline-none focus:border-[#168A3A]"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="custom">Custom range</option>
                    </select>
                  </SETooltip>

                  <div className="relative">
                    <SETooltip text="Export analytics data">
                      <button
                        type="button"
                        onClick={() => setExportOpen(open => !open)}
                        aria-label="Export analytics data"
                        className="h-10 rounded-[10px] bg-[#168A3A] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#0F6F2D]"
                      >
                        Export ▾
                      </button>
                    </SETooltip>
                    {exportOpen && (
                      <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-[12px] border border-[#DDE8E1] bg-white py-1 text-sm font-bold shadow-[0_16px_35px_rgba(15,23,42,0.14)]">
                        <button type="button" onClick={() => { exportCsv(analytics); setExportOpen(false); }} className="block w-full px-4 py-3 text-left hover:bg-[#EAF7EF]">CSV</button>
                        <button type="button" onClick={() => { exportCsv(analytics); setExportOpen(false); }} className="block w-full px-4 py-3 text-left hover:bg-[#EAF7EF]">Excel</button>
                        <button type="button" onClick={() => { window.print(); setExportOpen(false); }} className="block w-full px-4 py-3 text-left hover:bg-[#EAF7EF]">PDF</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {rangePreset === 'custom' && (
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input type="date" value={customFrom} onChange={event => setCustomFrom(event.target.value)} className="h-10 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-bold outline-none focus:border-[#168A3A]" />
                  <input type="date" value={customTo} onChange={event => setCustomTo(event.target.value)} className="h-10 rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-bold outline-none focus:border-[#168A3A]" />
                </div>
              )}
            </DashboardShell>
          </div>

          <DashboardShell className="space-y-6 py-6">
            {error && <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
            {notice && <div className="rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-[#168A3A]">{notice}</div>}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {loading && !hasActivity
                ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={`skeleton-${index}`} />)
                : overviewCards.map(card => <MetricCard key={card.label} card={card} loading={loading} />)}
            </div>

            {!hasActivity && !loading ? <EmptyState /> : null}

            {analytics.event_detail && (
              <Section title="Event detail analytics" subtitle="Focused metrics for the selected event.">
                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {Object.entries(analytics.event_detail.summary || {}).map(([label, value]) => (
                    <MiniStat key={label} label={label.replace(/_/g, ' ')} value={String(value)} />
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniStat label="Join rate" value={`${analytics.event_detail.metrics?.join_rate || 0}%`} />
                  <MiniStat label="Response rate" value={`${analytics.event_detail.metrics?.response_rate || 0}%`} />
                  <MiniStat label="Engagement score" value={`${analytics.event_detail.metrics?.engagement_score || 0}%`} />
                </div>
              </Section>
            )}

            <Section title="Account activity" subtitle="Activity summary for the selected date range.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-[#FAFCFA] text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7B8D]">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Events</th>
                      <th className="px-4 py-3">Interactions</th>
                      <th className="px-4 py-3">Questions</th>
                      <th className="px-4 py-3">Votes</th>
                      <th className="px-4 py-3">Total responses</th>
                      <th className="px-4 py-3">Activity Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2EBE6]">
                    {(analytics.account_activity || []).map(row => (
                      <tr key={row.user_id} className="hover:bg-[#FAFCFA]">
                        <td className="px-4 py-4">
                          <SETooltip text={row.name}>
                            <div className="max-w-[220px] truncate font-extrabold text-[#17172F]">{row.name}</div>
                          </SETooltip>
                          <SETooltip text={row.email}>
                            <div className="mt-1 max-w-[220px] truncate text-xs font-semibold text-[#6B7B8D]">{row.email}</div>
                          </SETooltip>
                        </td>
                        <td className="px-4 py-4 font-bold">{row.events}</td>
                        <td className="px-4 py-4 font-bold">{row.interactions}</td>
                        <td className="px-4 py-4 font-bold">{row.questions}</td>
                        <td className="px-4 py-4 font-bold">{row.votes}</td>
                        <td className="px-4 py-4 font-bold">{row.total_responses}</td>
                        <td className="px-4 py-4 font-semibold text-[#6B7B8D]">{row.activity_period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {(analytics.most_active_events || []).length > 0 && (
              <Section title="Most active events" subtitle="Sorted by highest engagement score.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead className="bg-[#FAFCFA] text-xs font-extrabold uppercase tracking-[0.12em] text-[#6B7B8D]">
                      <tr>
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Participants</th>
                        <th className="px-4 py-3">Interactions</th>
                        <th className="px-4 py-3">Questions</th>
                        <th className="px-4 py-3">Poll votes</th>
                        <th className="px-4 py-3">Response rate</th>
                        <th className="px-4 py-3">Engagement</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2EBE6]">
                      {analytics.most_active_events.map(event => (
                        <tr key={event.id} className="hover:bg-[#FAFCFA]">
                          <td className="px-4 py-4">
                            <SETooltip text={event.event_name}>
                              <div className="max-w-[240px] truncate font-extrabold text-[#17172F]">{event.event_name}</div>
                            </SETooltip>
                            <div className="text-xs font-bold text-[#6B7B8D]">#{event.event_code}</div>
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#6B7B8D]">{formatDateRange(event)}</td>
                          <td className="px-4 py-4 font-bold">{event.participants}</td>
                          <td className="px-4 py-4 font-bold">{event.interactions}</td>
                          <td className="px-4 py-4 font-bold">{event.questions}</td>
                          <td className="px-4 py-4 font-bold">{event.poll_votes}</td>
                          <td className="px-4 py-4 font-bold">{event.response_rate}%</td>
                          <td className="px-4 py-4 font-bold text-[#168A3A]">{event.engagement_score}%</td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEventId(event.id);
                                setNotice(`Showing analytics for ${event.event_name}.`);
                              }}
                              className="rounded-[9px] border border-[#DDE8E1] px-3 py-2 text-xs font-extrabold text-[#168A3A] hover:bg-[#EAF7EF]"
                            >
                              View Event
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <div className="space-y-6">
              {interactionAnalytics.multiple_choice && (
                <Section title="Multiple choice analytics" subtitle="Poll vote activity and option comparison.">
                  <div className="grid gap-3 md:grid-cols-5">
                    <MiniStat label="Total poll votes" value={interactionAnalytics.multiple_choice.total_poll_votes} />
                    <MiniStat label="Polls with responses" value={interactionAnalytics.multiple_choice.polls_with_responses} />
                    <MiniStat label="Avg votes per poll" value={interactionAnalytics.multiple_choice.average_votes_per_poll} />
                    <MiniStat label="Most selected" value={interactionAnalytics.multiple_choice.most_selected_option} />
                    <MiniStat label="Response rate" value={`${interactionAnalytics.multiple_choice.response_rate}%`} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <ChartBox data={interactionAnalytics.multiple_choice.vote_distribution || []} />
                    <ChartBox data={interactionAnalytics.multiple_choice.option_comparison || []} kind="pie" />
                  </div>
                </Section>
              )}

              {interactionAnalytics.open_text && (
                <Section title="Open text analytics" subtitle="Keyword and latest response insights.">
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniStat label="Total responses" value={interactionAnalytics.open_text.total_responses} />
                    <MiniStat label="Unique responses" value={interactionAnalytics.open_text.unique_responses} />
                    <MiniStat label="Top keyword" value={interactionAnalytics.open_text.keywords?.[0]?.label || 'None'} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <ChartBox data={interactionAnalytics.open_text.keywords || []} />
                    <div className="rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-4">
                      <h3 className="text-sm font-extrabold text-[#17172F]">Latest responses</h3>
                      <div className="mt-3 space-y-2">
                        {(interactionAnalytics.open_text.latest_responses || []).map((row: any) => (
                          <div key={`${row.submitted_at}-${row.text}`} className="rounded-[10px] bg-white p-3 text-sm font-semibold text-[#17172F]">
                            <SETooltip text={row.text}>
                              <p className="line-clamp-3 break-words">{row.text}</p>
                            </SETooltip>
                            <SETooltip text={row.participant}>
                              <div className="mt-1 max-w-full truncate text-xs text-[#6B7B8D]">{row.participant}</div>
                            </SETooltip>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Section>
              )}

              {interactionAnalytics.word_cloud && (
                <Section title="Word cloud analytics" subtitle="Word frequency and submitted term ranking.">
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniStat label="Total words" value={interactionAnalytics.word_cloud.total_words} />
                    <MiniStat label="Unique words" value={interactionAnalytics.word_cloud.unique_words} />
                    <MiniStat label="Most frequent word" value={interactionAnalytics.word_cloud.most_frequent_word} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="flex min-h-[240px] flex-wrap content-center justify-center gap-3 rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-5">
                      {(interactionAnalytics.word_cloud.words || []).map((word: any, index: number) => (
                        <SETooltip key={word.label} text={word.label}>
                          <span className="block max-w-[180px] truncate font-black" style={{ color: chartColors[index % chartColors.length], fontSize: `${Math.min(42, 16 + word.value * 6)}px` }}>
                            {word.label}
                          </span>
                        </SETooltip>
                      ))}
                    </div>
                    <ChartBox data={interactionAnalytics.word_cloud.ranking || []} />
                  </div>
                </Section>
              )}

              {interactionAnalytics.rating && (
                <Section title="Rating analytics" subtitle="Average rating, distribution, and trend.">
                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniStat label="Average rating" value={interactionAnalytics.rating.average_rating} />
                    <MiniStat label="Total ratings" value={interactionAnalytics.rating.total_ratings} />
                    <MiniStat label="Highest rating" value={interactionAnalytics.rating.highest_rating} />
                    <MiniStat label="Lowest rating" value={interactionAnalytics.rating.lowest_rating} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <ChartBox data={interactionAnalytics.rating.distribution || []} />
                    <ChartBox data={interactionAnalytics.rating.trend || []} kind="line" />
                  </div>
                </Section>
              )}

              {interactionAnalytics.quiz && (
                <Section title="Quiz analytics" subtitle="Attempts, scores, and leaderboard.">
                  <div className="grid gap-3 md:grid-cols-6">
                    <MiniStat label="Attempts" value={interactionAnalytics.quiz.total_attempts} />
                    <MiniStat label="Average score" value={`${interactionAnalytics.quiz.average_score}%`} />
                    <MiniStat label="Highest" value={`${interactionAnalytics.quiz.highest_score}%`} />
                    <MiniStat label="Lowest" value={`${interactionAnalytics.quiz.lowest_score}%`} />
                    <MiniStat label="Correct rate" value={`${interactionAnalytics.quiz.correct_rate}%`} />
                    <MiniStat label="Incorrect rate" value={`${interactionAnalytics.quiz.incorrect_rate}%`} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <ChartBox data={interactionAnalytics.quiz.score_distribution || []} />
                    <ChartBox data={interactionAnalytics.quiz.correct_vs_wrong || []} kind="pie" />
                  </div>
                  {(interactionAnalytics.quiz.leaderboard || []).length > 0 && (
                    <div className="mt-5 rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-4">
                      <h3 className="text-sm font-extrabold text-[#17172F]">Top participants</h3>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {interactionAnalytics.quiz.leaderboard.map((row: any) => (
                          <div key={row.name} className="flex items-center justify-between rounded-[10px] bg-white px-3 py-2 text-sm font-bold">
                            <SETooltip text={row.name}>
                              <span className="max-w-[220px] truncate">{row.name}</span>
                            </SETooltip>
                            <span className="text-[#168A3A]">{row.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {interactionAnalytics.qa && (
                <Section title="Audience Q&A analytics" subtitle="Question activity, popularity, and anonymous rate.">
                  <div className="grid gap-3 md:grid-cols-4">
                    <MiniStat label="Questions" value={interactionAnalytics.qa.total_questions} />
                    <MiniStat label="Upvotes" value={interactionAnalytics.qa.upvotes} />
                    <MiniStat label="Downvotes" value={interactionAnalytics.qa.downvotes} />
                    <MiniStat label="Anonymous rate" value={`${interactionAnalytics.qa.anonymous_rate}%`} />
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[12px] border border-[#E2EBE6] bg-[#FAFCFA] p-4">
                      <h3 className="text-sm font-extrabold text-[#17172F]">Most upvoted questions</h3>
                      <div className="mt-3 space-y-2">
                        {(interactionAnalytics.qa.popular_questions || []).map((row: any) => (
                          <div key={row.id} className="rounded-[10px] bg-white p-3 text-sm font-semibold">
                            <SETooltip text={row.question}>
                              <p className="line-clamp-3 break-words">{row.question}</p>
                            </SETooltip>
                            <SETooltip text={row.participant}>
                              <div className="mt-1 max-w-full truncate text-xs text-[#6B7B8D]">{row.upvotes} upvotes · {row.participant}</div>
                            </SETooltip>
                          </div>
                        ))}
                      </div>
                    </div>
                    <ChartBox data={interactionAnalytics.qa.activity_trend || []} kind="line" />
                  </div>
                </Section>
              )}
            </div>
          </DashboardShell>
        </main>
      </div>
    </>
  );
}
