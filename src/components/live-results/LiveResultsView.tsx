'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  option_id?: string | null;
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
  preferredInteractionId?: string;
  slidesOnly?: boolean;
  publicMode?: boolean;
};

type PresentationTheme = 'dark' | 'light';
type CloudWord = {
  id: string;
  text: string;
  count: number;
  latestAt: number;
  firstSeen: number;
  value: number;
  isNewest: boolean;
};

type PlacedCloudWord = CloudWord & {
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
};

type WordBox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
  return 'Open Text';
}

function interactionWasAddedToSlides(interaction: LiveInteraction) {
  const config = (interaction.config || {}) as Record<string, any>;
  return Boolean(
    config.google_slides_slide_id ||
      config.powerpoint_slide_id ||
      config.powerpoint_added_to_presentation
  );
}

function compactTitle(value: string, fallback = 'Untitled interaction') {
  const text = value?.trim() || fallback;
  return text.length > 42 ? `${text.slice(0, 39)}...` : text;
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

function boxesOverlap(a: WordBox, b: WordBox, gap: number) {
  return !(
    a.right + gap < b.left ||
    a.left - gap > b.right ||
    a.bottom + gap < b.top ||
    a.top - gap > b.bottom
  );
}

function rotatedBox(centerX: number, centerY: number, width: number, height: number, rotation: number): WordBox {
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  const rotatedWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const rotatedHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));

  return {
    left: centerX - rotatedWidth / 2,
    right: centerX + rotatedWidth / 2,
    top: centerY - rotatedHeight / 2,
    bottom: centerY + rotatedHeight / 2,
  };
}

