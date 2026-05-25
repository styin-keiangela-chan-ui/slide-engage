'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { isLocalUrl, normalizePublicUrl } from '@/lib/public-url';
import type { Event, Interaction, InteractionOption } from '@/lib/types';

type LiveInteraction = Interaction & {
  interaction_options?: InteractionOption[];
};

type ResultPayload = {
  interaction?: LiveInteraction;
  results: any;
  total_responses: number;
  hidden?: boolean;
};

type JoinedResponse = {
  id: string;
  text_value: string | null;
  rating_value: number | null;
  submitted_at: string;
  participants?: { display_name?: string | null } | null;
  interaction_options?: { option_text?: string | null; is_correct?: boolean | null } | null;
};

type JoinedQuestion = {
  id: string;
  question_text: string;
  is_pinned: boolean;
  created_at: string;
  participants?: { display_name?: string | null } | null;
  qa_upvotes?: { id: string }[];
};

type Props = {
  event?: Event | null;
  eventCode?: string;
  publicMode?: boolean;
};

const chartColors = ['#16833a', '#1f77b4', '#8b5cf6', '#f97316', '#dc2626', '#0891b2'];
const wordCloudColors = ['#16833A', '#1D75D0', '#8B5CF6', '#E85D75', '#F97316', '#0891B2', '#6A8D0A', '#C026D3'];

function interactionLabel(interaction?: LiveInteraction | null) {
  if (!interaction) return 'Interaction';
  const kind = (interaction.config as Record<string, any>)?.poll_kind;
  if (interaction.type === 'poll') return 'Multiple Choice';
  if (interaction.type === 'quiz') return 'Quiz';
  if (interaction.type === 'word_cloud') return 'Word Cloud';
  if (interaction.type === 'qa') return 'Audience Q&A';
  if (kind === 'rating') return 'Rating';
  if (kind === 'ideas') return 'Ideas';
  return 'Open Text';
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="min-h-[420px] rounded-[8px] border border-[#E2EBE6] bg-white flex items-center justify-center text-center">
      <p className="text-[22px] font-semibold text-[#6B7B8D]">{children}</p>
    </div>
  );
}

