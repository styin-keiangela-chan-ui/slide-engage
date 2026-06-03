'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import SETooltip from '@/components/ui/SETooltip';
import DashboardShell from '@/components/ui/DashboardShell';
import { useAuth } from '@/hooks/useAuth';
import type { Event, Interaction, InteractionOption } from '@/lib/types';

type EditableInteraction = Interaction & {
  interaction_options?: InteractionOption[];
};

type InteractionDraft = {
  title: string;
  options: string[];
  correctIndex: number;
  config: Record<string, any>;
};

function statusLabel(status: string) {
  if (status === 'live') return 'Live';
  if (status === 'closed') return 'Closed';
  return 'Draft';
}

function statusTooltip(status: string) {
  if (status === 'live') return 'This interaction is currently accepting responses';
  if (status === 'closed') return 'This interaction is closed';
  return 'This interaction is not live yet';
}

function typeLabel(interaction: EditableInteraction) {
  const kind = interaction.config?.poll_kind;
  if (interaction.type === 'poll') return 'Multiple Choice';
  if (interaction.type === 'quiz') return 'Quiz';
  if (interaction.type === 'word_cloud') return 'Word Cloud';
  if (interaction.type === 'qa') return 'Audience Q&A';
  if (kind === 'rating') return 'Rating';
  return 'Open Text';
}