function normalizeWord(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildCloudWords(responses: JoinedResponse[], fallbackWords: any[], tick: number): CloudWord[] {
  const responseWords = responses
    .map((response, index) => {
      const text = response.text_value?.trim() || '';
      const normalized = normalizeWord(text);
      if (!normalized) return null;

      return {
        id: response.id || `response-${index}-${normalized}`,
        text,
        normalized,
        latestAt: response.submitted_at ? new Date(response.submitted_at).getTime() : Date.now(),
        firstSeen: index,
      };
    })
    .filter(Boolean) as Array<{ id: string; text: string; normalized: string; latestAt: number; firstSeen: number }>;

  const fallbackExpanded =
    responseWords.length > 0
      ? []
      : fallbackWords.flatMap((entry: any, index: number) => {
          const label = entry.word || entry.text || entry.text_value || '';
          const normalized = normalizeWord(label);
          if (!normalized) return [];

          const count = Math.max(1, Math.floor(Number(entry.count || entry.value || 1)));
          const fallbackTimestamp =
            entry.submitted_at || entry.created_at
              ? new Date(entry.submitted_at || entry.created_at).getTime()
              : Date.now() - index * 60_000;

          return Array.from({ length: count }, (_, copyIndex) => ({
            id: `fallback-${index}-${copyIndex}-${normalized}`,
            text: label,
            normalized,
            latestAt: fallbackTimestamp - copyIndex * 1_000,
            firstSeen: index + copyIndex / 100,
          }));
        });

  const entries = [...responseWords, ...fallbackExpanded];
  const frequency = entries.reduce((map, entry) => {
    map.set(entry.normalized, (map.get(entry.normalized) || 0) + 1);
    return map;
  }, new Map<string, number>());

  const newestTimestamp = Math.max(...entries.map(word => word.latestAt), 0);
  const now = Date.now() + tick;

  return entries
    .map(word => {
      const minutesOld = Math.max(0, (now - word.latestAt) / 60_000);
      const ageFactor = Math.max(1, 10 - minutesOld);
      const count = frequency.get(word.normalized) || 1;
      const frequencyFactor = Math.log2(count + 1) * 26;
      const recencyFactor = ageFactor * 4.5;
      const value = 18 + recencyFactor + frequencyFactor;
      return {
        id: word.id,
        text: word.text,
        count,
        latestAt: word.latestAt,
        firstSeen: word.firstSeen,
        value,
        isNewest: word.latestAt === newestTimestamp,
      };
    })
    .sort((a, b) => b.value - a.value || b.latestAt - a.latestAt || a.firstSeen - b.firstSeen);
}

function layoutCloudWords({
  words,
  width,
  height,
  presentationMode,
}: {
  words: CloudWord[];
  width: number;
  height: number;
  presentationMode: boolean;
}): PlacedCloudWord[] {
  if (!words.length || width <= 0 || height <= 0) return [];

  const padding = presentationMode ? 28 : 18;
  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);
  const maxValue = Math.max(...words.map(word => word.value), 1);
  const densityScale = words.length > 22 ? clamp(Math.sqrt(22 / words.length), 0.46, 1) : 1;
  const areaScale = clamp(Math.sqrt((usableWidth * usableHeight) / (presentationMode ? 360_000 : 220_000)), 0.82, 1.35);
  const centerX = width / 2;
  const centerY = height / 2;
  const aspectX = clamp(usableWidth / Math.max(usableHeight, 1), 1, 1.95);
  const aspectY = clamp(usableHeight / Math.max(usableWidth, 1), 0.72, 1.08);
  const anchors = [
    { x: centerX, y: centerY },
    { x: padding + usableWidth * 0.28, y: padding + usableHeight * 0.34 },
    { x: padding + usableWidth * 0.72, y: padding + usableHeight * 0.64 },
    { x: padding + usableWidth * 0.74, y: padding + usableHeight * 0.32 },
    { x: padding + usableWidth * 0.28, y: padding + usableHeight * 0.68 },
    { x: padding + usableWidth * 0.5, y: padding + usableHeight * 0.2 },
    { x: padding + usableWidth * 0.5, y: padding + usableHeight * 0.82 },
    { x: padding + usableWidth * 0.14, y: padding + usableHeight * 0.5 },
    { x: padding + usableWidth * 0.86, y: padding + usableHeight * 0.5 },
  ];
  const sortedWords = words
    .slice()
    .sort((a, b) => b.value - a.value || b.latestAt - a.latestAt || a.firstSeen - b.firstSeen);
  const globalScaleAttempts = [1, 0.88, 0.76, 0.64, 0.54, 0.46, 0.38, 0.32, 0.27, 0.23, 0.2];

  for (const globalScale of globalScaleAttempts) {
    const placed: Array<PlacedCloudWord & { box: WordBox }> = [];
    const gap = Math.max(2, (presentationMode ? 14 : 10) * globalScale);
    let failed = false;

    sortedWords.forEach((word, index) => {
      if (failed) return;
      const seed = hashText(word.text);
      const rotation = globalScale < 0.46 ? 0 : index < 2 ? 0 : ((seed % 31) - 15);
      const normalized = word.value / maxValue;
      const rankWeight = 1 - index / Math.max(1, sortedWords.length - 1);
      const visualWeight = clamp(
        Math.pow(normalized, 1.35) * 0.72 + Math.pow(rankWeight, 1.6) * 0.24 + (word.isNewest ? 0.14 : 0),
        0.08,
        1
      );
      const minSize = presentationMode ? 20 : 18;
      const maxSize = presentationMode ? 96 : 78;
      const desiredSize = clamp(
        (minSize + visualWeight * (maxSize - minSize)) * densityScale * areaScale * globalScale,
        globalScale < 0.38 ? 9 : presentationMode ? 18 : 14,
        maxSize
      );

      const scaleAttempts = [1, 0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.45, 0.38, 0.32];
      let placedWord: (PlacedCloudWord & { box: WordBox }) | null = null;

      for (const scale of scaleAttempts) {
        const fontSize = Math.max(10, desiredSize * scale);
        const estimatedWidth = Math.max(fontSize * 1.6, word.text.length * fontSize * 0.62);
        const estimatedHeight = fontSize * 1.15;
        const angleOffset = (seed % 360) * (Math.PI / 180);

        for (let attempt = 0; attempt < 2200; attempt += 1) {
          const anchor = anchors[attempt % anchors.length];
          const localAttempt = Math.floor(attempt / anchors.length);
          const angle = angleOffset + localAttempt * 0.55 + index * 0.13;
          const radius = localAttempt === 0 ? 0 : 7.4 * Math.sqrt(localAttempt);
          const x = anchor.x + Math.cos(angle) * radius * aspectX;
          const y = anchor.y + Math.sin(angle) * radius * aspectY;
          const box = rotatedBox(x, y, estimatedWidth, estimatedHeight, rotation);
          const inside =
            box.left >= padding &&
            box.right <= width - padding &&
            box.top >= padding &&
            box.bottom <= height - padding;

          if (!inside) continue;
          if (placed.some(item => boxesOverlap(box, item.box, gap))) continue;

          placedWord = {
            ...word,
            x,
            y,
            fontSize,
            rotation,
            color: wordCloudColors[index % wordCloudColors.length],
            box,
          };
          break;
        }

        if (placedWord) break;
      }

      if (placedWord) {
        placed.push(placedWord);
      } else {
        failed = true;
      }
    });

    if (!failed && placed.length === sortedWords.length) {
      return placed.map(({ box: _box, ...word }) => word);
    }
  }

  const columns = Math.ceil(Math.sqrt(sortedWords.length * (usableWidth / Math.max(usableHeight, 1))));
  const rows = Math.ceil(sortedWords.length / Math.max(columns, 1));
  const cellWidth = usableWidth / Math.max(columns, 1);
  const cellHeight = usableHeight / Math.max(rows, 1);

  return sortedWords.map((word, index) => {
    const seed = hashText(word.id);
    const col = index % columns;
    const row = Math.floor(index / columns);
    const maxCellFont = Math.min(cellHeight * 0.62, cellWidth / Math.max(1.6, word.text.length * 0.62));
    const valueWeight = word.value / maxValue;
    const fontSize = clamp(maxCellFont * (0.72 + valueWeight * 0.5), 8, presentationMode ? 58 : 42);
    const jitterX = ((seed % 13) - 6) * Math.min(2, cellWidth * 0.02);
    const jitterY = (((seed >> 4) % 13) - 6) * Math.min(2, cellHeight * 0.02);

    return {
      ...word,
      x: padding + col * cellWidth + cellWidth / 2 + jitterX,
      y: padding + row * cellHeight + cellHeight / 2 + jitterY,
      fontSize,
      rotation: 0,
      color: wordCloudColors[index % wordCloudColors.length],
    };
  });
}

