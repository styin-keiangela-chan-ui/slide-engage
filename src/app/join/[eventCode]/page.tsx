'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useParticipant } from '@/hooks/useParticipant';
import { useRealtime } from '@/hooks/useRealtime';
import Navbar from '@/components/ui/Navbar';
import { getInteractionIcon } from '@/lib/utils';
import type { Interaction, InteractionOption, QAQuestion } from '@/lib/types';

export default function StudentSessionPage() {
  const router = useRouter();
  const params = useParams();
  const eventCode = params.eventCode as string;
  const { participant, leaveEvent, loading: partLoading } = useParticipant();

  const [liveInteraction, setLiveInteraction] = useState<Interaction | null>(null);
  const [loadingInt, setLoadingInt] = useState(true);

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
      setLiveInteraction(liveItems[0] || null);
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

  const handleLeave = () => {
    leaveEvent();
    router.push('/join');
  };

  if (partLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!participant) return null;

  return (
    <>
      {/* Session nav */}
      <div className="bg-white border-b border-[#E2EBE6] px-5 h-[52px] flex items-center justify-between sticky top-0 z-50">
        <div className="font-bold text-[15px]">🎯 {participant.event_name}</div>
        <span className="bg-[#EAF7EF] text-[#2D8A4E] px-3.5 py-1 rounded-full text-xs font-bold">
          🔴 LIVE · #{participant.event_code}
        </span>
        <button
          onClick={handleLeave}
          className="px-3.5 py-1.5 text-xs font-semibold border border-[#E2EBE6] rounded-[7px] hover:border-red-300 hover:text-red-500 transition"
        >
          Leave
        </button>
      </div>

      <div className="max-w-[640px] mx-auto p-7">
        {loadingInt ? (
          <div className="text-center text-[#6B7B8D] py-10">Loading activities...</div>
        ) : !liveInteraction ? (
          <div className="bg-white rounded-[20px] p-8 shadow border border-[#E2EBE6] text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold mb-2">Waiting for lecturer to start an interaction.</h2>
            <p className="text-[#6B7B8D] text-sm">Keep this page open. The live activity will appear here automatically.</p>
          </div>
        ) : (
          <InteractionCard
            key={liveInteraction.id}
            interaction={liveInteraction}
            participantId={participant.id}
          />
        )}
      </div>
    </>
  );
}

// ── Individual interaction card ──
function InteractionCard({ interaction, participantId }: { interaction: Interaction; participantId: string }) {
  const [options, setOptions] = useState<InteractionOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // For quiz timer
  const [quizTime, setQuizTime] = useState<number>(interaction.config?.time_limit_seconds || 30);
  const [quizResult, setQuizResult] = useState<string | null>(null);

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
    if (interaction.type !== 'qa') return;
    const fetchQ = async () => {
      const res = await fetch(`/api/qa?interaction_id=${interaction.id}&participant_id=${participantId}`);
      const data = await res.json();
      setQuestions(data.questions || []);
    };
    fetchQ();
    const interval = setInterval(fetchQ, 3000);
    return () => clearInterval(interval);
  }, [interaction.id, interaction.type, participantId]);

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
      if (res.ok) setSubmitted(true);
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
        await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            option_id: selectedOptionId,
          }),
        });
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
      await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          participant_id: participantId,
          text_value: word,
        }),
      });
      setWordInput('');
      setWordSubmitted(true);
      setTimeout(() => setWordSubmitted(false), 2500);
    } catch (e: any) { alert(e.message); }
  };

  const handleSubmitFeedback = async () => {
    try {
      // Submit rating
      if (rating > 0) {
        await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            rating_value: rating,
          }),
        });
      }
      // Submit text
      if (feedbackText.trim()) {
        await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interaction_id: interaction.id,
            participant_id: participantId,
            text_value: feedbackText.trim(),
          }),
        });
      }
      setFeedbackSubmitted(true);
    } catch (e: any) { alert(e.message); }
  };

  const handleSubmitQuestion = async () => {
    const text = qaInput.trim();
    if (!text) return;
    try {
      await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interaction_id: interaction.id,
          participant_id: participantId,
          question_text: text,
        }),
      });
      setQaInput('');
    } catch (e: any) { alert(e.message); }
  };

  const handleUpvote = async (questionId: string) => {
    await fetch('/api/qa/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, participant_id: participantId }),
    });
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

  return (
    <div className="bg-white rounded-[20px] p-8 shadow border border-[#E2EBE6]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <span className="text-xl">{getInteractionIcon(interaction.type)}</span>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${chipColors[interaction.type] || ''}`}>
          {typeLabels[interaction.type] || interaction.type} · LIVE
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
            <div className="text-center py-6 text-[#2D8A4E] font-bold text-base">
              ✅ Vote submitted! Results showing on the lecturer&apos;s screen.
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
      {interaction.type === 'qa' && (
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

          {questions.length === 0 ? (
            <p className="text-sm text-[#6B7B8D] text-center py-4">No questions yet. Be the first to ask!</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {questions.map(q => (
                <div key={q.id} className="bg-white rounded-[14px] border border-[#E2EBE6] p-3.5 flex items-start gap-3.5">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleUpvote(q.id)}
                      className={`w-9 h-7 border-[1.5px] rounded-[7px] text-sm transition ${
                        q.has_upvoted
                          ? 'bg-[#EAF7EF] border-[#2D8A4E] text-[#2D8A4E]'
                          : 'border-[#E2EBE6] hover:bg-[#EAF7EF] hover:border-[#2D8A4E]'
                      }`}
                    >
                      ▲
                    </button>
                    <span className="text-[13px] font-bold">{q.upvote_count || 0}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{q.question_text}</div>
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