function sortedOptions(interaction: EditableInteraction) {
  return [...(interaction.interaction_options || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
}

function draftFromInteraction(interaction: EditableInteraction): InteractionDraft {
  const options = sortedOptions(interaction);
  const correctIndex = Math.max(0, options.findIndex(option => option.is_correct));

  return {
    title: interaction.title || '',
    options: options.length > 0 ? options.map(option => option.option_text) : ['', ''],
    correctIndex,
    config: {
      ...(interaction.config || {}),
      character_limit: interaction.config?.character_limit || 280,
      max_words_per_participant: interaction.config?.max_words_per_participant || 3,
      max_scale: interaction.config?.max_scale || 5,
      time_limit_seconds: interaction.config?.time_limit_seconds || 30,
      results_visible: interaction.config?.results_visible ?? true,
    },
  };
}

export default function LecturerInteractionsPage() {
  const router = useRouter();
  const { lecturer, currentEvent, loading, selectEvent, clearSelectedEvent } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [interactions, setInteractions] = useState<EditableInteraction[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(currentEvent?.id || '');
  const [loadingData, setLoadingData] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingInteraction, setEditingInteraction] = useState<EditableInteraction | null>(null);
  const [draft, setDraft] = useState<InteractionDraft | null>(null);

  useEffect(() => {
    if (!loading && !lecturer) router.push('/lecturer/login');
  }, [loading, lecturer, router]);

  useEffect(() => {
    if (!lecturer) return;
    setLoadingData(true);
    fetch(`/api/events?lecturer_id=${lecturer.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rows = (data.events || []) as Event[];
        setEvents(rows);

        if (currentEvent && rows.some(event => event.id === currentEvent.id && event.status !== 'archived')) {
          setSelectedEventId(currentEvent.id);
          return;
        }

        if (currentEvent) {
          clearSelectedEvent();
          setSelectedEventId('');
        }
      })
      .finally(() => setLoadingData(false));
  }, [clearSelectedEvent, currentEvent, lecturer]);

  const selectableEvents = useMemo(
    () => events.filter(event => event.status !== 'archived'),
    [events]
  );

  const selectedEvent = useMemo(
    () => selectableEvents.find(event => event.id === selectedEventId) || null,
    [selectableEvents, selectedEventId]
  );

  useEffect(() => {
    if (!selectedEvent) {
      setInteractions([]);
      return;
    }

    setLoadingData(true);
    fetch(`/api/interactions?event_id=${selectedEvent.id}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const rows = (data.interactions || []) as EditableInteraction[];
        setInteractions(rows);
        setEditingInteraction(current => {
          if (!current) return null;
          const next = rows.find(item => item.id === current.id) || null;
          if (next) setDraft(draftFromInteraction(next));
          return next;
        });
      })
      .finally(() => setLoadingData(false));
  }, [selectedEvent]);

  function chooseEvent(eventId: string) {
    setError('');
    setSelectedEventId(eventId);
    const event = selectableEvents.find(item => item.id === eventId);
    if (event) selectEvent(event);
    closeEditor();
  }

  function addInteraction() {
    if (!selectedEvent) {
      setError('Please select or create an event before adding interactions.');
      return;
    }
    router.push(`/lecturer/events/${selectedEvent.id}`);
  }

  function openEditor(interaction: EditableInteraction) {
    setError('');
    setMessage('');
    setEditingInteraction(interaction);
    setDraft(draftFromInteraction(interaction));
  }

  function closeEditor() {
    setEditingInteraction(null);
    setDraft(null);
    setSavingEdit(false);
  }

  function setDraftConfig(key: string, value: unknown) {
    setDraft(current => current ? { ...current, config: { ...current.config, [key]: value } } : current);
  }

  function setDraftOption(index: number, value: string) {
    setDraft(current => {
      if (!current) return current;
      const nextOptions = [...current.options];
      nextOptions[index] = value;
      return { ...current, options: nextOptions };
    });
  }

  function addDraftOption() {
    setDraft(current => current ? { ...current, options: [...current.options, ''] } : current);
  }

  function removeDraftOption(index: number) {
    setDraft(current => {
      if (!current) return current;
      const nextOptions = current.options.filter((_, optionIndex) => optionIndex !== index);
      return {
        ...current,
        options: nextOptions.length > 0 ? nextOptions : [''],
        correctIndex: Math.min(current.correctIndex, Math.max(0, nextOptions.length - 1)),
      };
    });
  }

  async function saveEditor() {
    if (!editingInteraction || !draft) return;

    const title = draft.title.trim();
    if (!title) {
      setError('Question is required.');
      return;
    }

    const needsOptions = editingInteraction.type === 'poll' || editingInteraction.type === 'quiz';
    const cleanOptions = draft.options
      .map((option, index) => ({
        option_text: option.trim(),
        is_correct: editingInteraction.type === 'quiz' && index === draft.correctIndex,
      }))
      .filter(option => option.option_text);

    if (needsOptions && cleanOptions.length < 2) {
      setError('Add at least 2 answer options.');
      return;
    }

    setSavingEdit(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/interactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingInteraction.id,
        title,
        config: draft.config,
        options: needsOptions ? cleanOptions : undefined,
      }),
    });
    const data = await res.json();
    setSavingEdit(false);

    if (!res.ok) {
      setError(data.error || 'Unable to save interaction.');
      return;
    }

    setInteractions(prev => prev.map(item => item.id === editingInteraction.id ? data.interaction : item));
    setEditingInteraction(data.interaction);
    setDraft(draftFromInteraction(data.interaction));
    setMessage('Interaction updated successfully.');
  }

  async function resetEditingResults() {
    if (!editingInteraction) return;
    if (!window.confirm('Reset all participant responses for this interaction? This keeps the question, options, settings, and event.')) return;

    setSavingEdit(true);
    setError('');
    setMessage('');

    const res = await fetch(`/api/responses?interaction_id=${editingInteraction.id}`, { method: 'DELETE' });
    const data = await res.json();
    setSavingEdit(false);

    if (!res.ok) {
      setError(data.error || 'Unable to reset results.');
      return;
    }

    console.log('SlideEngage reset results', {
      interaction_id: data.interaction_id || editingInteraction.id,
      responses_deleted: data.responses_deleted || 0,
      timestamp: data.timestamp,
    });
    setMessage(data.message || 'Results cleared successfully.');
  }

  async function toggleInteractionLive(interaction: EditableInteraction) {
    if (!selectedEvent) {
      setError('Please select or create an event before adding interactions.');
      return;
    }

    if (interaction.status !== 'live' && selectedEvent.status !== 'live') {
      setError('Make this event active before starting an interaction.');
      return;
    }

    setError('');
    const nextStatus = interaction.status === 'live' ? 'closed' : 'live';
    const res = await fetch('/api/interactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: interaction.id, status: nextStatus }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Unable to update interaction status.');
      return;
    }

    setInteractions(prev => prev.map(item => item.id === interaction.id ? data.interaction : item));
    if (editingInteraction?.id === interaction.id) {
      setEditingInteraction(data.interaction);
      setDraft(draftFromInteraction(data.interaction));
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!lecturer) return null;

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#F4F7F4]">
          <DashboardShell>
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-[18px] border border-[#E2EBE6] bg-white p-5 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-extrabold text-[#1A1A2E]">Interactions</h1>
              <p className="mt-1 text-sm text-[#6B7B8D]">
                Select one event first. New interactions will use that event&apos;s code and event_id.
              </p>
            </div>
            <button
              onClick={addInteraction}
              className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1A5C32]"
            >
              + Add Interaction
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-[10px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-[#168A3A]">
              {message}
            </div>
          )}

          <section className="mb-5 rounded-[18px] border border-[#E2EBE6] bg-white p-5">
            <label className="mb-2 block text-sm font-bold text-[#1A1A2E]">Selected event</label>
            <select
              value={selectedEventId}
              onChange={event => chooseEvent(event.target.value)}
              className="h-11 w-full max-w-[460px] rounded-[9px] border border-[#E2EBE6] bg-white px-3.5 text-sm outline-none focus:border-[#2D8A4E]"
            >
              <option value="">Select an event</option>
              {selectableEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.event_name} · #{event.event_code} · {event.status === 'live' ? 'Active now' : 'Past'}
                </option>
              ))}
            </select>

            {selectedEvent ? (
              <div className="mt-4 rounded-[10px] bg-[#F4F7F4] px-4 py-3 text-sm">
                <div className="font-bold text-[#1A1A2E]">{selectedEvent.event_name}</div>
                <div className="mt-1 text-[#6B7B8D]">Event code: #{selectedEvent.event_code}</div>
              </div>
            ) : (
              <div className="mt-4 rounded-[10px] border border-[#E2EBE6] bg-[#FAFCFA] px-4 py-3 text-sm font-semibold text-[#6B7B8D]">
                Please select or create an event before adding interactions.
              </div>
            )}
          </section>

          <section className="rounded-[18px] border border-[#E2EBE6] bg-white">
            <div className="border-b border-[#E2EBE6] px-5 py-4 text-sm font-bold text-[#1A1A2E]">
              Interactions for selected event
            </div>
            {!selectedEvent ? (
              <div className="px-7 py-10 text-center text-sm text-[#6B7B8D]">
                Please select or create an event before adding interactions.
              </div>
            ) : loadingData ? (
              <div className="px-7 py-10 text-center text-sm text-[#6B7B8D]">Loading interactions...</div>
            ) : interactions.length === 0 ? (
              <div className="px-7 py-10 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF7EF] text-xl text-[#2D8A4E]">▦</div>
                <h2 className="mb-1.5 text-base font-bold">No interactions yet</h2>
                <p className="mb-6 text-sm text-[#6B7B8D]">Add a poll, quiz, word cloud, or Q&A to this event.</p>
                <button onClick={addInteraction} className="rounded-[9px] bg-[#2D8A4E] px-5 py-2 text-sm font-semibold text-white">
                  Add Interaction
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E2EBE6]">
                {interactions.map(interaction => (
                  <div key={interaction.id}>
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[#1A1A2E]">{interaction.title}</div>
                        <div className="mt-1 text-xs text-[#6B7B8D]">{typeLabel(interaction)}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditor(interaction)}
                          aria-label="Edit question and settings"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#DDE8E1] bg-white px-3 py-1 text-xs font-bold text-[#1A1A2E] transition hover:border-[#168A3A] hover:text-[#168A3A]"
                        >
                          <SETooltip text="Edit question and settings">
                            <span className="inline-flex items-center gap-1.5">
                              <span aria-hidden="true">✏</span>
                              Edit
                            </span>
                          </SETooltip>
                        </button>
                        <SETooltip text={statusTooltip(interaction.status)}>
                          <button
                            type="button"
                            onClick={() => toggleInteractionLive(interaction)}
                            aria-label={statusTooltip(interaction.status)}
                            className={`rounded-full px-2.5 py-1 text-xs font-bold transition hover:shadow-sm ${
                            interaction.status === 'live'
                              ? 'bg-[#EAF7EF] text-[#168A3A] hover:bg-[#D8F0E0]'
                              : 'bg-[#F3F4F6] text-[#6B7B8D] hover:bg-[#EAF7EF] hover:text-[#168A3A]'
                          }`}>
                            {statusLabel(interaction.status)}
                          </button>
                        </SETooltip>
                      </div>
                    </div>
                    {editingInteraction?.id === interaction.id && draft && (
                      <InteractionEditPanel
                        interaction={editingInteraction}
                        draft={draft}
                        saving={savingEdit}
                        onClose={closeEditor}
                        onSave={saveEditor}
                        onReset={resetEditingResults}
                        onTitleChange={value => setDraft(current => current ? { ...current, title: value } : current)}
                        onConfigChange={setDraftConfig}
                        onOptionChange={setDraftOption}
                        onAddOption={addDraftOption}
                        onRemoveOption={removeDraftOption}
                        onCorrectIndexChange={value => setDraft(current => current ? { ...current, correctIndex: value } : current)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          </DashboardShell>
        </main>
      </div>
    </>
  );
}

function InteractionEditPanel({
  interaction,
  draft,
  saving,
  onClose,
  onSave,
  onReset,
  onTitleChange,
  onConfigChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onCorrectIndexChange,
}: {
  interaction: EditableInteraction;
  draft: InteractionDraft;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onReset: () => void;
  onTitleChange: (value: string) => void;
  onConfigChange: (key: string, value: unknown) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onCorrectIndexChange: (value: number) => void;
}) {
  const kind = interaction.config?.poll_kind || interaction.type;
  const isOptionsInteraction = interaction.type === 'poll' || interaction.type === 'quiz';
  const isRating = kind === 'rating';
  const isOpenText = interaction.type === 'feedback' && !isRating;

  return (
    <div className="border-t border-[#E2EBE6] bg-[#FBFDFB] px-5 py-5">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-extrabold text-[#1A1A2E]">Edit {typeLabel(interaction)}</h3>
          <p className="mt-1 text-xs text-[#6B7B8D]">Live interactions stay editable. Save updates so participants see the latest wording.</p>
        </div>
        <SETooltip text={statusTooltip(interaction.status)}>
          <span aria-label={statusTooltip(interaction.status)} className="w-fit rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#6B7B8D] ring-1 ring-[#DDE8E1]">
            {statusLabel(interaction.status)}
          </span>
        </SETooltip>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-[#6B7B8D]">
              {interaction.type === 'qa' ? 'Question title' : 'Question'}
            </span>
            <input
              value={draft.title}
              onChange={event => onTitleChange(event.target.value)}
              className="h-11 w-full rounded-[10px] border border-[#DDE8E1] bg-white px-3 text-sm font-semibold text-[#1A1A2E] outline-none focus:border-[#168A3A]"
            />
          </label>

          {isOptionsInteraction && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#6B7B8D]">Answer options</div>
              {draft.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  {interaction.type === 'quiz' && (
                    <input
                      type="radio"
                      checked={draft.correctIndex === index}
                      onChange={() => onCorrectIndexChange(index)}
                      aria-label={`Mark option ${index + 1} as correct`}
                    />
                  )}
                  <input
                    value={option}
                    onChange={event => onOptionChange(index, event.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="h-10 flex-1 rounded-[9px] border border-[#DDE8E1] bg-white px-3 text-sm outline-none focus:border-[#168A3A]"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveOption(index)}
                    className="h-10 rounded-[9px] border border-[#F2D5D5] px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
              <button type="button" onClick={onAddOption} className="rounded-[9px] border border-[#DDE8E1] bg-white px-3 py-2 text-sm font-bold text-[#168A3A] hover:bg-[#EAF7EF]">
                + Add option
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[12px] border border-[#E2EBE6] bg-white p-4">
          <h4 className="mb-3 text-sm font-extrabold text-[#1A1A2E]">Settings</h4>
          <div className="space-y-3">
            {interaction.type === 'poll' && (
              <>
                <ToggleRow label="Multiple answers" checked={!!draft.config.allow_multiple_answers} onChange={value => onConfigChange('allow_multiple_answers', value)} />
                <ToggleRow label="Show respondent names" checked={!!draft.config.show_respondent_names} onChange={value => onConfigChange('show_respondent_names', value)} />
                <ToggleRow label="Poll results visible" checked={draft.config.results_visible !== false} onChange={value => onConfigChange('results_visible', value)} />
              </>
            )}

            {interaction.type === 'word_cloud' && (
              <>
                <NumberField label="Max words" value={Number(draft.config.max_words_per_participant || 3)} min={1} max={20} onChange={value => onConfigChange('max_words_per_participant', value)} />
                <ToggleRow label="Allow duplicates" checked={!!draft.config.allow_duplicate_words} onChange={value => onConfigChange('allow_duplicate_words', value)} />
              </>
            )}

            {isOpenText && (
              <>
                <NumberField label="Character limit" value={Number(draft.config.character_limit || 280)} min={20} max={1000} onChange={value => onConfigChange('character_limit', value)} />
                <ToggleRow label="Anonymous mode" checked={draft.config.anonymous_mode !== false} onChange={value => onConfigChange('anonymous_mode', value)} />
              </>
            )}

            {interaction.type === 'quiz' && (
              <>
                <NumberField label="Timer seconds" value={Number(draft.config.time_limit_seconds || 30)} min={5} max={300} onChange={value => onConfigChange('time_limit_seconds', value)} />
                <ToggleRow label="Leaderboard" checked={draft.config.leaderboard !== false} onChange={value => onConfigChange('leaderboard', value)} />
              </>
            )}

            {interaction.type === 'qa' && (
              <>
                <ToggleRow label="Moderation" checked={!!draft.config.moderation_enabled} onChange={value => onConfigChange('moderation_enabled', value)} />
                <ToggleRow label="Replies" checked={!!draft.config.replies_enabled} onChange={value => onConfigChange('replies_enabled', value)} />
                <NumberField label="Character limit" value={Number(draft.config.character_limit || 160)} min={40} max={500} onChange={value => onConfigChange('character_limit', value)} />
              </>
            )}

            {isRating && (
              <>
                <NumberField label="Scale" value={Number(draft.config.max_scale || 5)} min={2} max={10} onChange={value => onConfigChange('max_scale', value)} />
                <label className="block text-xs font-bold text-[#6B7B8D]">
                  Scale mode
                  <select
                    value={draft.config.rating_mode || 'star'}
                    onChange={event => onConfigChange('rating_mode', event.target.value)}
                    className="mt-1 h-10 w-full rounded-[9px] border border-[#DDE8E1] bg-white px-2 text-sm text-[#1A1A2E] outline-none focus:border-[#168A3A]"
                  >
                    <option value="star">Stars</option>
                    <option value="emoji">Emoji</option>
                    <option value="number">Numbers</option>
                  </select>
                </label>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-[9px] border border-[#DDE8E1] bg-white px-4 py-2 text-sm font-bold text-[#1A1A2E] hover:bg-[#F4F7F4]">
          Cancel
        </button>
        <SETooltip text="Clear all participant responses">
          <button type="button" aria-label="Clear all participant responses" onClick={onReset} disabled={saving} className="rounded-[9px] border border-[#F2D5D5] bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60">
            Reset results
          </button>
        </SETooltip>
        <SETooltip text="Save changes without going live">
          <button type="button" aria-label="Save changes without going live" onClick={onSave} disabled={saving} className="rounded-[9px] bg-[#2D8A4E] px-4 py-2 text-sm font-bold text-white hover:bg-[#1A5C32] disabled:opacity-60">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </SETooltip>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-[#1A1A2E]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-bold text-[#6B7B8D]">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="mt-1 h-10 w-full rounded-[9px] border border-[#DDE8E1] bg-white px-2 text-sm text-[#1A1A2E] outline-none focus:border-[#168A3A]"
      />
    </label>
  );
}