function EventQRCode({
  event,
  variant = 'light',
  compact = false,
  presentation = false,
}: {
  event: Event | null;
  variant?: 'light' | 'dark';
  compact?: boolean;
  presentation?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const publicUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const publicUrlReady = Boolean(publicUrl && !isLocalUrl(publicUrl));
  const eventCode = event?.event_code || '';
  const joinLink = publicUrlReady && eventCode ? `${publicUrl}/join?code=${encodeURIComponent(eventCode)}` : '';
  const qrSrc = eventCode && publicUrlReady ? `/api/qrcode?code=${encodeURIComponent(eventCode)}&format=svg&v=${event?.id || eventCode}` : '';
  const isDark = variant === 'dark';
  const qrSizeClass = presentation ? 'h-[220px] w-[220px]' : compact ? 'h-24 w-24' : 'h-40 w-40';

  useEffect(() => {
    if (!expanded) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const copyJoinLink = async () => {
    if (!joinLink) return;
    await navigator.clipboard?.writeText(joinLink);
  };

  return (
    <>
      <div
        className={`transition-all duration-500 ${
          isDark
            ? 'rounded-[22px] border border-white/15 bg-white/10 text-white shadow-[0_0_45px_rgba(22,131,58,0.25)] backdrop-blur-xl'
            : 'rounded-[14px] border border-[#DDEAE3] bg-white/85 text-[#17172F] shadow-sm backdrop-blur'
        } ${presentation ? 'p-5' : compact ? 'p-3' : 'p-5'}`}
      >
        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? 'text-emerald-200' : 'text-[#16833A]'}`}>
          Join live
        </p>
        <button
          type="button"
          onClick={() => qrSrc && setExpanded(true)}
          className={`${compact ? 'mt-2 p-2' : 'mt-4 p-3'} block rounded-[12px] border transition hover:scale-[1.02] ${
            isDark ? 'border-emerald-300/30 bg-white shadow-[0_0_30px_rgba(74,222,128,0.26)]' : 'border-[#DDEAE3] bg-white'
          }`}
          aria-label="Enlarge event QR code"
        >
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSrc} alt={`Join event ${eventCode}`} className={qrSizeClass} />
          ) : (
            <div className={`${qrSizeClass} grid place-items-center text-center text-xs text-[#6B7B8D]`}>
              Public URL required
            </div>
          )}
        </button>
        <p className={`${compact ? 'mt-2 text-xs' : 'mt-4 text-sm'} ${presentation ? 'text-base' : ''} font-semibold ${isDark ? 'text-slate-200' : 'text-[#6B7B8D]'}`}>
          Scan QR code to join the event
        </p>
        <div className={`${compact ? 'mt-2 px-2 py-1 text-xl' : 'mt-3 px-3 py-2 text-2xl'} rounded-[10px] border text-center ${presentation ? 'text-4xl' : ''} font-black tracking-wide ${
          isDark ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : 'border-[#CFE0D7] bg-[#EAF7EF] text-[#16833A]'
        }`}>
          #{eventCode || '------'}
        </div>
        <p className={`${compact ? 'mt-2 max-w-[130px] text-[10px]' : 'mt-3 max-w-[190px] text-xs'} ${presentation ? 'max-w-[245px] text-sm' : ''} break-words ${isDark ? 'text-slate-300' : 'text-[#6B7B8D]'}`}>
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
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
          role="presentation"
        >
          <div
            className="relative max-h-[calc(100vh-32px)] w-full max-w-[620px] rounded-[24px] bg-white p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Event QR code"
          >
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[#DDEAE3] bg-white text-xl font-bold text-[#6B7B8D] shadow-sm transition hover:bg-[#F6F8F7] hover:text-[#17172F]"
              aria-label="Close enlarged QR code"
            >
              ×
            </button>
            {qrSrc && (
              <div className="mx-auto mt-5 w-fit rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(221,234,227,0.9)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt={`Join event ${eventCode}`}
                  className="h-[min(66vh,520px)] w-[min(82vw,520px)] max-w-full object-contain"
                />
              </div>
            )}
            <p className="mt-4 text-center text-4xl font-black text-[#16833A]">#{eventCode}</p>
            <p className="mx-auto mt-2 max-w-[540px] break-all text-center text-sm font-semibold text-[#6B7B8D]">{joinLink}</p>
          </div>
        </div>
      )}
    </>
  );
}

function JoinBanner({ event, variant = 'light', presentation = false }: { event: Event | null; variant?: 'light' | 'dark'; presentation?: boolean }) {
  const publicUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const displayDomain = publicUrl ? new URL(publicUrl).hostname.replace(/^www\./, '') : 'slide-engage.com';
  const eventCode = event?.event_code || '------';
  const isDark = variant === 'dark';

  return (
    <div
      className={`rounded-full text-center font-semibold shadow-sm backdrop-blur ${
        isDark
          ? 'border border-white/10 bg-black/28 text-white shadow-2xl'
          : 'border border-[#DDEAE3] bg-[#EAF7EF]/80 text-[#17172F]'
      } ${presentation ? 'px-6 py-3 text-base md:px-8 md:py-4 md:text-3xl' : 'px-3 py-1.5 text-xs md:text-sm'}`}
    >
      <span className="mr-2 text-[#16833A]">✣</span>
      Join at <span className="font-black text-[#16833A]">{displayDomain}</span> and enter code{' '}
      <span className={`${presentation ? 'text-[1.15em]' : ''} font-black text-[#16833A]`}>{eventCode}</span>
    </div>
  );
}

