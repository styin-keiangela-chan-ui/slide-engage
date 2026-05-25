import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DateRange = {
  from: string | null;
  to: string | null;
};

function applyDateRange<T>(
  query: T,
  column: string,
  { from, to }: DateRange
) {
  let nextQuery = query as any;
  if (from) nextQuery = nextQuery.gte(column, from);
  if (to) nextQuery = nextQuery.lte(column, to);
  return nextQuery;
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

// GET /api/analytics?lecturer_id=xxx&from=2026-01-01&to=2026-01-31
export async function GET(req: NextRequest) {
  const lecturerId = req.nextUrl.searchParams.get('lecturer_id');
  const eventId = req.nextUrl.searchParams.get('event_id');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  const range = {
    from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null,
  };

  if (!lecturerId) {
    return NextResponse.json({ error: 'lecturer_id required' }, { status: 400 });
  }

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, event_name, event_code, status, created_at')
    .eq('lecturer_id', lecturerId)
    .order('created_at', { ascending: false });

  if (eventsError) {
    return NextResponse.json({ error: eventsError.message }, { status: 500 });
  }

  const scopedEvents = eventId ? (events || []).filter(event => event.id === eventId) : (events || []);
  const eventIds = scopedEvents.map(event => event.id);
  if (eventIds.length === 0) {
    return NextResponse.json({
      metrics: {
        active_events: 0,
        created_events: 0,
        questions: 0,
        upvotes: 0,
        poll_votes: 0,
        quiz_answers: 0,
        participants: 0,
        integrations: 2,
        engagement_score: 0,
        active_interactions: 0,
        response_rate: 0,
      },
      events: events || [],
      recent_events: [],
      range: { from, to },
    });
  }

  const createdEvents = scopedEvents.filter(event => {
    const createdAt = new Date(event.created_at).getTime();
    const fromTime = range.from ? new Date(range.from).getTime() : Number.NEGATIVE_INFINITY;
    const toTime = range.to ? new Date(range.to).getTime() : Number.POSITIVE_INFINITY;
    return createdAt >= fromTime && createdAt <= toTime;
  }).length;

  const { data: interactions, error: interactionsError } = await supabase
    .from('interactions')
    .select('id, event_id, type, status, created_at')
    .in('event_id', eventIds);

  if (interactionsError) {
    return NextResponse.json({ error: interactionsError.message }, { status: 500 });
  }

  const interactionIds = (interactions || []).map(interaction => interaction.id);
  const pollInteractionIds = (interactions || [])
    .filter(interaction => interaction.type === 'poll')
    .map(interaction => interaction.id);
  const quizInteractionIds = (interactions || [])
    .filter(interaction => interaction.type === 'quiz')
    .map(interaction => interaction.id);
  const qaInteractionIds = (interactions || [])
    .filter(interaction => interaction.type === 'qa')
    .map(interaction => interaction.id);

  const participantsQuery = applyDateRange(
    supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .in('event_id', eventIds),
    'joined_at',
    range
  );

  const { count: participants, error: participantsError } = await participantsQuery;
  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 500 });
  }

  let questions = 0;
  let upvotes = 0;
  let pollVotes = 0;
  let quizAnswers = 0;

  if (qaInteractionIds.length > 0) {
    const questionsQuery = applyDateRange(
      supabase
        .from('qa_questions')
        .select('id', { count: 'exact' })
        .in('interaction_id', qaInteractionIds),
      'created_at',
      range
    );

    const { data: questionRows, count, error } = await questionsQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    questions = count || 0;
    const questionIds = (questionRows || []).map((question: { id: string }) => question.id);

    if (questionIds.length > 0) {
      const { count: upvoteCount, error: upvotesError } = await supabase
        .from('qa_upvotes')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionIds);

      if (upvotesError) {
        return NextResponse.json({ error: upvotesError.message }, { status: 500 });
      }
      upvotes = upvoteCount || 0;
    }
  }

  if (pollInteractionIds.length > 0) {
    const pollVotesQuery = applyDateRange(
      supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('interaction_id', pollInteractionIds),
      'submitted_at',
      range
    );

    const { count, error } = await pollVotesQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    pollVotes = count || 0;
  }

  if (quizInteractionIds.length > 0) {
    const quizAnswersQuery = applyDateRange(
      supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('interaction_id', quizInteractionIds),
      'submitted_at',
      range
    );

    const { count, error } = await quizAnswersQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    quizAnswers = count || 0;
  }

  let responseCount = 0;
  if (interactionIds.length > 0) {
    const responsesQuery = applyDateRange(
      supabase
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .in('interaction_id', interactionIds),
      'submitted_at',
      range
    );

    const { count, error } = await responsesQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    responseCount = count || 0;
  }

  const activeEvents = scopedEvents.filter(event => event.status === 'live').length;
  const activeInteractions = (interactions || []).filter(interaction => interaction.status === 'live').length;
  const engagementActions = responseCount + questions + upvotes;
  const possibleActions = Math.max(1, (participants || 0) * Math.max(1, activeInteractions || interactionIds.length));
  const responseRate = percentage(responseCount, Math.max(1, (participants || 0) * Math.max(1, interactionIds.length)));

  return NextResponse.json({
    metrics: {
      active_events: activeEvents,
      created_events: createdEvents,
      questions,
      upvotes,
      poll_votes: pollVotes,
      quiz_answers: quizAnswers,
      participants: participants || 0,
      integrations: 2,
      engagement_score: percentage(engagementActions, possibleActions),
      active_interactions: activeInteractions,
      response_rate: responseRate,
    },
    events: events || [],
    recent_events: scopedEvents.slice(0, 5).map(event => ({
      id: event.id,
      event_name: event.event_name,
      event_code: event.event_code,
      status: event.status,
      created_at: event.created_at,
      interaction_count: (interactions || []).filter(interaction => interaction.event_id === event.id).length,
    })),
    range: { from, to },
  });
}
