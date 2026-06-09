'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useParticipant } from '@/hooks/useParticipant';
import { createClient } from '@/lib/supabase/client';
import { getInteractionIcon } from '@/lib/utils';
import type { Interaction, InteractionOption, QAQuestion } from '@/lib/types';

function normalizeInteractionType(type?: string | null) {
  const value = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (['qa', 'q&a', 'audience_qa', 'audience_q&a', 'audience_questions', 'audience_q_a'].includes(value)) {
    return 'qa';
  }

  return value;
}

function isQaInteraction(interaction: Interaction) {
  return normalizeInteractionType(interaction.type) === 'qa';
}

export default function StudentSessionPage() {
  const router = useRouter();
  const params = useParams();
  const eventCode = params.eventCode as string;
  const { participant, leaveEvent, loading: partLoading } = useParticipant();

  const [liveInteractions, setLiveInteractions] = useState<Interaction[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [activeTab, setActiveTab] = useState<'polls' | 'qa'>('polls');

  // If not joined, redirect to join page
  useEffect(() => {
    if (!partLoading && !participant) {
      router.push(`/join?code=${eventCode}`);
      return;
    }

    if (!partLoading && participant && participant.event_code !== eventCode.toUpperCase().replace('#', '')) {
      leaveEvent();
      router.push(`/join?code=${eventCode}`);
    }
  }, [eventCode, leaveEvent, partLoading, participant, router]);

  // Fetch interactions for this event
  const fetchInteractions = useCallback(async () => {
    if (!participant) return;
    try {
      const res = await fetch(`/api/interactions?event_id=${participant.event_id}`);
      const data = await res.json();
      const liveItems = (data.interactions || []).filter((i: Interaction) => i.status === 'live');
      setLiveInteractions(liveItems);
    } catch (e) {
      console.error(e);
    }
    setLoadingInt(false);
  }, [participant]);

  useEffect(() => {
    fetchInteractions();
    const interval = setInterval(fetchInteractions, 4000);
    return () => clearInterval(interval);
  }, [fetchInteractions]);

  useEffect(() => {
    if (!participant?.event_id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`slideengage-event-${participant.event_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interactions', filter: `event_id=eq.${participant.event_id}` },
        fetchInteractions
      )
      .on('broadcast', { event: 'interaction_changed' }, fetchInteractions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInteractions, participant?.event_id]);

  const handleLeave = () => {
    leaveEvent();
    router.push('/join');
  };

  if (partLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!participant) return null;

  return (
    <>
      <div className="bg-[#168A3A] px-4 py-4 text-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-extrabold text-[15px]">🎯 {participant.event_name}</div>
            <div className="text-xs text-white/75">Joined as {participant.display_name || 'Guest'}</div>
          </div>
          <button
            onClick={handleLeave}
            className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-bold text-white/90"
          >
            Leave
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-white/15 p-1 text-sm font-bold">
            <button onClick={() => setActiveTab('polls')} className={`rounded-full px-4 py-1.5 ${activeTab === 'polls' ? 'bg-white text-[#168A3A]' : 'text-white'}`}>Polls</button>
            <button onClick={() => setActiveTab('qa')} className={`rounded-full px-4 py-1.5 ${activeTab === 'qa' ? 'bg-white text-[#168A3A]' : 'text-white'}`}>Q&A</button>
          </div>
          <span className="bg-white/15 text-white px-3 py-1 rounded-full text-xs font-bold">
          🔴 LIVE · #{participant.event_code}
          </span>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto p-7">
        {loadingInt ? (
          <div className="text-center text-[#6B7B8D] py-10">Loading activities...</div>
        ) : liveInteractions.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 shadow border border-[#E2EBE6] text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold mb-2">Waiting for lecturer to start an interaction.</h2>
            <p className="text-[#6B7B8D] text-sm">Keep this page open. The live activity will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {liveInteractions.length > 1 && (
              <div className="rounded-[14px] border border-[#E2EBE6] bg-white px-4 py-3 text-sm font-semibold text-[#6B7B8D] shadow-sm">
                {liveInteractions.length} live interactions are open for this event.
              </div>
            )}
            {liveInteractions
              .filter(interaction => activeTab === 'qa' ? isQaInteraction(interaction) : !isQaInteraction(interaction))
              .map(interaction => (
              <InteractionCard
                key={interaction.id}
                interaction={interaction}
                participantId={participant.id}
                eventId={participant.event_id}
              />
            ))}
            {activeTab === 'polls' && liveInteractions.filter(interaction => !isQaInteraction(interaction)).length === 0 && (
              <div className="rounded-[20px] border border-[#E2EBE6] bg-white p-8 text-center shadow">
                <h2 className="text-lg font-bold">There are no active polls at the moment.</h2>
                <button onClick={() => setActiveTab('qa')} className="mt-5 rounded-[9px] bg-[#168A3A] px-5 py-2 text-sm font-bold text-white">Go to Q&A</button>
              </div>
            )}
            {activeTab === 'qa' && liveInteractions.filter(interaction => isQaInteraction(interaction)).length === 0 && (
              <div className="rounded-[20px] border border-[#E2EBE6] bg-white p-8 text-center shadow">
                <h2 className="text-lg font-bold">There are no active Q&A sessions yet.</h2>
                <p className="mt-2 text-sm text-[#6B7B8D]">Please wait for your lecturer to start Q&A.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Individual interaction card ──
function InteractionCard({ interaction, participantId, eventId }: { interaction: Interaction; participantId: string; eventId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [options, setOptions] = useState<InteractionOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollResults, setPollResults] = useState<any[]>([]);

  // For word cloud
  const [wordInput, setWordInput] = useState('');
  const [wordSubmitted, setWordSubmitted] = useState(false);

  // For feedback
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // For Q&A
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [qaInput, setQaInput] = useState('');
  const [qaMenuId, setQaMenuId] = useState<string | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');
  const [qaStatus, setQaStatus] = useState('');

  // For quiz timer
  const [quizTime, setQuizTime] = useState<number>(interaction.config?.time_limit_seconds || 30);
  const [quizResult, setQuizResult] = useState<string | null>(null);

  useEffect(() => {
    setSelectedOptionId(null);
    setSubmitted(false);
    setPollResults([]);
    setWordInput('');
    setWordSubmitted(false);
    setRating(0);
    setFeedbackText('');
    setFeedbackSubmitted(false);
    setQuizResult(null);
    setQaMenuId(null);
    setEditingQuestionId(null);
    setEditingQuestionText('');
    setQaStatus('');
  }, [interaction.id, interaction.updated_at]);

  const notifyRealtime = useCallback(
    async (eventName: 'response_inserted' | 'qa_changed') => {
      await new Promise<void>(resolve => {
        const channel = supabase.channel(`slideengage-event-${eventId}`);
        const timeout = window.setTimeout(async () => {
          await supabase.removeChannel(channel);
          resolve();
        }, 1200);

        channel.subscribe(async status => {
          if (status !== 'SUBSCRIBED') return;
          await channel.send({
            type: 'broadcast',
            event: eventName,
            payload: {
              event_id: eventId,
              interaction_id: interaction.id,
              sent_at: new Date().toISOString(),
            },
          });
          window.clearTimeout(timeout);
          await supabase.removeChannel(channel);
          resolve();
        });
      });
    },
    [eventId, interaction.id, supabase]
  );

  // Fetch options for poll/quiz
  useEffect(() => {
    if (interaction.type === 'poll' || interaction.type === 'quiz') {
      const opts = (interaction as any).interaction_options || [];
      setOptions(opts.sort((a: InteractionOption, b: InteractionOption) => a.position - b.position));
    }
  }, [interaction]);

  // Quiz timer
  useEffect(() => {
    if (interaction.type !== 'quiz' || submitted) return;
    const limit = interaction.config?.time_limit_seconds || 30;
    setQuizTime(limit);
    const interval = setInterval(() => {
      setQuizTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submitted) handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [interaction.type, interaction.config?.time_limit_seconds]);

  // Fetch Q&A questions
  useEffect(() => {
    if (!isQaInteraction(interaction)) return;
    const fetchQ = async () => {
      const res = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    };
    fetchQ();
    const interval = setInterval(fetchQ, 3000);
    return () => clearInterval(interval);
  }, [interaction.id, interaction.type, interaction.updated_at, participantId]);

  useEffect(() => {
    if (!isQaInteraction(interaction)) return;
    const channel = supabase
      .channel(`student-qa-${interaction.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'qa_questions', filter: `interaction_id=eq.${interaction.id}` },
        async () => {
          const res = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
          const data = await res.json();
          setQuestions(data.questions || []);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qa_upvotes' }, async () => {
        const res = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
        const data = await res.json();
        setQuestions(data.questions || []);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interaction.id, interaction.type, participantId, supabase]);

  // ─ Submit handlers ─

  const handleSubmitPoll = async () => {
    if (!selectedOptionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          participant_id: participantId,
          option_id: selectedOptionId,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        notifyRealtime('response_inserted');
        if (interaction.config?.results_visible !== false) {
          const resultRes = await fetch(`/api/results?interaction_id=${interaction.id}`, { cache: 'no-store' });
          const resultData = await resultRes.json();
          setPollResults(resultData.results || []);
        }
      }
      else {
        const data = await res.json();
        if (data.error?.includes('already')) setSubmitted(true);
        else alert(data.error);
      }
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (selectedOptionId) {
        const res = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            option_id: selectedOptionId,
          }),
        });
        if (res.ok) notifyRealtime('response_inserted');
      }
      // Check if correct
      const correctOpt = options.find(o => o.is_correct);
      if (correctOpt && selectedOptionId === correctOpt.id) {
        setQuizResult('correct');
      } else if (correctOpt) {
        setQuizResult(`incorrect:${correctOpt.option_letter}:${correctOpt.option_text}`);
      } else {
        setQuizResult('submitted');
      }
      setSubmitted(true);
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleSubmitWord = async () => {
    const word = wordInput.trim();
    if (!word) return;
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          participant_id: participantId,
          text_value: word,
        }),
      });
      if (res.ok) notifyRealtime('response_inserted');
      setWordInput('');
      setWordSubmitted(true);
      setTimeout(() => setWordSubmitted(false), 2500);
    } catch (e: any) { alert(e.message); }
  };

  const handleSubmitFeedback = async () => {
    try {
      // Submit rating
      if (rating > 0) {
        const res = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            rating_value: rating,
          }),
        });
        if (res.ok) notifyRealtime('response_inserted');
      }
      // Submit text
      if (feedbackText.trim()) {
        const res = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            text_value: feedbackText.trim(),
          }),
        });
        if (res.ok) notifyRealtime('response_inserted');
      }
      setFeedbackSubmitted(true);
    } catch (e: any) { alert(e.message); }
  };

  const handleSubmitQuestion = async () => {
    const text = qaInput.trim();
    if (!text) return;
    try {
      const res = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          participant_id: participantId,
          question_text: text,
        }),
      });
      if (res.ok) notifyRealtime('qa_changed');
      setQaStatus('Question submitted.');
      setQaInput('');
    } catch (e: any) { alert(e.message); }
  };

  const beginEditQuestion = (question: QAQuestion) => {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.question_text);
    setQaMenuId(null);
    setQaStatus('');
  };

  const handleEditQuestion = async (questionId: string) => {
    const text = editingQuestionText.trim();
    if (!text) return;
    const res = await fetch('/api/qa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: questionId, participant_id: participantId, question_text: text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Unable to edit question.');
      return;
    }
    setEditingQuestionId(null);
    setEditingQuestionText('');
    setQaStatus('Question edited.');
    notifyRealtime('qa_changed');
    const result = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
    const data = await result.json();
    setQuestions(data.questions || []);
  };

  const handleWithdrawQuestion = async (questionId: string) => {
    const confirmed = window.confirm('Withdraw this question? It will be removed from Q&A and live results.');
    if (!confirmed) return;
    const res = await fetch('/api/qa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: questionId, participant_id: participantId, is_hidden: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Unable to withdraw question.');
      return;
    }
    setQaMenuId(null);
    setQaStatus('Question withdrawn.');
    notifyRealtime('qa_changed');
    setQuestions(current => current.filter(question => question.id !== questionId));
  };

  const handleUpvote = async (questionId: string) => {
    await fetch('/api/qa/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, participant_id: participantId }),
    });
    notifyRealtime('qa_changed');
    // Refresh
    const res = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
    const data = await res.json();
    setQuestions(data.questions || []);
  };

  // ─ Type-specific chip colors ─
  const chipColors: Record<string, string> = {
    poll: 'bg-[#EAF7EF] text-[#2D8A4E]',
    quiz: 'bg-[#FFF3E6] text-[#D46B08]',
    qa: 'bg-[#EAF7EF] text-[#2D8A4E]',
    word_cloud: 'bg-[#E6F1FB] text-[#1A6BB5]',
    feedback: 'bg-[#FFF3E6] text-[#D46B08]',
  };

  const typeLabels: Record<string, string> = {
    poll: 'POLL', quiz: 'QUIZ', qa: 'Q&A', word_cloud: 'WORD CLOUD', feedback: 'FEEDBACK',
  };
  const normalizedType = normalizeInteractionType(interaction.type);

  return (
    <div className="bg-white rounded-[20px] p-8 shadow border border-[#E2EBE6]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-xl">{getInteractionIcon(normalizedType as any)}</span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${chipColors[normalizedType] || ''}`}>
          {typeLabels[normalizedType] || normalizedType} · LIVE
        </span>
        {interaction.type === 'quiz' && !submitted && (
          <span className="ml-auto text-lg font-extrabold text-[#D46B08]">{quizTime}</span>
        )}
      </div>

      <h2 className="text-xl font-bold mb-5">{interaction.title}</h2>

      {/* ── POLL ── */}
      {interaction.type === 'poll' && (
        <>
          {!submitted ? (
            <>
              <div className="flex flex-col gap-3">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-3.5 px-5 border-2 rounded-xl text-[15px] font-medium text-left transition w-full ${
                      selectedOptionId === opt.id
                        ? 'border-[#2D8A4E] bg-[#EAF7EF] text-[#1A5C32]'
                        : 'border-[#E2EBE6] bg-white hover:border-[#2D8A4E] hover:bg-[#EAF7EF]'
                    }`}
                  >
                    <span className={`inline-block w-7 h-7 rounded-[7px] text-center leading-7 font-bold text-[13px] mr-3 ${
                      selectedOptionId === opt.id ? 'bg-[#2D8A4E] text-white' : 'bg-[#E2EBE6]'
                    }`}>
                      {opt.option_letter}
                    </span>
                    {opt.option_text}
                  </button>
                ))}
              </div>
              {selectedOptionId && (
                <button
                  onClick={handleSubmitPoll}
                  disabled={submitting}
                  className="w-full mt-4 py-3 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit vote ✓'}
                </button>
              )}
            </>
          ) : (
            <div className="py-3">
              <div className="mb-4 text-center text-[#2D8A4E] font-bold text-base">✅ Vote submitted!</div>
              {interaction.config?.results_visible === false ? (
                <p className="text-center text-sm font-semibold text-[#6B7B8D]">Results are hidden by the lecturer.</p>
              ) : pollResults.length ? (
                <div className="space-y-3">
                  {pollResults.map(result => (
                    <div key={result.option_id}>
                      <div className="mb-1 flex justify-between text-sm font-bold">
                        <span>{result.option_text}</span>
                        <span>{result.percentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#E2EBE6]">
                        <div className="h-2 rounded-full bg-[#168A3A]" style={{ width: `${result.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm font-semibold text-[#6B7B8D]">Waiting for responses.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── QUIZ ── */}
      {interaction.type === 'quiz' && (
        <>
          {!submitted ? (
            <>
              <div className="text-[13px] text-[#6B7B8D] mb-4">One correct answer</div>
              <div className="flex flex-col gap-3">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-3.5 px-5 border-2 rounded-xl text-[15px] font-medium text-left transition w-full ${
                      selectedOptionId === opt.id
                        ? 'border-[#2D8A4E] bg-[#EAF7EF] text-[#1A5C32]'
                        : 'border-[#E2EBE6] bg-white hover:border-[#2D8A4E] hover:bg-[#EAF7EF]'
                    }`}
                  >
                    <span className={`inline-block w-7 h-7 rounded-[7px] text-center leading-7 font-bold text-[13px] mr-3 ${
                      selectedOptionId === opt.id ? 'bg-[#2D8A4E] text-white' : 'bg-[#E2EBE6]'
                    }`}>
                      {opt.option_letter}
                    </span>
                    {opt.option_text}
                  </button>
                ))}
              </div>
              {selectedOptionId && (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={submitting}
                  className="w-full mt-4 py-3 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Lock in answer ✓'}
                </button>
              )}
            </>
          ) : (
            <div className={`mt-4 p-4 rounded-xl font-bold text-[15px] ${
              quizResult === 'correct'
                ? 'bg-[#EAF7EF] text-[#1A5C32]'
                : quizResult === 'submitted'
                  ? 'bg-[#E6F1FB] text-[#1A6BB5]'
                  : 'bg-[#FFF0F0] text-[#C53030]'
            }`}>
              {quizResult === 'correct'
                ? '✅ Correct! +100 pts'
                : quizResult === 'submitted'
                  ? '✅ Answer submitted!'
                  : `❌ Incorrect. The answer is ${quizResult?.split(':')[1]} — ${quizResult?.split(':')[2]}`
              }
            </div>
          )}
        </>
      )}

      {/* ── WORD CLOUD ── */}
      {interaction.type === 'word_cloud' && (
        <>
          <div className="flex gap-2.5">
            <input
              value={wordInput}
              onChange={e => setWordInput(e.target.value)}
              placeholder="Type your word…"
              maxLength={20}
              className="flex-1 p-3 px-4 border-[1.5px] border-[#E2EBE6] rounded-[10px] text-[15px] outline-none focus:border-[#2D8A4E] transition"
              onKeyDown={e => e.key === 'Enter' && handleSubmitWord()}
            />
            <button
              onClick={handleSubmitWord}
              className="px-5 py-2 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition"
            >
              Add →
            </button>
          </div>
          {wordSubmitted && (
            <div className="text-center py-4 text-[#2D8A4E] font-bold text-base mt-3">
              ✅ Word added to the cloud!
            </div>
          )}
        </>
      )}

      {/* ── Q&A ── */}
      {isQaInteraction(interaction) && (
        <>
          <div className="flex gap-2.5 mb-5">
            <input
              value={qaInput}
              onChange={e => setQaInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 p-3 px-4 border-[1.5px] border-[#E2EBE6] rounded-[10px] text-sm outline-none focus:border-[#2D8A4E] transition"
              onKeyDown={e => e.key === 'Enter' && handleSubmitQuestion()}
            />
            <button
              onClick={handleSubmitQuestion}
              className="px-5 py-2 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition"
            >
              Ask →
            </button>
          </div>
          {qaStatus && (
            <div className="mb-4 rounded-[10px] border border-[#BFE5CB] bg-[#F0FFF6] px-3 py-2 text-sm font-bold text-[#168A3A]">
              {qaStatus}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="py-8 text-center">
              <h3 className="text-base font-bold text-[#1A1A2E]">There are no questions asked yet.</h3>
              <p className="mt-2 text-sm text-[#6B7B8D]">Ask the first one!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {questions.map(q => (
                <div key={q.id} className="relative flex items-start gap-3.5 rounded-[14px] border border-[#E2EBE6] bg-white p-3.5">
                  <button
                    onClick={() => handleUpvote(q.id)}
                    aria-label={`${q.has_upvoted ? 'Remove like from' : 'Like'} question`}
                    title={`${q.has_upvoted ? 'Remove like' : 'Like question'}`}
                    className={`shrink-0 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-black transition hover:scale-105 ${
                      q.has_upvoted
                        ? 'border-[#2D8A4E] bg-[#EAF7EF] text-[#168A3A] shadow-sm'
                        : 'border-[#E2EBE6] bg-white text-[#1A1A2E] hover:border-[#2D8A4E] hover:bg-[#EAF7EF] hover:text-[#168A3A]'
                    }`}
                  >
                    👍 <span className="inline-block min-w-[1.25ch] transition-transform">{q.upvote_count || 0}</span>
                  </button>
                  <div className="flex-1">
                    {editingQuestionId === q.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingQuestionText}
                          onChange={event => setEditingQuestionText(event.target.value)}
                          className="min-h-[76px] w-full rounded-[10px] border border-[#BFE5CB] p-3 text-sm outline-none focus:border-[#168A3A]"
                          maxLength={Number(interaction.config?.character_limit || 160)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(q.id)}
                            className="rounded-full bg-[#168A3A] px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuestionId(null);
                              setEditingQuestionText('');
                            }}
                            className="rounded-full border border-[#DCE7E1] px-3 py-1.5 text-xs font-bold text-[#526173]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-medium">{q.question_text}</div>
                    )}
                    <div className="text-xs text-[#6B7B8D] mt-1">
                      {(q as any).display_name || 'Anonymous'}
                    </div>
                    {q.ai_answer && (
                      <div className="mt-2 p-2.5 bg-[#EAF7EF] rounded-lg text-[13px] text-[#1A5C32] border-l-[3px] border-[#2D8A4E]">
                        {q.ai_answer}
                        <span className="inline-flex items-center gap-1 text-[11px] bg-[#E6F1FB] text-[#1A6BB5] px-2 py-0.5 rounded-full font-semibold ml-2">🤖 AI</span>
                      </div>
                    )}
                  </div>
                  {q.participant_id === participantId && editingQuestionId !== q.id && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setQaMenuId(current => (current === q.id ? null : q.id))}
                        className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-[#6B7B8D] hover:bg-[#F6F8F7]"
                        aria-label="Question actions"
                      >
                        ⋯
                      </button>
                      {qaMenuId === q.id && (
                        <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-[12px] border border-[#E2EBE6] bg-white text-sm font-bold shadow-xl">
                          <button
                            type="button"
                            onClick={() => beginEditQuestion(q)}
                            className="block w-full px-4 py-3 text-left hover:bg-[#F6F8F7]"
                          >
                            Edit question
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWithdrawQuestion(q.id)}
                            className="block w-full px-4 py-3 text-left text-[#C53030] hover:bg-[#FFF5F5]"
                          >
                            Withdraw question
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FEEDBACK ── */}
      {interaction.type === 'feedback' && (
        <>
          {!feedbackSubmitted ? (
            <>
              {interaction.config?.include_star_ratings !== false && (
                <div className="mb-5">
                  <div className="text-sm font-semibold mb-2">Overall experience</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        className={`text-[32px] transition ${n <= rating ? 'opacity-100' : 'opacity-30'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {interaction.config?.include_open_text !== false && (
                <div className="mb-5">
                  <div className="text-sm font-semibold mb-2">Additional comments</div>
                  <textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Share any thoughts…"
                    rows={3}
                    className="w-full p-3 border-[1.5px] border-[#E2EBE6] rounded-[10px] text-sm outline-none focus:border-[#2D8A4E] transition resize-y"
                  />
                </div>
              )}

              <button
                onClick={handleSubmitFeedback}
                className="w-full py-3 rounded-[9px] text-sm font-semibold bg-[#2D8A4E] text-white hover:bg-[#1A5C32] transition"
              >
                Submit feedback ✓
              </button>
            </>
          ) : (
            <div className="text-center py-6 text-[#2D8A4E] font-bold text-base">
              ✅ Thank you for your feedback!
            </div>
          )}
        </>
      )}
    </div>
  );
}
