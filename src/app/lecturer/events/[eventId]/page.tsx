'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { launchInteraction } from '@/lib/realtime/socket';
import type { Event, Interaction, InteractionOption, InteractionType } from '@/lib/types';

type InteractionKind =
  | 'qa'
  | 'multiple_choice'
  | 'word_cloud'
  | 'open_text'
  | 'rating'
  | 'quiz';

type Template = {
  kind: InteractionKind;
  type: InteractionType;
  title: string;
  label: string;
  icon: string;
  accent: string;
  preview: string;
  description: string;
};

type DraftState = {
  question: string;
  options: string[];
  correctIndex: number;
  config: {
    allowMultipleAnswers: boolean;
    wordLimit: number;
    allowDuplicateWords: boolean;
    characterLimit: number;
    anonymousMode: boolean;
    paragraphAnswer: boolean;
    upvotes: boolean;
    moderation: boolean;
    anonymousQuestions: boolean;
    voting: boolean;
    categoryTags: boolean;
    ratingMode: 'star' | 'emoji' | 'number';
    maxScale: number;
    timer: number;
    points: number;
    leaderboard: boolean;
  };
};

type SavedInteraction = Interaction & {
  interaction_options?: InteractionOption[];
};

const templates: Template[] = [
  {
    kind: 'multiple_choice',
    type: 'poll',
    title: 'Multiple choice',
    label: 'Multiple choice',
    icon: '☑',
    accent: '#1A6BB5',
    preview: 'bars',
    description: 'Ask a question with answer options and live results.',
  },
  {
    kind: 'open_text',
    type: 'feedback',
    title: 'Open text',
    label: 'Open text',
    icon: '▤',
    accent: '#087F7A',
    preview: 'text',
    description: 'Collect free-text responses from participants.',
  },
  {
    kind: 'word_cloud',
    type: 'word_cloud',
    title: 'Word cloud',
    label: 'Word cloud',
    icon: '☁',
    accent: '#7B3F98',
    preview: 'cloud',
    description: 'Collect short words and visualize them live.',
  },
  {
    kind: 'rating',
    type: 'feedback',
    title: 'Rating',
    label: 'Rating',
    icon: '☆',
    accent: '#A86C00',
    preview: 'rating',
    description: 'Capture a score with stars, emoji, or numbers.',
  },
  {
    kind: 'quiz',
    type: 'quiz',
    title: 'Quiz',
    label: 'Quiz',
    icon: '♕',
    accent: '#D95F02',
    preview: 'quiz',
    description: 'Run a scored quiz with a correct answer.',
  },
  {
    kind: 'qa',
    type: 'qa',
    title: 'Audience Q&A',
    label: 'Audience Q&A',
    icon: '☷',
    accent: '#D92D20',
    preview: 'qa',
    description: 'Collect, moderate, and upvote audience questions.',
  },
];

const optionKinds: InteractionKind[] = ['multiple_choice', 'quiz'];
const SIDEBAR_COLLAPSE_KEY = 'slideengage_interactions_sidebar_collapsed';

function formatRange(event: Event | null) {
  if (!event) return '';
  const start = event.start_date || event.created_at?.slice(0, 10);
  const end = event.end_date || event.start_date || event.created_at?.slice(0, 10);
  if (!start) return 'No date';
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();
  const month = startDate.toLocaleDateString('en-US', { month: 'long' });
  const shortStart = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const shortEnd = endDate.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (start === end) return startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  if (sameMonth) return `${month} ${startDate.getDate()} – ${endDate.getDate()}, ${endDate.getFullYear()}`;
  return `${shortStart} – ${shortEnd}`;
}

function baseDraft(template: Template): DraftState {
  const needsOptions = optionKinds.includes(template.kind);
  return {
    question: '',
    options: needsOptions ? ['', ''] : [],
    correctIndex: 0,
    config: {
      allowMultipleAnswers: false,
      wordLimit: 3,
      allowDuplicateWords: false,
      characterLimit: 280,
      anonymousMode: true,
      paragraphAnswer: true,
      upvotes: true,
      moderation: false,
      anonymousQuestions: true,
      voting: true,
      categoryTags: false,
      ratingMode: 'star',
      maxScale: 5,
      timer: 30,
      points: 1000,
      leaderboard: true,
    },
  };
}