function hashText(value: string) {
  return value.split('').reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildCloudWords(responses: JoinedResponse[], fallbackWords: any[], tick: number) {
  const grouped = new Map<string, { text: string; count: number; latestAt: number; firstSeen: number }>();

  responses
    .filter(response => response.text_value?.trim())
    .forEach((response, index) => {
      const normalized = normalizeWord(response.text_value || '');
      if (!normalized) return;

      const submittedAt = response.submitted_at ? new Date(response.submitted_at).getTime() : Date.now();
      const existing = grouped.get(normalized);
      if (existing) {
        existing.count += 1;
        existing.latestAt = Math.max(existing.latestAt, submittedAt);
      } else {
        grouped.set(normalized, {
          text: response.text_value?.trim() || normalized,
          count: 1,
          latestAt: submittedAt,
          firstSeen: index,
        });
      }
    });

  if (!grouped.size) {
    fallbackWords.forEach((entry: any, index: number) => {
      const normalized = normalizeWord(entry.word || entry.text || '');
      if (!normalized) return;
      grouped.set(normalized, {
        text: entry.word || entry.text,
        count: Number(entry.count || entry.value || 1),
        latestAt: Date.now() - index * 60_000,
        firstSeen: index,
      });
    });
  }

  const newestTimestamp = Math.max(...Array.from(grouped.values()).map(word => word.latestAt), 0);
  const now = Date.now() + tick;

  return Array.from(grouped.values())
    .map(word => {
      const minutesOld = Math.max(0, (now - word.latestAt) / 60_000);
      const ageFactor = Math.max(1, 10 - minutesOld);
      const frequencyFactor = word.count * 5;
      const value = 20 + ageFactor * 4 + frequencyFactor;
      return {
        ...word,
        value,
        isNewest: word.latestAt === newestTimestamp,
      };
    })
    .sort((a, b) => b.value - a.value || b.latestAt - a.latestAt || a.firstSeen - b.firstSeen)
    .slice(0, 34);
}

function EventQRCode({
  event,
  variant = 'light',
  compact = false,
}: {
  event: Event | null;
  variant?: 'light' | 'dark';
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const publicUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const publicUrlReady = Boolean(publicUrl && !isLocalUrl(publicUrl));
  const eventCode = event?.event_code || '';
  const joinLink = publicUrlReady && eventCode ? `${publicUrl}/join?code=${encodeURIComponent(eventCode)}` : '';
  const qrSrc = eventCode && publicUrlReady ? `/api/qrcode?code=${encodeURIComponent(eventCode)}&format=svg&v=${event?.id || eventCode}` : '';
  const isDark = variant === 'dark';

  const copyJoinLink = async () => {
    if (!joinLink) return;
    await navigator.clipboard?.writeText(joinLink);
  };

  return (
    <>
      <div
        className={`transition-all duration-500 ${
          isDark
            ? 'rounded-[18px] border border-white/15 bg-white/10 text-white shadow-[0_0_45px_rgba(22,131,58,0.25)] backdrop-blur-xl'
            : 'rounded-[14px] border border-[#DDEAE3] bg-white/85 text-[#17172F] shadow-sm backdrop-blur'
        } ${compact ? 'p-4' : 'p-5'}`}
      >
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-200' : 'text-[#16833A]'}`}>
          Join live
        </p>
        <button
          type="button"
          onClick={() => qrSrc && setExpanded(true)}
          className={`mt-4 block rounded-[12px] border p-3 transition hover:scale-[1.02] ${
            isDark ? 'border-emerald-300/30 bg-white shadow-[0_0_30px_rgba(74,222,128,0.26)]' : 'border-[#DDEAE3] bg-white'
          }`}
          aria-label="Enlarge event QR code"
        >
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={`Join event ${eventCode}`} className={compact ? 'h-28 w-28' : 'h-40 w-40'} />
          ) : (
            <div className={`${compact ? 'h-28 w-28' : 'h-40 w-40'} grid place-items-center text-center text-xs text-[#6B7B8D]`}>
              Public URL required
            </div>
          )}
        </button>
        <p className={`mt-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-[#6B7B8D]'}`}>
          Scan QR code to join the event
        </p>
        <div className={`mt-3 rounded-[10px] border px-3 py-2 text-center text-2xl font-black tracking-wide ${
          isDark ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-[#CFE0D7] bg-[#EAF7EF] text-[#16833A]'
        }`}>
          #{eventCode || '------'}
        </div>
        <p className={`mt-3 max-w-[190px] break-words text-xs ${isDark ? 'text-slate-300' : 'text-[#6B7B8D]'}`}>
          {publicUrl || 'Set NEXT_PUBLIC_APP_URL'}
        </p>
        {!compact && (
          <button
            type="button"
            onClick={copyJoinLink}
            disabled={!joinLink}
            className={`mt-4 w-full rounded-[8px] px-3 py-2 text-sm font-bold transition ${
              joinLink
                ? isDark
                  ? 'bg-emerald-400 text-[#052E16] hover:bg-emerald-300'
                  : 'bg-[#16833A] text-white hover:bg-[#116C31]'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            Copy Join Link
          </button>
        )}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onClick={() => setExpanded(false)}>
          <div className="rounded-[20px] bg-white p-7 shadow-2xl" onClick={event => event.stopPropagation()}>
            {qrSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt={`Join event ${eventCode}`} className="h-[360px] w-[360px]" />
            )}
            <p className="mt-4 text-center text-4xl font-black text-[#16833A]">#{eventCode}</p>
            <p className="mt-2 max-w-[360px] break-words text-center text-sm text-[#6B7B8D]">{joinLink}</p>
          </div>
        </div>
      )}
    </>
  );
}

function AnimatedWordCloud({
  responses,
  fallbackWords,
  presentationMode,
}: {
  responses: JoinedResponse[];
  fallbackWords: any[];
  presentationMode: boolean;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(value => value + 1), 3000);
    return () => window.clearInterval(interval);
  }, []);

  const cloudWords = useMemo(() => buildCloudWords(responses, fallbackWords, tick), [fallbackWords, responses, tick]);
  const maxValue = Math.max(...cloudWords.map(word => word.value), 1);
  const slots = useMemo(() => {
    const ringSteps = [0, 7, 13, 18];
    return Array.from({ length: 40 }, (_, index) => {
      if (index === 0) return { x: 50, y: 50 };
      const ring = index <= 7 ? 1 : index <= 20 ? 2 : 3;
      const positionInRing = index - ringSteps[ring - 1] - 1;
      const itemsInRing = ring === 1 ? 7 : ring === 2 ? 13 : 19;
      const angle = (Math.PI * 2 * positionInRing) / itemsInRing + ring * 0.27 + tick * 0.02;
      const radiusX = ring === 1 ? 18 : ring === 2 ? 30 : 40;
      const radiusY = ring === 1 ? 14 : ring === 2 ? 24 : 32;
      return {
        x: 50 + Math.cos(angle) * radiusX,
        y: 50 + Math.sin(angle) * radiusY,
      };
    });
  }, [tick]);

  if (!cloudWords.length) {
    return <p className="py-28 text-center text-xl font-semibold text-[#6B7B8D]">Waiting for words...</p>;
  }

  return (
    <div className={`relative mx-auto overflow-hidden rounded-[8px] bg-gradient-to-br from-white via-[#F7FBF9] to-[#EEF7F1] ${
      presentationMode ? 'min-h-[62vh]' : 'min-h-[430px]'
    }`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(22,131,58,0.12),transparent_48%)]" />
      {cloudWords.map((word, index) => {
        const slot = slots[index] || slots[slots.length - 1];
        const seed = hashText(word.text);
        const driftX = Math.sin(tick * 0.7 + seed) * (presentationMode ? 1.5 : 1);
        const driftY = Math.cos(tick * 0.55 + seed) * (presentationMode ? 1.2 : 0.8);
        const rotate = ((seed % 31) - 15) * (index < 3 ? 0.35 : 1);
        const size = clamp(
          (presentationMode ? 28 : 18) + (word.value / maxValue) * (presentationMode ? 70 : 52),
          presentationMode ? 26 : 18,
          presentationMode ? 104 : 72
        );
        const opacity = clamp(0.48 + word.value / maxValue, 0.62, 1);

        return (
          <span
            key={word.text}
            className={`absolute whitespace-nowrap font-black leading-none transition-all duration-700 ease-out ${
              word.isNewest ? 'animate-[wordPop_900ms_cubic-bezier(.2,1.4,.4,1)]' : 'animate-[wordFloat_5s_ease-in-out_infinite]'
            }`}
            style={{
              left: `${clamp(slot.x + driftX, 8, 92)}%`,
              top: `${clamp(slot.y + driftY, 10, 90)}%`,
              color: wordCloudColors[index % wordCloudColors.length],
              fontSize: `${size}px`,
              opacity,
              transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
              textShadow: word.isNewest ? '0 0 26px rgba(22, 131, 58, 0.45)' : '0 10px 30px rgba(15, 23, 42, 0.10)',
              zIndex: Math.max(1, 80 - index),
              animationDelay: `${(seed % 900) / 1000}s`,
            }}
          >
            {word.text}
          </span>
        );
      })}
      <style jsx>{`
        @keyframes wordPop {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.55) rotate(0deg);
            filter: blur(6px);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.12) rotate(var(--rotate, 0deg));
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(var(--rotate, 0deg));
          }
        }

        @keyframes wordFloat {
          0%, 100% {
            margin-top: 0;
          }
          50% {
            margin-top: -8px;
          }
        }
      `}</style>
    </div>
  );
}

function FullscreenPresentation({
  event,
  interaction,
  responses,
  fallbackWords,
  onExit,
  publicMode,
}: {
  event: Event | null;
  interaction: LiveInteraction;
  responses: JoinedResponse[];
  fallbackWords: any[];
  onExit: () => void;
  publicMode: boolean;
}) {
  const [showControls, setShowControls] = useState(true);
  const publicUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const displayDomain = publicUrl ? new URL(publicUrl).hostname.replace(/^www\./, '') : 'slide-engage.com';

  useEffect(() => {
    const show = () => {
      setShowControls(true);
      window.clearTimeout((show as any).timer);
      (show as any).timer = window.setTimeout(() => setShowControls(false), 3200);
    };
    show();
    window.addEventListener('mousemove', show);
    window.addEventListener('keydown', show);
    return () => {
      window.removeEventListener('mousemove', show);
      window.removeEventListener('keydown', show);
      window.clearTimeout((show as any).timer);
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden rounded-[18px] bg-[#08130D] p-7 text-white md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(34,197,94,0.24),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(45,212,191,0.18),transparent_26%),radial-gradient(circle_at_68%_78%,rgba(139,92,246,0.18),transparent_30%)]" />
      <div className="absolute left-12 top-16 h-2 w-2 animate-[particleFloat_8s_ease-in-out_infinite] rounded-full bg-emerald-300/70" />
      <div className="absolute right-28 top-28 h-3 w-3 animate-[particleFloat_10s_ease-in-out_infinite] rounded-full bg-cyan-200/60" />
      <div className="absolute bottom-28 right-1/3 h-2 w-2 animate-[particleFloat_9s_ease-in-out_infinite] rounded-full bg-violet-200/60" />

      {!publicMode && (
        <button
          type="button"
          onClick={onExit}
          className={`absolute right-6 top-6 z-20 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Exit Fullscreen
        </button>
      )}

      <div className="relative z-10 flex min-h-[calc(100vh-120px)] flex-col gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
            <span>Live Word Cloud</span>
            <span className="rounded-full bg-white/10 px-3 py-1">#{event?.event_code}</span>
          </div>
          <h1 className="mt-4 max-w-6xl text-[40px] font-black leading-tight text-white md:text-[64px]">{interaction.title}</h1>
        </div>

        <div className="grid flex-1 gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="self-end lg:self-center">
            <EventQRCode event={event} variant="dark" compact />
          </div>
          <AnimatedWordCloud responses={responses} fallbackWords={fallbackWords} presentationMode />
        </div>
      </div>

      <div className="absolute inset-x-6 bottom-5 z-20 rounded-full border border-white/10 bg-black/28 px-6 py-3 text-center text-lg font-bold text-white shadow-2xl backdrop-blur md:text-2xl">
        Join at {displayDomain} and enter code <span className="text-emerald-300">#{event?.event_code}</span>
      </div>

      <style jsx>{`
        @keyframes particleFloat {
          0%, 100% {
            transform: translate3d(0, 0, 0);
            opacity: 0.35;
          }
          50% {
            transform: translate3d(24px, -22px, 0);
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}

export default function LiveResultsView({ event: initialEvent = null, eventCode, publicMode = false }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<Event | null>(initialEvent);
  const [liveInteractions, setLiveInteractions] = useState<LiveInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<LiveInteraction | null>(null);
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [responses, setResponses] = useState<JoinedResponse[]>([]);
  const [questions, setQuestions] = useState<JoinedQuestion[]>([]);
  const [loading, setLoading] = useState(Boolean(eventCode && !initialEvent));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEvent(initialEvent);
  }, [initialEvent]);

  const resolveEvent = useCallback(async () => {
    if (initialEvent || !eventCode) return;

    setLoading(true);
    setError('');
    const { data, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('event_code', eventCode.toUpperCase())
      .neq('status', 'archived')
      .maybeSingle();

    if (eventError) {
      setError(eventError.message);
      setEvent(null);
    } else {
      setEvent((data as Event | null) || null);
      if (!data) setError('Event not found.');
    }
    setLoading(false);
  }, [eventCode, initialEvent, supabase]);

  const loadLiveInteractions = useCallback(
    async (eventId: string, preferredInteractionId?: string) => {
      const { data, error: interactionError } = await supabase
        .from('interactions')
        .select('*, interaction_options(*)')
        .eq('event_id', eventId)
        .eq('status', 'live')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (interactionError) {
        setError(interactionError.message);
        setLiveInteractions([]);
        setActiveInteraction(null);
        return;
      }

      const rows = (data || []) as LiveInteraction[];
      setLiveInteractions(rows);
      setActiveInteraction(current => {
        return (
          rows.find(row => row.id === preferredInteractionId) ||
          rows.find(row => row.id === current?.id) ||
          rows[0] ||
          null
        );
      });
    },
    [supabase]
  );

  const loadQuestions = useCallback(
    async (interactionId: string) => {
      const { data } = await supabase
        .from('qa_questions')
        .select('*, participants(display_name), qa_upvotes(id)')
        .eq('interaction_id', interactionId)
        .eq('is_hidden', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      setQuestions((data || []) as JoinedQuestion[]);
    },
    [supabase]
  );

  const loadResponses = useCallback(
    async (interactionId: string) => {
      const { data } = await supabase
        .from('responses')
        .select('*, participants(display_name), interaction_options(option_text,is_correct)')
        .eq('interaction_id', interactionId)
        .order('submitted_at', { ascending: true });

      setResponses((data || []) as JoinedResponse[]);
    },
    [supabase]
  );

  const loadResults = useCallback(
    async (interaction: LiveInteraction | null) => {
      if (!interaction) {
        setPayload(null);
        setResponses([]);
        setQuestions([]);
        return;
      }

      const [resultResponse] = await Promise.all([
        fetch(`/api/results?interaction_id=${interaction.id}`, { cache: 'no-store' }),
        loadResponses(interaction.id),
        interaction.type === 'qa' ? loadQuestions(interaction.id) : Promise.resolve(),
      ]);

      if (!resultResponse.ok) {
        const data = await resultResponse.json().catch(() => ({}));
        setError(data.error || 'Unable to load live results.');
        setPayload(null);
        return;
      }

      setPayload(await resultResponse.json());
    },
    [loadQuestions, loadResponses]
  );

  useEffect(() => {
    resolveEvent();
  }, [resolveEvent]);

  useEffect(() => {
    if (!event?.id) {
      setLiveInteractions([]);
      setActiveInteraction(null);
      return;
    }
    loadLiveInteractions(event.id);
  }, [event?.id, loadLiveInteractions]);

  useEffect(() => {
    loadResults(activeInteraction);
  }, [activeInteraction?.id, loadResults]);

  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`slideengage-event-${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions', filter: `event_id=eq.${event.id}` },
        payload => {
          const next = payload.new as Partial<LiveInteraction> | undefined;
          loadLiveInteractions(event.id, next?.status === 'live' ? next.id : undefined);
        }
      )
      .on(
        'broadcast',
        { event: 'interaction_changed' },
        payload => {
          loadLiveInteractions(event.id, payload.payload?.interaction_id);
        }
      )
      .on('broadcast', { event: 'response_inserted' }, payload => {
        if (!activeInteraction || payload.payload?.interaction_id === activeInteraction.id) {
          loadResults(activeInteraction);
        }
      })
      .on('broadcast', { event: 'qa_changed' }, payload => {
        if (!activeInteraction || payload.payload?.interaction_id === activeInteraction.id) {
          loadResults(activeInteraction);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeInteraction, event?.id, loadLiveInteractions, loadResults, supabase]);

  useEffect(() => {
    if (!activeInteraction?.id) return;

    const channel = supabase
      .channel(`live-results-data-${activeInteraction.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'responses', filter: `interaction_id=eq.${activeInteraction.id}` },
        () => loadResults(activeInteraction)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qa_questions', filter: `interaction_id=eq.${activeInteraction.id}` },
        () => loadResults(activeInteraction)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qa_upvotes' }, () =>
        activeInteraction.type === 'qa' ? loadResults(activeInteraction) : undefined
      )
      .on('broadcast', { event: 'response_inserted' }, payload => {
        if (payload.payload?.interaction_id === activeInteraction.id) {
          loadResults(activeInteraction);
        }
      })
      .on('broadcast', { event: 'qa_changed' }, payload => {
        if (payload.payload?.interaction_id === activeInteraction.id) {
          loadResults(activeInteraction);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeInteraction, loadResults, supabase]);

  useEffect(() => {
    if (!activeInteraction?.id) return;
    const interval = window.setInterval(() => loadResults(activeInteraction), 2500);
    return () => window.clearInterval(interval);
  }, [activeInteraction, loadResults]);

  const enterFullscreen = async () => {
    setIsFullscreen(true);
    try {
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
  };

  const exitFullscreen = async () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {}
  };

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const content = renderResultContent({
    event,
    interaction: activeInteraction,
    payload,
    responses,
    questions,
    presentationMode: isFullscreen || publicMode,
  });

  const shellClass = isFullscreen
    ? 'fixed inset-0 z-50 overflow-y-auto bg-[#0F172A] text-white p-8 md:p-12 transition-colors'
    : publicMode
      ? 'min-h-screen bg-[#0F172A] text-white p-8 md:p-12 transition-colors'
      : 'rounded-[8px] border border-[#E2EBE6] bg-white p-6 shadow-sm';

  if (!event && !eventCode && !loading) {
    return <EmptyState>Please select an event first.</EmptyState>;
  }

  if (loading) {
    return <EmptyState>Loading live results...</EmptyState>;
  }

  if (error && !event) {
    return <EmptyState>{error}</EmptyState>;
  }

  if (!activeInteraction) {
    return (
      <div className={shellClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#2D8A4E]">Live Results</p>
            <h1 className={`mt-2 text-[30px] font-bold ${isFullscreen || publicMode ? 'text-white' : 'text-[#17172F]'}`}>
              {event?.event_name || 'Selected event'}
            </h1>
            <p className={isFullscreen || publicMode ? 'text-slate-300' : 'text-[#6B7B8D]'}>#{event?.event_code}</p>
          </div>
          {!publicMode && (
            <button
              type="button"
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className="rounded-[8px] border border-[#CFE0D7] px-4 py-2 text-sm font-semibold text-[#16833A] hover:bg-[#EAF7EF]"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Present Fullscreen'}
            </button>
          )}
        </div>
        <div className="mt-20 text-center">
          <p className={`text-[28px] font-semibold ${isFullscreen || publicMode ? 'text-slate-100' : 'text-[#6B7B8D]'}`}>
            Waiting for lecturer to start an interaction.
          </p>
        </div>
      </div>
    );
  }

  if ((isFullscreen || publicMode) && activeInteraction.type === 'word_cloud') {
    const words = Array.isArray(payload?.results) ? payload.results : [];
    return (
      <div className={shellClass}>
        <FullscreenPresentation
          event={event}
          interaction={activeInteraction}
          responses={responses}
          fallbackWords={words}
          onExit={exitFullscreen}
          publicMode={publicMode}
        />
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#DFF5E7] px-3 py-1 text-sm font-bold text-[#16833A]">Live</span>
            <span className={isFullscreen || publicMode ? 'text-slate-300' : 'text-[#6B7B8D]'}>
              {interactionLabel(activeInteraction)} · #{event?.event_code}
            </span>
          </div>
          <h1 className={`mt-4 max-w-5xl text-[36px] font-extrabold leading-tight md:text-[52px] ${isFullscreen || publicMode ? 'text-white' : 'text-[#17172F]'}`}>
            {activeInteraction.title}
          </h1>
          {liveInteractions.length > 1 && (
            <p className={isFullscreen || publicMode ? 'mt-3 text-slate-300' : 'mt-3 text-[#6B7B8D]'}>
              {liveInteractions.length} live interactions in this event.
            </p>
          )}
        </div>

        {!publicMode && (
          <button
            type="button"
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className="rounded-[8px] bg-[#16833A] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#116C31]"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Present Fullscreen'}
          </button>
        )}
      </div>

      {liveInteractions.length > 1 && !isFullscreen && !publicMode && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {liveInteractions.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveInteraction(item)}
              className={`min-w-[190px] rounded-[8px] border px-4 py-3 text-left transition ${
                activeInteraction.id === item.id
                  ? 'border-[#16833A] bg-[#EAF7EF] text-[#16833A] shadow-sm'
                  : 'border-[#E2EBE6] bg-white text-[#17172F] hover:border-[#16833A]'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-[0.1em]">{interactionLabel(item)}</div>
              <div className="mt-1 truncate text-sm font-bold">{item.title}</div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">{content}</div>
    </div>
  );
}

function renderResultContent({
  event,
  interaction,
  payload,
  responses,
  questions,
  presentationMode,
}: {
  event: Event | null;
  interaction: LiveInteraction | null;
  payload: ResultPayload | null;
  responses: JoinedResponse[];
  questions: JoinedQuestion[];
  presentationMode: boolean;
}) {
  if (!interaction) return null;

  if (payload?.hidden) {
    return (
      <div className="rounded-[8px] border border-dashed border-[#CFE0D7] p-10 text-center text-xl font-semibold text-[#6B7B8D]">
        Results are hidden.
      </div>
    );
  }

  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    const chartData = Array.isArray(payload?.results) ? payload.results : [];
    const correct = chartData.find((option: any) => option.is_correct);

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="h-[430px] rounded-[8px] border border-[#E2EBE6] bg-white p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 40, top: 12, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="option_text" type="category" width={150} tick={{ fontSize: 14 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {chartData.map((entry: any, index: number) => (
                  <Cell key={entry.option_id || index} fill={entry.is_correct ? '#16833A' : chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[8px] border border-[#E2EBE6] bg-white p-5">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6B7B8D]">Responses</p>
          <p className="mt-2 text-[44px] font-extrabold text-[#17172F]">{payload?.total_responses || 0}</p>
          <div className="mt-6 space-y-3">
            {chartData.map((option: any) => (
              <div key={option.option_id} className="rounded-[8px] bg-[#F6F8F7] p-3">
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#17172F]">
                  <span>{option.option_text}</span>
                  <span>{option.percentage}%</span>
                </div>
                <p className="mt-1 text-xs text-[#6B7B8D]">{option.count} votes</p>
              </div>
            ))}
          </div>
          {interaction.type === 'quiz' && (
            <div className="mt-6 border-t border-[#E2EBE6] pt-5">
              <p className="text-sm font-bold text-[#17172F]">Correct answer</p>
              <p className="mt-1 text-[#16833A]">{correct?.option_text || 'Not selected'}</p>
              <div className="mt-5 space-y-2">
                <p className="text-sm font-bold text-[#17172F]">Leaderboard</p>
                {responses
                  .slice()
                  .sort((a, b) => Number(b.interaction_options?.is_correct) - Number(a.interaction_options?.is_correct))
                  .slice(0, 5)
                  .map((response, index) => (
                    <div key={response.id} className="flex items-center justify-between rounded-[8px] bg-[#F6F8F7] px-3 py-2 text-sm">
                      <span>
                        {index + 1}. {response.participants?.display_name || 'Anonymous'}
                      </span>
                      <span className={response.interaction_options?.is_correct ? 'text-[#16833A]' : 'text-[#6B7B8D]'}>
                        {response.interaction_options?.is_correct ? 'Correct' : 'Answered'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (interaction.type === 'word_cloud') {
    const words = Array.isArray(payload?.results) ? payload.results : [];
    return (
      <div className={`${presentationMode ? 'min-h-[66vh] p-3' : 'min-h-[430px] p-5'} rounded-[8px] border border-[#E2EBE6] bg-white shadow-sm`}>
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="animate-[qrSlideIn_500ms_ease-out] lg:sticky lg:top-4 lg:self-start">
            <EventQRCode event={event} />
          </div>
          <AnimatedWordCloud responses={responses} fallbackWords={words} presentationMode={presentationMode} />
        </div>
        <style jsx>{`
          @keyframes qrSlideIn {
            from {
              opacity: 0;
              transform: translateX(-14px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    );
  }

  if (interaction.type === 'qa') {
    return (
      <div className="rounded-[8px] border border-[#E2EBE6] bg-white">
        {questions.length ? (
          questions.map(question => (
            <div key={question.id} className="border-b border-[#E2EBE6] p-5 last:border-b-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {question.is_pinned && <span className="rounded-full bg-[#FFF3D8] px-2 py-0.5 text-xs font-bold text-[#9A6500]">Pinned</span>}
                    <span className="text-sm text-[#6B7B8D]">{question.participants?.display_name || 'Anonymous'} · {formatTime(question.created_at)}</span>
                  </div>
                  <p className="mt-2 text-[24px] font-bold text-[#17172F]">{question.question_text}</p>
                </div>
                <span className="rounded-full bg-[#EAF7EF] px-3 py-1 text-sm font-bold text-[#16833A]">
                  {question.qa_upvotes?.length || 0} upvotes
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="p-12 text-center text-xl font-semibold text-[#6B7B8D]">Waiting for questions...</p>
        )}
      </div>
    );
  }

  const kind = (interaction.config as Record<string, any>)?.poll_kind;
  if (kind === 'rating') {
    const maxScale = Number((interaction.config as Record<string, any>)?.max_scale || 5);
    const distribution = Array.from({ length: maxScale }, (_, index) => {
      const score = index + 1;
      const count = responses.filter(response => Number(response.rating_value) === score).length;
      return { score, count };
    });
    const average = payload?.results?.average_rating || 0;

    return (
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="rounded-[8px] border border-[#E2EBE6] bg-white p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#6B7B8D]">Average score</p>
          <p className="mt-4 text-[76px] font-extrabold text-[#16833A]">{average}</p>
          <p className="text-[#6B7B8D]">from {payload?.results?.rating_count || 0} ratings</p>
        </div>
        <div className="rounded-[8px] border border-[#E2EBE6] bg-white p-6">
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="score" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#16833A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const textResponses = payload?.results?.text_responses || responses
    .filter(response => response.text_value)
    .map(response => ({
      text: response.text_value,
      display_name: response.participants?.display_name || 'Anonymous',
      submitted_at: response.submitted_at,
    }));

  return (
    <div className="rounded-[8px] border border-[#E2EBE6] bg-white">
      {textResponses.length ? (
        textResponses.slice().reverse().map((response: any, index: number) => (
          <div key={`${response.submitted_at}-${index}`} className="border-b border-[#E2EBE6] p-5 last:border-b-0">
            <p className="text-sm text-[#6B7B8D]">{response.display_name || 'Anonymous'}</p>
            <p className="mt-2 text-[24px] font-bold text-[#17172F]">{response.text}</p>
          </div>
        ))
      ) : (
        <p className="p-12 text-center text-xl font-semibold text-[#6B7B8D]">Waiting for responses...</p>
      )}
    </div>
  );
}