function LiveResultFrame({
  event,
  presentationMode,
  children,
  layoutKey,
}: {
  event: Event | null;
  presentationMode: boolean;
  children: ReactNode;
  layoutKey?: string;
}) {
  return (
    <div className={`h-full min-h-0 rounded-[8px] border shadow-sm ${
      presentationMode ? 'border-white/10 bg-white/5 p-3' : 'border-[#E2EBE6] bg-white p-3'
    }`}>
      <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]">
        <div className="min-h-0 animate-[qrSlideIn_500ms_ease-out] overflow-hidden">
          <EventQRCode event={event} variant={presentationMode ? 'dark' : 'light'} compact={!presentationMode} presentation={presentationMode} />
        </div>
        <div key={layoutKey} className="flex min-w-0 min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            {children}
          </div>
          <div className="mx-auto mt-2 max-w-3xl shrink-0">
            <JoinBanner event={event} variant={presentationMode ? 'dark' : 'light'} />
          </div>
        </div>
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

function AnimatedWordCloud({
  cloudWords,
  presentationMode,
  theme = 'light',
}: {
  cloudWords: CloudWord[];
  presentationMode: boolean;
  theme?: PresentationTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateDimensions = () => {
      const rect = element.getBoundingClientRect();
      setDimensions({
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placedWords = useMemo(
    () => layoutCloudWords({ words: cloudWords, width: dimensions.width, height: dimensions.height, presentationMode }),
    [cloudWords, dimensions.height, dimensions.width, presentationMode]
  );

  useEffect(() => {
    const missingCount = Math.max(0, cloudWords.length - placedWords.length);
    console.log('[SlideEngage] Word cloud layout', {
      processedCloudWords: cloudWords.length,
      renderedWords: placedWords.length,
      missingCount,
      missingReason: missingCount ? 'layout fallback failed to place every word' : 'none',
      container: dimensions,
      presentationMode,
    });
  }, [cloudWords.length, dimensions, placedWords.length, presentationMode]);

  if (!cloudWords.length) {
    return (
      <div className={`grid h-full min-h-[260px] place-items-center rounded-[8px] ${
        theme === 'dark' ? 'bg-white/5 text-slate-200' : 'bg-[#F7FBF9] text-[#6B7B8D]'
      }`}>
        <p className="text-center text-xl font-semibold">Results will appear below</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative z-10 mx-auto h-full min-h-[260px] w-full overflow-hidden rounded-[8px] ${
      theme === 'dark'
        ? 'bg-transparent'
        : 'bg-gradient-to-br from-white via-[#F7FBF9] to-[#EEF7F1]'
    }`}>
      <div className={`pointer-events-none absolute inset-0 ${
        theme === 'dark'
          ? 'bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.18),transparent_48%)]'
          : 'bg-[radial-gradient(circle_at_center,rgba(22,131,58,0.12),transparent_48%)]'
      }`} />
      {placedWords.map((word, index) => {
        return (
          <span
            key={word.id}
            className="absolute whitespace-nowrap font-black leading-none transition-[left,top,font-size,opacity] duration-700 ease-out"
            style={{
              left: `${word.x}px`,
              top: `${word.y}px`,
              color: word.color,
              fontSize: `${word.fontSize}px`,
              opacity: 1,
              transform: `translate(-50%, -50%) rotate(${word.rotation}deg)`,
              textShadow: theme === 'dark'
                ? word.isNewest
                  ? '0 0 34px rgba(52, 211, 153, 0.72), 0 14px 34px rgba(0, 0, 0, 0.42)'
                  : '0 14px 34px rgba(0, 0, 0, 0.42)'
                : word.isNewest
                  ? '0 0 26px rgba(22, 131, 58, 0.45)'
                  : '0 10px 30px rgba(15, 23, 42, 0.10)',
              zIndex: Math.max(1, 80 - index),
            }}
          >
            <span
              className={`inline-block ${word.isNewest ? 'animate-[wordPop_760ms_cubic-bezier(.2,1.2,.4,1)]' : ''}`}
            >
              {word.text}
            </span>
          </span>
        );
      })}
      <style jsx>{`
        @keyframes wordPop {
          0% {
            opacity: 0;
            transform: scale(0.72);
            filter: blur(6px);
          }
          70% {
            opacity: 1;
            transform: scale(1.08);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

function FullscreenPresentation({
  event,
  interaction,
  cloudWords,
  onExit,
  publicMode,
  theme,
  onToggleTheme,
}: {
  event: Event | null;
  interaction: LiveInteraction;
  cloudWords: CloudWord[];
  onExit: () => void;
  publicMode: boolean;
  theme: PresentationTheme;
  onToggleTheme: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [showControls, setShowControls] = useState(true);
  const [fullscreenResponses, setFullscreenResponses] = useState<JoinedResponse[]>([]);
  const [fullscreenFallbackWords, setFullscreenFallbackWords] = useState<any[]>([]);
  const [fullscreenTick, setFullscreenTick] = useState(0);
  const isDark = theme === 'dark';

  const loadFullscreenData = useCallback(async () => {
    const [resultResponse, responseResult] = await Promise.all([
      fetch(`/api/results?interaction_id=${interaction.id}`, { cache: 'no-store' }),
      supabase
        .from('responses')
        .select('*, participants(display_name), interaction_options(option_text,is_correct)')
        .eq('interaction_id', interaction.id)
        .order('submitted_at', { ascending: true }),
    ]);

    const resultData = resultResponse.ok ? await resultResponse.json().catch(() => ({})) : {};
    const nextFallbackWords = Array.isArray(resultData?.results) ? resultData.results : [];

    if (resultResponse.ok) {
      setFullscreenFallbackWords(nextFallbackWords);
    }

    setFullscreenResponses((responseResult.data || []) as JoinedResponse[]);

    if (responseResult.error) {
      console.error('[SlideEngage] Unable to load fullscreen responses', responseResult.error.message);
    }
  }, [interaction.id, supabase]);

  useEffect(() => {
    loadFullscreenData();
  }, [loadFullscreenData]);

  useEffect(() => {
    const interval = window.setInterval(() => setFullscreenTick(value => value + 1), 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`fullscreen-word-cloud-${interaction.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'responses', filter: `interaction_id=eq.${interaction.id}` },
        () => loadFullscreenData()
      )
      .on('broadcast', { event: 'response_inserted' }, payload => {
        if (payload.payload?.interaction_id === interaction.id) {
          loadFullscreenData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interaction.id, loadFullscreenData, supabase]);

  const fetchedCloudWords = useMemo(
    () => buildCloudWords(fullscreenResponses, fullscreenFallbackWords, fullscreenTick),
    [fullscreenFallbackWords, fullscreenResponses, fullscreenTick]
  );
  const fullscreenCloudWords = cloudWords.length ? cloudWords : fetchedCloudWords;
  const wordCloudKey = `${interaction.id}-${fullscreenCloudWords.map(word => `${word.id}:${word.count}`).join('|')}-${theme}`;

  useEffect(() => {
    console.log('[SlideEngage] Fullscreen word cloud data', {
      interactionId: interaction.id,
      parentCloudWords: cloudWords.length,
      fullscreenResponses: fullscreenResponses.length,
      fullscreenFallbackWords: fullscreenFallbackWords.length,
      fetchedCloudWords: fetchedCloudWords.length,
      renderedSourceCloudWords: fullscreenCloudWords.length,
    });
  }, [
    cloudWords.length,
    fetchedCloudWords.length,
    fullscreenCloudWords.length,
    fullscreenFallbackWords.length,
    fullscreenResponses.length,
    interaction.id,
  ]);

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
    <div className={`relative min-h-[calc(100vh-64px)] overflow-hidden rounded-[18px] p-7 transition-colors md:p-10 ${
      isDark ? 'bg-[#08130D] text-white' : 'bg-gradient-to-br from-white via-[#F7FBF9] to-[#EAF7EF] text-[#17172F]'
    }`}>
      <div className={`absolute inset-0 ${
        isDark
          ? 'bg-[radial-gradient(circle_at_20%_30%,rgba(34,197,94,0.24),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(45,212,191,0.18),transparent_26%),radial-gradient(circle_at_68%_78%,rgba(139,92,246,0.18),transparent_30%)]'
          : 'bg-[radial-gradient(circle_at_24%_24%,rgba(22,131,58,0.14),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(45,212,191,0.12),transparent_26%),radial-gradient(circle_at_66%_78%,rgba(139,92,246,0.10),transparent_30%)]'
      }`} />
      <div className="absolute left-12 top-16 h-2 w-2 animate-[particleFloat_8s_ease-in-out_infinite] rounded-full bg-emerald-300/70" />
      <div className="absolute right-28 top-28 h-3 w-3 animate-[particleFloat_10s_ease-in-out_infinite] rounded-full bg-cyan-300/60" />
      <div className="absolute bottom-28 right-1/3 h-2 w-2 animate-[particleFloat_9s_ease-in-out_infinite] rounded-full bg-violet-300/60" />

      <div className={`absolute right-6 top-6 z-20 flex gap-2 transition ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <button
          type="button"
          onClick={onToggleTheme}
          className={`rounded-full border px-4 py-2 text-sm font-bold backdrop-blur ${
            isDark ? 'border-white/15 bg-white/10 text-white' : 'border-[#CFE0D7] bg-white/70 text-[#16833A]'
          }`}
        >
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        {!publicMode && (
          <button
            type="button"
            onClick={onExit}
            className={`rounded-full border px-4 py-2 text-sm font-bold backdrop-blur ${
              isDark ? 'border-white/15 bg-white/10 text-white' : 'border-[#CFE0D7] bg-white/70 text-[#16833A]'
            }`}
          >
            Exit Fullscreen
          </button>
        )}
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-120px)] flex-col gap-8">
        <div>
          <div className={`flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-[0.18em] ${
            isDark ? 'text-emerald-200' : 'text-[#16833A]'
          }`}>
            <span>Live Word Cloud</span>
            <span className={`rounded-full px-5 py-2 text-3xl font-black tracking-wide ${
              isDark ? 'bg-white/10 text-emerald-200' : 'bg-white/80 text-[#16833A] shadow-sm'
            }`}>#{event?.event_code}</span>
          </div>
          <h1 className={`mt-4 max-w-6xl text-[40px] font-black leading-tight md:text-[64px] ${
            isDark ? 'text-white' : 'text-[#17172F]'
          }`}>{interaction.title}</h1>
        </div>

        <div className="grid min-h-[62vh] flex-1 items-stretch gap-7 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="self-start lg:self-center">
            <EventQRCode event={event} variant={theme} presentation />
          </div>
          <AnimatedWordCloud
            key={wordCloudKey}
            cloudWords={fullscreenCloudWords}
            presentationMode
            theme={theme}
          />
        </div>
      </div>

      <div className="absolute inset-x-6 bottom-5 z-20">
        <JoinBanner event={event} variant={theme} presentation />
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

export default function LiveResultsView({
  event: initialEvent = null,
  eventCode,
  preferredInteractionId,
  slidesOnly = false,
  publicMode = false,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<Event | null>(initialEvent);
  const [liveInteractions, setLiveInteractions] = useState<LiveInteraction[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<LiveInteraction | null>(null);
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [responses, setResponses] = useState<JoinedResponse[]>([]);
  const [questions, setQuestions] = useState<JoinedQuestion[]>([]);
  const [loading, setLoading] = useState(Boolean(eventCode && !initialEvent));
  const [resultsLoading, setResultsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenTheme, setFullscreenTheme] = useState<PresentationTheme>('dark');
  const [wordCloudTick, setWordCloudTick] = useState(0);
  const [layoutTick, setLayoutTick] = useState(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
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

      const rows = ((data || []) as LiveInteraction[]).filter(row => {
        if (row.status === 'archived') return false;
        if ((row as any).deleted_at || (row as any).archived_at || (row as any).is_deleted) return false;
        return slidesOnly ? interactionWasAddedToSlides(row) : true;
      });
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
    [slidesOnly, supabase]
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
        setResultsLoading(false);
        setPayload(null);
        setResponses([]);
        setQuestions([]);
        return;
      }

      setResultsLoading(true);
      try {
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
      } finally {
        setResultsLoading(false);
      }
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
    loadLiveInteractions(event.id, preferredInteractionId);
  }, [event?.id, loadLiveInteractions, preferredInteractionId]);

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

  useEffect(() => {
    const interval = window.setInterval(() => setWordCloudTick(value => value + 1), 3000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;

    let frame = 0;
    const updateLayout = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setLayoutTick(value => value + 1));
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeInteraction?.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLayoutTick(value => value + 1));
    return () => window.cancelAnimationFrame(frame);
  }, [activeInteraction?.id, payload, responses.length, questions.length]);

  const enterFullscreen = async () => {
    setIsFullscreen(true);
    if (activeInteraction) {
      loadResults(activeInteraction);
    }
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

  const selectInteraction = useCallback((interaction: LiveInteraction) => {
    setActiveInteraction(interaction);
  }, []);

  const moveInteraction = useCallback(
    (direction: 1 | -1) => {
      if (!liveInteractions.length || !activeInteraction) return;
      const currentIndex = liveInteractions.findIndex(interaction => interaction.id === activeInteraction.id);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = (safeIndex + direction + liveInteractions.length) % liveInteractions.length;
      setActiveInteraction(liveInteractions[nextIndex]);
    },
    [activeInteraction, liveInteractions]
  );

  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveInteraction(-1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveInteraction(1);
      }

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (isFullscreen) {
          exitFullscreen();
        } else {
          enterFullscreen();
        }
      }

      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault();
        exitFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enterFullscreen, exitFullscreen, isFullscreen, moveInteraction]);

  const fallbackWords = useMemo(() => (Array.isArray(payload?.results) ? payload.results : []), [payload?.results]);
  const cloudWords = useMemo(
    () => buildCloudWords(responses, fallbackWords, wordCloudTick),
    [fallbackWords, responses, wordCloudTick]
  );

  useEffect(() => {
    const validResponseCount = responses.filter(response => response.text_value?.trim()).length;
    console.log('[SlideEngage] Word cloud data', {
      totalResponses: responses.length,
      validTextResponses: validResponseCount,
      fallbackWords: fallbackWords.length,
      processedCloudWords: cloudWords.length,
      filteredResponses: responses.length - validResponseCount,
      filteredReason: responses.length - validResponseCount ? 'empty or missing text_value' : 'none',
      isFullscreen,
      publicMode,
    });
  }, [cloudWords.length, fallbackWords.length, isFullscreen, publicMode, responses]);

  const content = renderResultContent({
    event,
    interaction: activeInteraction,
    payload,
    responses,
    questions,
    cloudWords,
    presentationMode: isFullscreen || publicMode,
    loading: resultsLoading,
    layoutKey: `${activeInteraction?.id || 'none'}-${layoutTick}`,
  });

  const shellClass = isFullscreen
    ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0F172A] p-4 text-white transition-colors md:p-5'
    : publicMode
      ? 'flex h-screen flex-col overflow-hidden bg-[#0F172A] p-4 text-white transition-colors md:p-5'
      : 'flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[#E2EBE6] bg-white p-3 shadow-sm';

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
      <div ref={shellRef} className={shellClass}>
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
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          )}
        </div>
        <div className="mt-8 text-center">
          <p className={`text-[20px] font-semibold ${isFullscreen || publicMode ? 'text-slate-100' : 'text-[#6B7B8D]'}`}>
            {slidesOnly
              ? 'No generated Google Slides interactions are live yet.'
              : 'Waiting for lecturer to start an interaction.'}
          </p>
        </div>
      </div>
    );
  }

  if (isFullscreen && activeInteraction.type === 'word_cloud') {
    return (
      <div className={shellClass}>
        <FullscreenPresentation
          event={event}
          interaction={activeInteraction}
          cloudWords={cloudWords}
          onExit={exitFullscreen}
          publicMode={publicMode}
          theme={fullscreenTheme}
          onToggleTheme={() => setFullscreenTheme(current => (current === 'dark' ? 'light' : 'dark'))}
        />
      </div>
    );
  }

  return (
    <div ref={shellRef} className={shellClass}>
      {liveInteractions.length > 0 && (
        <div
          className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
            isFullscreen || publicMode
              ? '-mx-4 -mt-4 mb-1.5 border-white/10 bg-[#0F172A]/88 px-3 py-1.5 md:-mx-5 md:-mt-5 md:px-4'
              : '-mx-3 -mt-3 mb-2 border-[#E2EBE6] bg-white/92 px-3 py-1.5'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5">
              {liveInteractions.map(item => {
                const isActive = activeInteraction.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectInteraction(item)}
                    className={`min-w-[150px] max-w-[210px] rounded-[8px] border px-2.5 py-1.5 text-left transition ${
                      isActive
                        ? isFullscreen || publicMode
                          ? 'border-emerald-300/60 bg-emerald-300/15 text-emerald-100 shadow-[0_0_28px_rgba(45,212,191,0.16)]'
                          : 'border-[#16833A] bg-[#EAF7EF] text-[#16833A] shadow-sm'
                        : isFullscreen || publicMode
                          ? 'border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/40 hover:bg-white/10'
                          : 'border-[#E2EBE6] bg-white text-[#17172F] hover:border-[#16833A]'
                    }`}
                    aria-label={`Show live results for ${item.title}`}
                    title={item.title}
                  >
                    <div className="truncate text-xs font-extrabold">{compactTitle(item.title)}</div>
                    <div className={`mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
                      isActive
                        ? isFullscreen || publicMode
                          ? 'text-emerald-100'
                          : 'text-[#16833A]'
                        : isFullscreen || publicMode
                          ? 'text-slate-400'
                          : 'text-[#6B7B8D]'
                    }`}>
                      <span>{interactionLabel(item)}</span>
                      <span>•</span>
                      <span className={item.status === 'live' ? 'text-[#22C55E]' : ''}>{item.status}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className={`shrink-0 rounded-[8px] px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                isFullscreen || publicMode
                  ? 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
                  : 'bg-[#16833A] text-white hover:bg-[#116C31]'
              }`}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title="F"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
          <p className={`mt-0.5 text-[10px] ${isFullscreen || publicMode ? 'text-slate-400' : 'text-[#6B7B8D]'}`}>
            Use ← / → to switch interactions, F for fullscreen, ESC to exit fullscreen.
          </p>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#DFF5E7] px-2.5 py-0.5 text-xs font-bold text-[#16833A]">Live</span>
            <span className={isFullscreen || publicMode ? 'text-slate-300' : 'text-[#6B7B8D]'}>
              {interactionLabel(activeInteraction)} · #{event?.event_code}
            </span>
          </div>
          <h1 className={`line-clamp-2 max-w-5xl font-extrabold leading-tight ${isFullscreen || publicMode ? 'mt-1 text-[24px] text-white md:text-[34px]' : 'mt-1 text-[18px] text-[#17172F] md:text-[24px]'}`}>
            {activeInteraction.title}
          </h1>
          {liveInteractions.length > 1 && !publicMode && (
            <p className={isFullscreen || publicMode ? 'mt-1 text-xs text-slate-300' : 'mt-1 text-xs text-[#6B7B8D]'}>
              {liveInteractions.length} live interactions in this event.
            </p>
          )}
        </div>

        {!publicMode && liveInteractions.length === 0 && (
          <button
            type="button"
            onClick={isFullscreen ? exitFullscreen : enterFullscreen}
            className="rounded-[8px] bg-[#16833A] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#116C31]"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        )}
      </div>

      <div className={isFullscreen || publicMode ? 'mt-2 min-h-0 flex-1' : 'mt-2 min-h-0 flex-1'}>{content}</div>
    </div>
  );
}

function renderResultContent({
  event,
  interaction,
  payload,
  responses,
  questions,
  cloudWords,
  presentationMode,
  loading,
  layoutKey,
}: {
  event: Event | null;
  interaction: LiveInteraction | null;
  payload: ResultPayload | null;
  responses: JoinedResponse[];
  questions: JoinedQuestion[];
  cloudWords: CloudWord[];
  presentationMode: boolean;
  loading: boolean;
  layoutKey: string;
}) {
  if (!interaction) return null;

  if (loading && !payload) {
    return (
      <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-[minmax(180px,240px)_minmax(0,1fr)]">
        <div className="rounded-[12px] border border-[#E2EBE6] bg-[#F7FBF9] p-3">
          <div className="h-28 rounded-[10px] bg-[#E6EEE9]" />
          <div className="mt-3 h-7 rounded-full bg-[#E6EEE9]" />
          <div className="mt-2 h-4 rounded bg-[#E6EEE9]" />
        </div>
        <div className="rounded-[12px] border border-[#E2EBE6] bg-white p-4">
          <div className="h-6 w-1/3 rounded bg-[#E6EEE9]" />
          <div className="mt-4 h-12 rounded bg-[#E6EEE9]" />
          <div className="mt-3 h-12 rounded bg-[#E6EEE9]" />
          <div className="mt-3 h-12 rounded bg-[#E6EEE9]" />
        </div>
      </div>
    );
  }

  if (payload?.hidden) {
    return (
      <div className="rounded-[8px] border border-dashed border-[#CFE0D7] p-10 text-center text-xl font-semibold text-[#6B7B8D]">
        Results are hidden.
      </div>
    );
  }

  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    const optionRows =
      interaction.interaction_options?.length
        ? interaction.interaction_options
        : payload?.interaction?.interaction_options || [];
    const apiResults = Array.isArray(payload?.results) ? payload.results : [];
    const responseVoteCount = responses.filter(response => response.option_id).length;
    const totalResponses = responseVoteCount || payload?.total_responses || 0;
    const chartData = optionRows.length
      ? optionRows
          .slice()
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
          .map((option: any) => {
            const apiOption = apiResults.find((item: any) => item.option_id === option.id);
            const liveCount = responseVoteCount
              ? responses.filter(response => response.option_id === option.id).length
              : Number(apiOption?.count || 0);
            return {
              option_id: option.id,
              option_text: option.option_text || apiOption?.option_text || 'Option',
              is_correct: Boolean(option.is_correct || apiOption?.is_correct),
              count: liveCount,
              percentage: totalResponses > 0 ? Math.round((liveCount / totalResponses) * 100) : 0,
            };
          })
      : apiResults;
    const correct = chartData.find((option: any) => option.is_correct);

    return (
      <LiveResultFrame event={event} presentationMode={presentationMode} layoutKey={layoutKey}>
        <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-rows-[minmax(0,0.58fr)_minmax(0,1fr)]">
          <div className={`grid min-h-0 grid-cols-[minmax(120px,180px)_minmax(0,1fr)] gap-3 overflow-hidden rounded-[18px] p-3 shadow-sm ${
            presentationMode ? 'border border-white/10 bg-white' : 'border border-[#E2EBE6] bg-white'
          }`}>
            <div className="grid min-h-0 place-items-center rounded-[14px] bg-[#F6F8F7] p-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6B7B8D]">Responses</p>
              <p className="mt-1 text-5xl font-black text-[#16833A]">{totalResponses}</p>
              <p className="mt-1 text-xs font-bold text-[#6B7B8D]">{interaction.type === 'quiz' ? 'answers' : 'votes'}</p>
            </div>
          <div className={`min-h-0 rounded-[18px] p-3 shadow-sm ${
            presentationMode ? 'bg-white' : 'bg-white'
          }`}>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 6, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    dataKey="option_text"
                    type="category"
                    width={140}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: string) => compactTitle(value, 'Option').slice(0, 20)}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={entry.option_id || index} fill={entry.is_correct ? '#16833A' : chartColors[index % chartColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full min-h-[140px] place-items-center rounded-[14px] bg-[#F6F8F7] p-6 text-center text-base font-bold text-[#6B7B8D]">
                Waiting for responses...
              </div>
            )}
          </div>
          </div>

          <div className="grid min-h-0 gap-2 overflow-hidden rounded-[18px] border border-[#E2EBE6] bg-white/95 p-3 text-[#17172F] shadow-sm">
            {chartData.length ? (
              chartData.slice(0, 6).map((option: any, index: number) => (
                <div key={option.option_id || `${option.option_text}-${index}`} className="min-h-0 rounded-[12px] bg-[#F6F8F7] px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-sm font-black">
                    <span className="truncate">{option.option_text}</span>
                    <span className="shrink-0 text-lg text-[#16833A]">{option.percentage || 0}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#DDEBE3]">
                    <div
                      className="h-full rounded-full bg-[#16833A] transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, Number(option.percentage || 0)))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-[#6B7B8D]">{option.count || 0} votes</p>
                </div>
              ))
            ) : (
              <div className="grid place-items-center text-center text-base font-bold text-[#6B7B8D]">
                Waiting for responses...
              </div>
            )}
          </div>
          {interaction.type === 'quiz' && (
            <div className="hidden">
              <p className="text-sm font-bold text-[#17172F]">Correct answer</p>
              <p className="mt-1 text-[#16833A]">{correct?.option_text || 'Not selected'}</p>
              <div className="mt-2 space-y-2">
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
      </LiveResultFrame>
    );
  }

  if (interaction.type === 'word_cloud') {
    return (
      <LiveResultFrame event={event} presentationMode={presentationMode} layoutKey={layoutKey}>
        <AnimatedWordCloud cloudWords={cloudWords} presentationMode={presentationMode} />
      </LiveResultFrame>
    );
  }

  if (interaction.type === 'qa') {
    return (
      <LiveResultFrame event={event} presentationMode={presentationMode} layoutKey={layoutKey}>
        <div className="h-full min-h-0 overflow-hidden rounded-[8px] border border-[#E2EBE6] bg-white">
          {questions.length ? (
            questions.slice(0, 6).map(question => (
              <div key={question.id} className="border-b border-[#E2EBE6] p-4 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {question.is_pinned && <span className="rounded-full bg-[#FFF3D8] px-2 py-0.5 text-xs font-bold text-[#9A6500]">Pinned</span>}
                      <span className="truncate text-xs text-[#6B7B8D]">{question.participants?.display_name || 'Anonymous'} · {formatTime(question.created_at)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[18px] font-bold text-[#17172F]">{question.question_text}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EAF7EF] px-3 py-1 text-sm font-bold text-[#16833A]">
                    {question.qa_upvotes?.length || 0} upvotes
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="grid h-full place-items-center p-8 text-center text-xl font-semibold text-[#6B7B8D]">Waiting for questions...</p>
          )}
        </div>
      </LiveResultFrame>
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
      <LiveResultFrame event={event} presentationMode={presentationMode} layoutKey={layoutKey}>
        <div className="grid h-full min-h-0 gap-3 overflow-hidden lg:grid-cols-[190px_minmax(0,1fr)]">
          <div className="rounded-[8px] border border-[#E2EBE6] bg-white p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6B7B8D]">Average score</p>
            <p className="mt-3 text-[58px] font-extrabold text-[#16833A]">{average}</p>
            <p className="text-sm text-[#6B7B8D]">from {payload?.results?.rating_count || 0} ratings</p>
          </div>
          <div className="min-h-0 rounded-[8px] border border-[#E2EBE6] bg-white p-4">
            <ResponsiveContainer width="100%" height="100%">
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
      </LiveResultFrame>
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
    <LiveResultFrame event={event} presentationMode={presentationMode} layoutKey={layoutKey}>
      <div className="h-full min-h-0 overflow-hidden rounded-[8px] border border-[#E2EBE6] bg-white">
        {textResponses.length ? (
          textResponses.slice().reverse().slice(0, 7).map((response: any, index: number) => (
            <div key={`${response.submitted_at}-${index}`} className="border-b border-[#E2EBE6] p-4 last:border-b-0">
              <p className="text-xs text-[#6B7B8D]">{response.display_name || 'Anonymous'}</p>
              <p className="mt-1 line-clamp-2 text-[18px] font-bold text-[#17172F]">{response.text}</p>
            </div>
          ))
        ) : (
          <p className="grid h-full place-items-center p-8 text-center text-xl font-semibold text-[#6B7B8D]">Waiting for responses...</p>
        )}
      </div>
    </LiveResultFrame>
  );
}