function Preview({ kind, accent }: { kind: string; accent: string }) {
  if (kind === 'bars' || kind === 'rank') {
    return (
      <div className="space-y-3">
        {[75, 30, 58, 22].map((width, index) => (
          <div key={index} className="h-2 rounded-full bg-[#E2E2E2]">
            <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: accent }} />
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'cloud') {
    return (
      <div className="relative h-full">
        <span className="absolute left-10 top-7 h-5 w-16 rounded bg-[#A45BC0]" />
        <span className="absolute left-28 top-6 h-6 w-16 rounded bg-[#ECD7F5]" />
        <span className="absolute left-16 top-14 h-8 w-24 rounded bg-[#7B3F98]" />
        <span className="absolute left-3 top-15 h-5 w-12 rounded bg-[#E5E5E5]" />
        <span className="absolute left-36 top-16 h-6 w-12 rounded bg-[#A45BC0]" />
      </div>
    );
  }

  if (kind === 'quiz') {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(row => (
          <div key={row} className={`h-6 rounded ${row === 1 ? 'bg-[#F06A00]' : 'bg-[#E0E0E0]'}`} />
        ))}
      </div>
    );
  }

  if (kind === 'rating') {
    return (
      <div className="flex items-end gap-3">
        {[8, 28, 52, 52, 86].map((height, index) => (
          <div key={index} className="w-7 rounded bg-[#D8D8D8]" style={{ height }} />
        ))}
        <div className="w-7 rounded bg-[#E5AC00]" style={{ height: 100 }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-8 rounded-md" style={{ backgroundColor: accent }} />
      <div className="space-y-2">
        <div className="h-3 w-4/5 rounded bg-[#CFCFCF]" />
        <div className="h-3 w-3/5 rounded bg-[#CFCFCF]" />
        <div className="h-3 w-2/3 rounded bg-[#E4E4E4]" />
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#555] transition hover:bg-[#F1F1F1] focus:outline-none focus:ring-2 focus:ring-[#168A3A]/25 ${className}`}
    >
      {children}
    </button>
  );
}

function PollActionMenu({
  onSelect,
  onDivider,
  onDuplicate,
  onDirectLink,
  onReset,
  onDelete,
}: {
  onSelect: () => void;
  onDivider: () => void;
  onDuplicate: () => void;
  onDirectLink: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-[10px] border border-[#E7E7E7] bg-white py-1 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
      <MenuButton icon="☑" label="Select" onClick={onSelect} />
      <MenuButton icon="—" label="Add a divider below" onClick={onDivider} />
      <div className="my-1 h-px bg-[#EFEFEF]" />
      <MenuButton icon="⧉" label="Duplicate" onClick={onDuplicate} />
      <MenuButton icon="↗" label="Direct link" onClick={onDirectLink} />
      <MenuButton icon="↺" label="Reset results" onClick={onReset} />
      <div className="my-1 h-px bg-[#EFEFEF]" />
      <MenuButton icon="🗑" label="Delete" onClick={onDelete} danger />
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#F7F7F7] ${
        danger ? 'font-semibold text-[#D92D20]' : 'text-[#333]'
      }`}
    >
      <span className="flex w-5 justify-center text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function EventBuilderPage() {
  const params = useParams<{ eventId: string }>();
  const router = useRouter();
  const { lecturer, loading: authLoading, selectEvent } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [interactions, setInteractions] = useState<SavedInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [autoSaveState, setAutoSaveState] = useState<'saved' | 'saving'>('saved');
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const sidebarContentRef = useRef<HTMLDivElement | null>(null);
  const sidebarScrollTopRef = useRef(0);
  const sidebarStateReadyRef = useRef(false);

  const eventId = params.eventId;

  useEffect(() => {
    if (!authLoading && !lecturer) router.push('/lecturer/login');
  }, [authLoading, lecturer, router]);

  useEffect(() => {
    if (!lecturer || !eventId) return;
    fetchWorkspace();
  }, [lecturer, eventId]);

  useEffect(() => {
    if (!selectedTemplate || !draft || !eventId) return;
    setAutoSaveState('saving');
    const timer = window.setTimeout(() => {
      localStorage.setItem(draftKey(selectedTemplate.kind), JSON.stringify(draft));
      setAutoSaveState('saved');
    }, 450);
    return () => window.clearTimeout(timer);
  }, [draft, selectedTemplate, eventId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const stored = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);

    setSidebarCollapsed(stored === null ? mediaQuery.matches : stored === 'true');
    sidebarStateReadyRef.current = true;

    const handleResize = () => {
      if (mediaQuery.matches) {
        setSidebarCollapsed(true);
        return;
      }

      const nextStored = localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      setSidebarCollapsed(nextStored === 'true');
    };

    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  useEffect(() => {
    if (!sidebarStateReadyRef.current) return;
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(sidebarCollapsed));

    if (!sidebarCollapsed && sidebarContentRef.current) {
      requestAnimationFrame(() => {
        if (sidebarContentRef.current) {
          sidebarContentRef.current.scrollTop = sidebarScrollTopRef.current;
        }
      });
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!openMenuId) return;

    function closeMenu(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-poll-menu]')) return;
      setOpenMenuId(null);
    }

    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [openMenuId]);

  function draftKey(kind: InteractionKind) {
    return `slideengage_interaction_draft_${eventId}_${kind}`;
  }

  async function fetchWorkspace() {
    setLoading(true);
    const eventRes = await fetch(`/api/events?id=${eventId}`, { cache: 'no-store' });
    const eventData = await eventRes.json();
    if (eventData.event) {
      setEvent(eventData.event);
      selectEvent(eventData.event);
    }

    const interactionRes = await fetch(`/api/interactions?event_id=${eventId}`, { cache: 'no-store' });
    const interactionData = await interactionRes.json();
    setInteractions(interactionData.interactions || []);
    setLoading(false);
  }

  function openEditor(template: Template) {
    if (event?.status === 'archived') {
      setStatus('Restore this event before adding interactions.');
      return;
    }

    const stored = typeof window !== 'undefined' ? localStorage.getItem(draftKey(template.kind)) : null;
    setSelectedTemplate(template);
    setDraft(stored ? JSON.parse(stored) : baseDraft(template));
    setShowTemplates(false);
    setStatus('');
  }

  function updateDraft(updater: (current: DraftState) => DraftState) {
    setDraft(current => current ? updater(current) : current);
  }

  function toggleSidebar() {
    if (!sidebarCollapsed && sidebarContentRef.current) {
      sidebarScrollTopRef.current = sidebarContentRef.current.scrollTop;
    }
    setSidebarCollapsed(value => !value);
  }

  function updateConfig<K extends keyof DraftState['config']>(key: K, value: DraftState['config'][K]) {
    updateDraft(current => ({ ...current, config: { ...current.config, [key]: value } }));
  }

  function addOption() {
    updateDraft(current => ({ ...current, options: [...current.options, ''] }));
  }

  function updateOption(index: number, value: string) {
    updateDraft(current => ({
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? value : option),
    }));
  }

  function removeOption(index: number) {
    updateDraft(current => {
      const nextOptions = current.options.filter((_, optionIndex) => optionIndex !== index);
      return {
        ...current,
        options: nextOptions,
        correctIndex: Math.min(current.correctIndex, Math.max(nextOptions.length - 1, 0)),
      };
    });
  }

  const validation = useMemo(() => {
    if (!selectedTemplate || !draft) return { valid: false, reason: 'Choose an interaction type.' };
    if (event?.status !== 'live') return { valid: false, reason: 'Make this event active before starting an interaction.' };
    const question = draft.question.trim();
    if (!question) return { valid: false, reason: 'Question is required.' };

    if (selectedTemplate.kind === 'multiple_choice') {
      if (draft.options.filter(option => option.trim()).length < 2) return { valid: false, reason: 'Add at least 2 options.' };
    }

    if (selectedTemplate.kind === 'quiz') {
      if (draft.options.filter(option => option.trim()).length < 2) return { valid: false, reason: 'Add at least 2 quiz options.' };
      if (!draft.options[draft.correctIndex]?.trim()) return { valid: false, reason: 'Select a filled correct answer.' };
    }

    return { valid: true, reason: 'Ready to start.' };
  }, [draft, event?.status, selectedTemplate]);

  async function startInteraction() {
    if (!event || !selectedTemplate || !draft || !validation.valid) return;
    if (event.status === 'archived') {
      setStatus('Restore this event before adding interactions.');
      return;
    }
    if (event.status !== 'live') {
      setStatus('Make this event active before starting an interaction.');
      return;
    }

    setPublishing(true);
    setStatus('');
    const cleanOptions = optionKinds.includes(selectedTemplate.kind)
      ? draft.options
          .map((option, index) => ({ option_text: option.trim(), is_correct: selectedTemplate.kind === 'quiz' && index === draft.correctIndex }))
          .filter(option => option.option_text)
      : undefined;

    const config = {
      poll_kind: selectedTemplate.kind,
      allow_multiple_answers: draft.config.allowMultipleAnswers,
      max_words_per_participant: draft.config.wordLimit,
      allow_duplicate_words: draft.config.allowDuplicateWords,
      character_limit: draft.config.characterLimit,
      anonymous_mode: draft.config.anonymousMode,
      paragraph_answer: draft.config.paragraphAnswer,
      upvotes_enabled: draft.config.upvotes,
      moderation_enabled: draft.config.moderation,
      replies_enabled: false,
      labels_enabled: draft.config.categoryTags,
      downvotes_enabled: false,
      allow_anonymous_questions: draft.config.anonymousQuestions,
      voting_enabled: draft.config.voting,
      category_tags: draft.config.categoryTags,
      rating_mode: draft.config.ratingMode,
      max_scale: draft.config.maxScale,
      time_limit_seconds: draft.config.timer,
      points: draft.config.points,
      leaderboard: draft.config.leaderboard,
      results_visible: true,
      show_respondent_names: false,
      poll_description_enabled: false,
    };

    const createRes = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: event.id,
        type: selectedTemplate.type,
        title: draft.question.trim(),
        config,
        options: cleanOptions,
      }),
    });
    const createData = await createRes.json();

    if (!createRes.ok) {
      setStatus(createData.error || 'Unable to create interaction.');
      setPublishing(false);
      return;
    }

    const publishRes = await fetch('/api/interactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createData.interaction.id, status: 'live' }),
    });
    const publishData = await publishRes.json();
    setPublishing(false);

    if (!publishRes.ok) {
      setStatus(publishData.error || 'Interaction saved as draft, but could not be started.');
      setInteractions(prev => [...prev, createData.interaction]);
      return;
    }

    localStorage.removeItem(draftKey(selectedTemplate.kind));
    setInteractions(prev => [
      ...prev,
      publishData.interaction,
    ]);
    launchInteraction(event.event_code, publishData.interaction.id);
    setStatus(`${selectedTemplate.label} started.`);
    setSelectedTemplate(null);
    setDraft(null);
    setShowTemplates(false);
  }

  function interactionConfig(item: SavedInteraction) {
    return (item.config || {}) as Record<string, any>;
  }

  function updateInteractionInList(nextInteraction: SavedInteraction) {
    setInteractions(prev => prev.map(item => item.id === nextInteraction.id ? nextInteraction : item));
  }

  async function patchInteraction(id: string, updates: Record<string, unknown>) {
    const res = await fetch('/api/interactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unable to update interaction.');
    return data.interaction as SavedInteraction;
  }

  async function patchInteractionConfig(item: SavedInteraction, configUpdates: Record<string, unknown>) {
    const nextConfig = { ...interactionConfig(item), ...configUpdates };
    const nextInteraction = await patchInteraction(item.id, { config: nextConfig });
    updateInteractionInList(nextInteraction);
    return nextInteraction;
  }

  async function toggleResults(item: SavedInteraction) {
    try {
      const current = interactionConfig(item).results_visible ?? true;
      await patchInteractionConfig(item, { results_visible: !current });
      setStatus(!current ? 'Results are visible.' : 'Results are hidden.');
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function toggleVoting(item: SavedInteraction) {
    try {
      const current = interactionConfig(item).voting_open ?? true;
      await patchInteractionConfig(item, { voting_open: !current });
      setStatus(!current ? 'Voting is open.' : 'Voting is closed.');
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function startPoll(item: SavedInteraction) {
    if (!event) return;
    if (event.status !== 'live') {
      setStatus('Make this event active before starting an interaction.');
      return;
    }
    try {
      const nextInteraction = await patchInteraction(item.id, { status: 'live' });
      setInteractions(prev => prev.map(current => {
        if (current.id === nextInteraction.id) return nextInteraction;
        return current;
      }));
      launchInteraction(event.event_code, item.id);
      setStatus(`${item.title} is live.`);
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function selectPoll(item: SavedInteraction) {
    try {
      const updates = interactions.map(current => {
        const config = { ...interactionConfig(current), selected: current.id === item.id };
        return patchInteraction(current.id, { config });
      });
      const nextInteractions = await Promise.all(updates);
      setInteractions(prev => prev.map(current => nextInteractions.find(next => next.id === current.id) || current));
      setOpenMenuId(null);
      setStatus(`${item.title} selected.`);
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function addDividerBelow(item: SavedInteraction) {
    try {
      await patchInteractionConfig(item, { divider_below: !interactionConfig(item).divider_below });
      setOpenMenuId(null);
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function duplicatePoll(item: SavedInteraction) {
    try {
      const config = { ...interactionConfig(item), selected: false, divider_below: false, vote_count: 0 };
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: item.event_id,
          type: item.type,
          title: `${item.title} copy`,
          config,
          options: (item.interaction_options || [])
            .sort((a, b) => a.position - b.position)
            .map(option => ({ option_text: option.option_text, is_correct: option.is_correct })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to duplicate interaction.');
      setInteractions(prev => [...prev, data.interaction]);
      setOpenMenuId(null);
      setStatus('Interaction duplicated.');
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function copyDirectLink(item: SavedInteraction) {
    if (!event) return;
    const origin = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
    await navigator.clipboard.writeText(`${origin}/join?code=${event.event_code}`);
    setOpenMenuId(null);
    setStatus('Direct link copied.');
  }

  async function resetResults(item: SavedInteraction) {
    if (!window.confirm('Reset all votes for this interaction?')) return;
    try {
      const res = await fetch(`/api/responses?interaction_id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reset results.');
      await patchInteractionConfig(item, { vote_count: 0 });
      setOpenMenuId(null);
      setStatus('Results reset.');
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  async function deletePoll(item: SavedInteraction) {
    if (!window.confirm('Delete this interaction?')) return;
    try {
      const res = await fetch(`/api/interactions?id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to delete interaction.');
      setInteractions(prev => prev.filter(current => current.id !== item.id));
      setOpenMenuId(null);
      setStatus('Interaction deleted.');
    } catch (error: any) {
      setStatus(error.message);
    }
  }

  const qaInteraction = useMemo(() => interactions.find(item => item.type === 'qa'), [interactions]);
  const qaTemplate = useMemo(() => templates.find(template => template.kind === 'qa') || templates[templates.length - 1], []);

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer || !event) return null;

  return (
    <main className="h-screen overflow-hidden bg-white text-[#1A1A2E]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#E5E5E5] px-6">
        <div className="flex items-center gap-5">
          <button onClick={() => router.push('/lecturer/events')} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E2E2E2] text-xl">
            ←
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF7EF] text-sm font-extrabold text-[#2D8A4E]">
              {event.event_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="max-w-[260px] truncate text-base font-extrabold">{event.event_name}</div>
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm font-semibold text-[#5F5F5F]">
          <button
            onClick={() => router.push(`/lecturer/events/${event.id}/settings`)}
            className="rounded-[8px] px-2 py-1 transition hover:bg-[#F4F7F4] hover:text-[#168A3A]"
            title="Edit event settings"
          >
            ▣ {formatRange(event)}
          </button>
          <span className="h-6 w-px bg-[#E2E2E2]" />
          <span># {event.event_code}</span>
          <span>♢ Public</span>
          <button className="rounded-[8px] border border-[#168A3A] px-4 py-2 font-bold text-[#168A3A]">⌯ Share</button>
          <button className="rounded-[8px] border border-[#168A3A] px-4 py-2 font-bold text-[#168A3A]">▻ Present</button>
          <button className="text-xl text-[#168A3A]">...</button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-76px)]">
        <aside className="flex w-[76px] flex-col items-center justify-between border-r border-[#E5E5E5] py-6">
          <div className="flex flex-col gap-7">
            <button className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7EF] text-[#168A3A]">▤</button>
            <button className="text-[#555]">↗</button>
            <button onClick={() => router.push(`/lecturer/events/${event.id}/settings`)} className="text-[#555]">⚙</button>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E2E2E2]">?</button>
        </aside>

        <aside
          className={`relative shrink-0 overflow-visible border-r border-[#E5E5E5] bg-[#FAFAFA] transition-[width,padding] duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-10 px-0 py-0' : 'w-[360px] px-6 py-8'
          }`}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="group absolute -right-4 top-8 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-[#DADADA] bg-white text-sm font-bold text-[#555] shadow-sm transition hover:border-[#BDBDBD] hover:bg-[#F7F7F7] focus:outline-none focus:ring-2 focus:ring-[#168A3A]/25"
          >
            {sidebarCollapsed ? '≫' : '≪'}
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1A1A2E] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100">
              {sidebarCollapsed ? 'Expand sidebar' : 'Minimize sidebar'}
            </span>
          </button>

          <div
            ref={sidebarContentRef}
            className={`h-full overflow-y-auto transition-opacity duration-200 ${
              sidebarCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            aria-hidden={sidebarCollapsed}
          >
            <div className="mb-7 flex items-center justify-between">
              <h1 className="text-lg font-bold">My interactions</h1>
            </div>
            <div className="mb-8 flex gap-2">
              <button
                onClick={() => {
                  if (event.status === 'archived') {
                    setStatus('Restore this event before adding interactions.');
                    return;
                  }
                  setShowTemplates(true);
                  setSelectedTemplate(null);
                  setDraft(null);
                }}
                disabled={event.status === 'archived'}
                className="rounded-[9px] bg-[#168A3A] px-5 py-3 text-sm font-bold text-white"
              >
                + Add
              </button>
              <button
                onClick={() => {
                  setShowTemplates(true);
                  setSelectedTemplate(null);
                  setDraft(null);
                }}
                className="rounded-[9px] border border-[#E2E2E2] bg-white px-5 py-3 text-sm font-bold"
              >
                ▦ Templates
              </button>
            </div>

            <section className="mb-8">
              <h2 className="mb-3 text-sm font-bold text-[#5F5F5F]">Audience Q&A</h2>
              <button
                onClick={() => qaInteraction ? setStatus('Audience Q&A already exists.') : openEditor(qaTemplate)}
                className="flex w-full items-center justify-between rounded-[10px] border border-[#E2E2E2] bg-white p-4 text-left transition hover:border-[#168A3A]"
              >
                <span className="flex items-center gap-3 text-sm text-[#777]">
                  <span className="text-2xl">☷</span>
                  Add Q&A to collect questions from your audience
                </span>
                <span className="font-bold text-[#168A3A]">{qaInteraction ? 'Added' : 'Add'}</span>
              </button>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-bold text-[#5F5F5F]">Polls</h2>
              {interactions.filter(item => item.type !== 'qa').length === 0 ? (
                <p className="py-4 text-center text-sm text-[#777]">Your interactions will appear here</p>
              ) : (
                <div className="space-y-3">
                  {interactions.filter(item => item.type !== 'qa').map(item => {
                    const config = interactionConfig(item);
                    const resultsVisible = config.results_visible ?? true;
                    const votingOpen = config.voting_open ?? true;
                    const selected = config.selected ?? false;
                    const dividerBelow = config.divider_below ?? false;
                    const voteCount = config.vote_count ?? 0;

                    return (
                      <div key={item.id}>
                        <div className={`rounded-[10px] border bg-white p-4 transition ${selected ? 'border-[#168A3A] shadow-[0_0_0_1px_rgba(22,138,58,0.15)]' : 'border-[#E2E2E2]'}`}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold">{item.title}</div>
                              <div className="mt-2 flex items-center gap-2 text-xs capitalize text-[#777]">
                                <span>{String(config.poll_kind || item.type).replaceAll('_', ' ')}</span>
                                <span>•</span>
                                <span>{voteCount} votes</span>
                                {item.status === 'live' && <span className="rounded-full bg-[#EAF7EF] px-2 py-0.5 font-bold text-[#168A3A]">Live</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#F0F0F0] pt-3">
                            <div className="flex items-center gap-1">
                              <IconButton
                                label={resultsVisible ? 'Hide results' : 'Show results'}
                                onClick={() => toggleResults(item)}
                              >
                                {resultsVisible ? '◉' : '◎'}
                              </IconButton>
                              <IconButton
                                label={votingOpen ? 'Close voting' : 'Open voting'}
                                onClick={() => toggleVoting(item)}
                              >
                                {votingOpen ? '🔓' : '🔒'}
                              </IconButton>
                            </div>

                            <div className="flex items-center gap-1">
                              <IconButton
                                label="Start poll"
                                onClick={() => startPoll(item)}
                                className="bg-[#168A3A] text-white hover:bg-[#0f6f2d]"
                              >
                                ▶
                              </IconButton>
                              <div className="relative" data-poll-menu>
                                <IconButton
                                  label="More actions"
                                  onClick={() => setOpenMenuId(current => current === item.id ? null : item.id)}
                                >
                                  ⋯
                                </IconButton>
                                {openMenuId === item.id && (
                                  <PollActionMenu
                                    onSelect={() => selectPoll(item)}
                                    onDivider={() => addDividerBelow(item)}
                                    onDuplicate={() => duplicatePoll(item)}
                                    onDirectLink={() => copyDirectLink(item)}
                                    onReset={() => resetResults(item)}
                                    onDelete={() => deletePoll(item)}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {dividerBelow && <div className="my-3 h-px bg-[#DADADA]" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </aside>

        <section className="flex-1 overflow-y-auto bg-white p-8">
          {status && (
            <div className="mb-4 rounded-[9px] border border-[#BFE5CB] bg-[#EAF7EF] px-4 py-3 text-sm font-semibold text-[#168A3A]">
              {status}
            </div>
          )}

          {selectedTemplate && draft ? (
            <InteractionEditor
              template={selectedTemplate}
              draft={draft}
              validation={validation}
              autoSaveState={autoSaveState}
              publishing={publishing}
              onBack={() => {
                setSelectedTemplate(null);
                setDraft(null);
                setShowTemplates(true);
              }}
              onStart={startInteraction}
              onQuestionChange={value => updateDraft(current => ({ ...current, question: value }))}
              onOptionChange={updateOption}
              onOptionAdd={addOption}
              onOptionRemove={removeOption}
              onCorrectIndexChange={value => updateDraft(current => ({ ...current, correctIndex: value }))}
              onConfigChange={updateConfig}
            />
          ) : (
            <>
              <div className="mb-6 rounded-[12px] bg-[#F2F0FF] px-6 py-4 text-sm text-[#1A1A2E]">
                Share your objectives and we&apos;ll generate interactions for you.
              </div>

              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold">{showTemplates ? 'Choose an interaction' : 'My interactions'}</h1>
                  <p className="mt-1 text-sm text-[#777]">Select a type to open its editor and configure what participants need to answer.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {templates.map(template => (
                  <button
                    key={template.label}
                    onClick={() => openEditor(template)}
                    className="overflow-hidden rounded-[12px] border border-[#DCDCDC] bg-white text-left transition hover:-translate-y-0.5 hover:border-[#168A3A] hover:shadow-sm"
                  >
                    <div className="h-[145px] bg-[#F4F4F4] p-10">
                      <Preview kind={template.preview} accent={template.accent} />
                    </div>
                    <div className="border-t border-[#E5E5E5] px-6 py-5">
                      <div className="mb-2 flex items-center gap-4">
                        <span className="text-2xl" style={{ color: template.accent }}>{template.icon}</span>
                        <span className="text-lg font-bold">{template.label}</span>
                      </div>
                      <p className="text-xs leading-5 text-[#777]">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function InteractionEditor({
  template,
  draft,
  validation,
  autoSaveState,
  publishing,
  onBack,
  onStart,
  onQuestionChange,
  onOptionChange,
  onOptionAdd,
  onOptionRemove,
  onCorrectIndexChange,
  onConfigChange,
}: {
  template: Template;
  draft: DraftState;
  validation: { valid: boolean; reason: string };
  autoSaveState: 'saved' | 'saving';
  publishing: boolean;
  onBack: () => void;
  onStart: () => void;
  onQuestionChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onOptionAdd: () => void;
  onOptionRemove: (index: number) => void;
  onCorrectIndexChange: (index: number) => void;
  onConfigChange: <K extends keyof DraftState['config']>(key: K, value: DraftState['config'][K]) => void;
}) {
  return (
    <div className="grid min-h-[calc(100vh-140px)] grid-cols-1 gap-6 xl:grid-cols-[minmax(420px,1fr)_420px]">
      <div className="rounded-[14px] border border-[#E5E5E5] bg-white">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
          <button onClick={onBack} className="text-sm font-bold text-[#168A3A]">← Templates</button>
          <span className="text-xs font-semibold text-[#777]">{autoSaveState === 'saving' ? 'Saving draft...' : 'Draft saved'}</span>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4F7F4] text-2xl" style={{ color: template.accent }}>{template.icon}</span>
            <div>
              <h1 className="text-2xl font-extrabold">{template.label}</h1>
              <p className="text-sm text-[#777]">{template.description}</p>
            </div>
          </div>

          <label className="mb-6 block">
            <span className="mb-2 block text-sm font-bold">Question *</span>
            <textarea
              value={draft.question}
              onChange={e => onQuestionChange(e.target.value)}
              rows={3}
              placeholder="Ask your audience anything"
              className="w-full resize-none rounded-[10px] border border-[#DCDCDC] px-4 py-3 text-base outline-none transition focus:border-[#168A3A] focus:ring-2 focus:ring-[#EAF7EF]"
            />
          </label>

          <DynamicFields
            template={template}
            draft={draft}
            onOptionChange={onOptionChange}
            onOptionAdd={onOptionAdd}
            onOptionRemove={onOptionRemove}
            onCorrectIndexChange={onCorrectIndexChange}
            onConfigChange={onConfigChange}
          />

          <details className="mt-8 rounded-[10px] border border-[#E5E5E5] bg-[#FAFAFA] p-4">
            <summary className="cursor-pointer text-sm font-bold">Poll settings</summary>
            <div className="mt-4 grid gap-3 text-sm text-[#666]">
              <div>Status: Draft until Start is clicked</div>
              <div>Validation: {validation.reason}</div>
              <div>Preview updates while you type</div>
            </div>
          </details>

          <div className="mt-8 flex items-center justify-between">
            <p className={`text-sm font-semibold ${validation.valid ? 'text-[#168A3A]' : 'text-[#D92D20]'}`}>{validation.reason}</p>
            <button
              onClick={onStart}
              disabled={!validation.valid || publishing}
              className="rounded-[10px] bg-[#168A3A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0f6f2d] disabled:cursor-not-allowed disabled:bg-[#C9D7CE]"
            >
              {publishing ? 'Starting...' : template.kind === 'qa' ? 'Start Q&A' : 'Start interaction'}
            </button>
          </div>
        </div>
      </div>

      <LivePreview template={template} draft={draft} />
    </div>
  );
}

function DynamicFields({
  template,
  draft,
  onOptionChange,
  onOptionAdd,
  onOptionRemove,
  onCorrectIndexChange,
  onConfigChange,
}: {
  template: Template;
  draft: DraftState;
  onOptionChange: (index: number, value: string) => void;
  onOptionAdd: () => void;
  onOptionRemove: (index: number) => void;
  onCorrectIndexChange: (index: number) => void;
  onConfigChange: <K extends keyof DraftState['config']>(key: K, value: DraftState['config'][K]) => void;
}) {
  if (optionKinds.includes(template.kind)) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Answer options *</h2>
          {template.kind === 'multiple_choice' && (
            <ToggleLabel
              label="Multiple answers"
              checked={draft.config.allowMultipleAnswers}
              onChange={value => onConfigChange('allowMultipleAnswers', value)}
            />
          )}
        </div>
        <div className="space-y-3">
          {draft.options.map((option, index) => (
            <div key={index} className="flex items-center gap-3">
              {template.kind === 'quiz' && (
                <button
                  type="button"
                  onClick={() => onCorrectIndexChange(index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${draft.correctIndex === index ? 'border-[#168A3A] bg-[#EAF7EF] text-[#168A3A]' : 'border-[#DCDCDC] text-[#777]'}`}
                  title="Correct answer"
                >
                  ✓
                </button>
              )}
              <input
                value={option}
                onChange={e => onOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="min-w-0 flex-1 rounded-[9px] border border-[#DCDCDC] px-4 py-3 text-sm outline-none focus:border-[#168A3A]"
              />
              <button
                onClick={() => onOptionRemove(index)}
                disabled={draft.options.length <= 2}
                className="text-xl text-[#999] disabled:opacity-30"
                title="Remove option"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button onClick={onOptionAdd} className="mt-4 text-sm font-bold text-[#168A3A]">+ Add option</button>

        {template.kind === 'quiz' && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <NumberField label="Timer seconds" value={draft.config.timer} onChange={value => onConfigChange('timer', value)} />
            <NumberField label="Points" value={draft.config.points} onChange={value => onConfigChange('points', value)} />
            <ToggleLabel label="Leaderboard" checked={draft.config.leaderboard} onChange={value => onConfigChange('leaderboard', value)} />
          </div>
        )}
      </div>
    );
  }

  if (template.kind === 'word_cloud') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Word limit" value={draft.config.wordLimit} onChange={value => onConfigChange('wordLimit', value)} />
        <ToggleLabel label="Allow duplicate words" checked={draft.config.allowDuplicateWords} onChange={value => onConfigChange('allowDuplicateWords', value)} />
      </div>
    );
  }

  if (template.kind === 'open_text') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Character limit" value={draft.config.characterLimit} onChange={value => onConfigChange('characterLimit', value)} />
        <ToggleLabel label="Anonymous mode" checked={draft.config.anonymousMode} onChange={value => onConfigChange('anonymousMode', value)} />
        <ToggleLabel label="Paragraph answers" checked={draft.config.paragraphAnswer} onChange={value => onConfigChange('paragraphAnswer', value)} />
      </div>
    );
  }

  if (template.kind === 'qa') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleLabel label="Moderation" description="Review incoming questions" checked={draft.config.moderation} onChange={value => onConfigChange('moderation', value)} />
        <ToggleLabel label="Replies" description="Allow participants to reply to questions" checked={draft.config.paragraphAnswer} onChange={value => onConfigChange('paragraphAnswer', value)} />
        <NumberField label="Character limit" value={draft.config.characterLimit || 160} onChange={value => onConfigChange('characterLimit', value)} />
        <ToggleLabel label="Labels" description="Categorize and organize questions using labels" checked={draft.config.categoryTags} onChange={value => onConfigChange('categoryTags', value)} />
        <ToggleLabel label="Downvotes" description="Allow participants to downvote questions. Upvotes are always on." checked={draft.config.voting} onChange={value => onConfigChange('voting', value)} />
        <ToggleLabel label="Anonymous questions" checked={draft.config.anonymousQuestions} onChange={value => onConfigChange('anonymousQuestions', value)} />
      </div>
    );
  }

  if (template.kind === 'rating') {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold">Rating mode</span>
          <select
            value={draft.config.ratingMode}
            onChange={e => onConfigChange('ratingMode', e.target.value as DraftState['config']['ratingMode'])}
            className="w-full rounded-[9px] border border-[#DCDCDC] px-4 py-3 text-sm outline-none focus:border-[#168A3A]"
          >
            <option value="star">Star</option>
            <option value="emoji">Emoji</option>
            <option value="number">Number</option>
          </select>
        </label>
        <NumberField label="Max scale" value={draft.config.maxScale} onChange={value => onConfigChange('maxScale', value)} />
      </div>
    );
  }

  return null;
}

function LivePreview({ template, draft }: { template: Template; draft: DraftState }) {
  const filledOptions = draft.options.filter(option => option.trim());
  const words = ['insightful', 'clear', 'curious', 'useful', 'fast', 'interactive'];

  return (
    <aside className="sticky top-0 h-fit rounded-[14px] border border-[#E5E5E5] bg-[#FAFAFA] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#555]">Live preview</h2>
          <p className="text-xs text-[#888]">Participant view</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#168A3A]">Draft</span>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#E1E1E1] bg-white shadow-sm">
        <div className="border-b border-[#EFEFEF] px-5 py-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: template.accent }}>{template.label}</div>
          <h3 className="text-lg font-extrabold">{draft.question.trim() || 'Your question will appear here'}</h3>
        </div>

        <div className="min-h-[300px] p-5">
          {optionKinds.includes(template.kind) && (
            <div className="space-y-3">
              {(filledOptions.length ? filledOptions : ['Option 1', 'Option 2']).map((option, index) => (
                <div key={index} className={`rounded-[10px] border px-4 py-3 ${template.kind === 'quiz' && draft.correctIndex === index ? 'border-[#168A3A] bg-[#EAF7EF]' : 'border-[#E5E5E5]'}`}>
                  <div className="mb-2 flex items-center justify-between text-sm font-bold">
                    <span>{option}</span>
                    <span>{index === 0 ? '0%' : ''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E5E5E5]">
                    <div className="h-2 rounded-full" style={{ width: index === 0 ? '60%' : '0%', backgroundColor: template.accent }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {template.kind === 'word_cloud' && (
            <div className="relative h-[250px]">
              {words.map((word, index) => (
                <span
                  key={word}
                  className="absolute font-extrabold"
                  style={{
                    color: index % 2 ? '#7B3F98' : '#168A3A',
                    fontSize: `${16 + index * 3}px`,
                    left: `${(index * 37) % 70}%`,
                    top: `${18 + ((index * 29) % 60)}%`,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          )}

          {template.kind === 'open_text' && (
            <div className="rounded-[12px] border border-[#DCDCDC] p-4 text-sm text-[#777]">
              Participants will write a {draft.config.paragraphAnswer ? 'paragraph' : 'short'} answer here.
            </div>
          )}

          {template.kind === 'qa' && (
            <div className="space-y-3">
              {['Can you explain this example?', 'Will slides be shared later?'].map((question, index) => (
                <div key={question} className="rounded-[10px] border border-[#E5E5E5] p-4">
                  <div className="text-sm font-semibold">{question}</div>
                  <div className="mt-2 text-xs text-[#777]">{draft.config.upvotes ? `${index + 2} upvotes` : 'Questions collected'}</div>
                </div>
              ))}
            </div>
          )}

          {template.kind === 'rating' && (
            <div className="flex justify-center gap-3 py-12 text-3xl text-[#E5AC00]">
              {Array.from({ length: Math.min(draft.config.maxScale, 10) }).map((_, index) => (
                <span key={index}>{draft.config.ratingMode === 'emoji' ? '☺' : draft.config.ratingMode === 'number' ? index + 1 : '☆'}</span>
              ))}
            </div>
          )}

        </div>
      </div>
    </aside>
  );
}

function ToggleLabel({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[9px] border border-[#E5E5E5] bg-white px-4 py-3 text-sm font-semibold">
      <span>
        <span className="block">{label}</span>
        {description && <span className="mt-1 block text-xs font-medium text-[#777]">{description}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-[#168A3A]' : 'bg-[#9B9B9B]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full rounded-[9px] border border-[#DCDCDC] px-4 py-3 text-sm outline-none focus:border-[#168A3A]"
      />
    </label>
  );
}
