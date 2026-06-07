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

type Row = Record<string, any>;

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function inRange(value: string | null | undefined, range: DateRange) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  const fromTime = range.from ? new Date(range.from).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = range.to ? new Date(range.to).getTime() : Number.POSITIVE_INFINITY;
  return time >= fromTime && time <= toTime;
}

function isUsableEvent(event: Row) {
  return event && event.status !== 'archived' && !event.archived_at && !event.deleted_at && event.is_archived !== true;
}

function isUsableInteraction(interaction: Row) {
  return interaction && interaction.status !== 'archived' && !interaction.deleted_at;
}

function activityPeriod(dates: Array<string | null | undefined>) {
  const validDates = dates
    .filter(Boolean)
    .map(date => new Date(date as string))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (validDates.length === 0) return 'No activity';

  const format = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const first = format.format(validDates[0]);
  const last = format.format(validDates[validDates.length - 1]);
  return first === last ? first : `${first} - ${last}`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countBy<T extends Row>(rows: T[], key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] || '').trim();
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts: Record<string, number>, limit = 8) {
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function textKeywords(texts: string[], limit = 12) {
  const stop = new Set(['the', 'and', 'for', 'you', 'your', 'with', 'this', 'that', 'are', 'was', 'were', 'from', 'have', 'has', 'but', 'not']);
  const counts: Record<string, number> = {};
  texts.forEach(text => {
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stop.has(word))
      .forEach(word => {
        counts[word] = (counts[word] || 0) + 1;
      });
  });
  return topEntries(counts, limit);
}

function participantName(row: Row) {
  return row.participants?.display_name || row.participant?.display_name || 'Anonymous';
}

// GET /api/analytics?lecturer_id=xxx&event_id=xxx&from=2026-01-01&to=2026-01-31
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

  const { data: lecturer } = await supabase
    .from('lecturers')
    .select('id, name, email')
    .eq('id', lecturerId)
    .maybeSingle();

  const { data: eventRows, error: eventsError } = await supabase
    .from('events')
    .select('*, lecturers(id, name, email)')
    .eq('lecturer_id', lecturerId)
    .order('created_at', { ascending: false });

  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

  const usableEvents = (eventRows || []).filter(isUsableEvent);
  const scopedEvents = eventId ? usableEvents.filter(event => event.id === eventId) : usableEvents;
  const eventIds = scopedEvents.map(event => event.id);

  if (eventIds.length === 0) {
    return NextResponse.json({
      metrics: {
        active_events: 0,
        created_events: 0,
        total_participants: 0,
        average_participants_per_event: 0,
        total_interactions: 0,
        interaction_breakdown: [],
        total_responses: 0,
        questions: 0,
        anonymous_question_rate: 0,
        poll_votes: 0,
        average_votes_per_poll: 0,
        response_rate: 0,
        engagement_score: 0,
      },
      events: usableEvents,
      account_activity: [],
      most_active_events: [],
      interaction_analytics: {},
      event_detail: null,
      range: { from, to },
    });
  }

  const { data: interactionRows, error: interactionsError } = await supabase
    .from('interactions')
    .select('*, interaction_options(*)')
    .in('event_id', eventIds);

  if (interactionsError) return NextResponse.json({ error: interactionsError.message }, { status: 500 });

  const interactions = (interactionRows || []).filter(isUsableInteraction);
  const activeInteractions = interactions.filter(interaction => interaction.status === 'live');
  const analyticsInteractions = activeInteractions.length > 0 ? activeInteractions : interactions;
  const interactionIds = analyticsInteractions.map(interaction => interaction.id);

  const { data: participantRows, error: participantsError } = await supabase
    .from('participants')
    .select('*')
    .in('event_id', eventIds);

  if (participantsError) return NextResponse.json({ error: participantsError.message }, { status: 500 });

  const participants = (participantRows || []).filter(row => inRange(row.joined_at, range));

  let responses: Row[] = [];
  if (interactionIds.length > 0) {
    const { data, error } = await supabase
      .from('responses')
      .select('*, participants(display_name), interaction_options(option_text, is_correct)')
      .in('interaction_id', interactionIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    responses = (data || []).filter(row => inRange(row.submitted_at, range));
  }

  const qaInteractionIds = analyticsInteractions.filter(interaction => interaction.type === 'qa').map(interaction => interaction.id);
  let questions: Row[] = [];
  let upvotes: Row[] = [];
  if (qaInteractionIds.length > 0) {
    const { data, error } = await supabase
      .from('qa_questions')
      .select('*, participants(display_name)')
      .in('interaction_id', qaInteractionIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    questions = (data || []).filter(row => !row.is_hidden && inRange(row.created_at, range));

    const questionIds = questions.map(question => question.id);
    if (questionIds.length > 0) {
      const { data: voteRows, error: upvotesError } = await supabase
        .from('qa_upvotes')
        .select('*')
        .in('question_id', questionIds);

      if (upvotesError) return NextResponse.json({ error: upvotesError.message }, { status: 500 });
      upvotes = voteRows || [];
    }
  }

  const createdEvents = scopedEvents.filter(event => inRange(event.created_at, range)).length;
  const rangeInteractions = interactions.filter(interaction => inRange(interaction.created_at, range));
  const pollInteractions = analyticsInteractions.filter(interaction => interaction.type === 'poll');
  const quizInteractions = analyticsInteractions.filter(interaction => interaction.type === 'quiz');
  const wordCloudInteractions = analyticsInteractions.filter(interaction => interaction.type === 'word_cloud');
  const qaInteractions = analyticsInteractions.filter(interaction => interaction.type === 'qa');
  const ratingInteractions = analyticsInteractions.filter(interaction => interaction.type === 'feedback' && interaction.config?.poll_kind === 'rating');
  const openTextInteractions = analyticsInteractions.filter(interaction => interaction.type === 'feedback' && interaction.config?.poll_kind !== 'rating');

  const pollIds = new Set(pollInteractions.map(interaction => interaction.id));
  const quizIds = new Set(quizInteractions.map(interaction => interaction.id));
  const wordCloudIds = new Set(wordCloudInteractions.map(interaction => interaction.id));
  const ratingIds = new Set(ratingInteractions.map(interaction => interaction.id));
  const openTextIds = new Set(openTextInteractions.map(interaction => interaction.id));

  const pollResponses = responses.filter(response => pollIds.has(response.interaction_id));
  const quizResponses = responses.filter(response => quizIds.has(response.interaction_id));
  const wordCloudResponses = responses.filter(response => wordCloudIds.has(response.interaction_id) && response.text_value);
  const ratingResponses = responses.filter(response => ratingIds.has(response.interaction_id) && response.rating_value !== null);
  const openTextResponses = responses.filter(response => openTextIds.has(response.interaction_id) && response.text_value);

  const totalActions = responses.length + questions.length + upvotes.length;
  const responseRate = percentage(responses.length + questions.length, Math.max(1, participants.length * Math.max(1, analyticsInteractions.length)));
  const engagementScore = percentage(totalActions, Math.max(1, participants.length * Math.max(1, analyticsInteractions.length)));
  const questionAnonymousRate = percentage(questions.filter(question => participantName(question) === 'Anonymous').length, questions.length);

  const breakdownCounts = countBy(analyticsInteractions, 'type');
  const interactionBreakdown = Object.entries(breakdownCounts).map(([type, count]) => ({ type, count }));

  const pollOptionCounts = pollResponses.reduce<Record<string, { label: string; value: number }>>((acc, response) => {
    const label = response.interaction_options?.option_text || 'Unknown option';
    acc[label] = acc[label] || { label, value: 0 };
    acc[label].value += 1;
    return acc;
  }, {});
  const pollDistribution = Object.values(pollOptionCounts).sort((a, b) => b.value - a.value);
  const pollsWithResponses = new Set(pollResponses.map(response => response.interaction_id)).size;

  const wordCounts = wordCloudResponses.reduce<Record<string, number>>((acc, response) => {
    const word = String(response.text_value || '').trim().toLowerCase();
    if (!word) return acc;
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
  const wordFrequency = topEntries(wordCounts, 20);

  const ratingValues = ratingResponses.map(response => Number(response.rating_value || 0)).filter(value => value > 0);
  const ratingDistribution = topEntries(countBy(ratingResponses.map(response => ({ rating: String(response.rating_value) })), 'rating'), 10);

  const correctQuiz = quizResponses.filter(response => response.interaction_options?.is_correct).length;
  const quizParticipants = Object.entries(
    quizResponses.reduce<Record<string, { name: string; attempts: number; correct: number }>>((acc, response) => {
      const key = response.participant_id || participantName(response);
      acc[key] = acc[key] || { name: participantName(response), attempts: 0, correct: 0 };
      acc[key].attempts += 1;
      if (response.interaction_options?.is_correct) acc[key].correct += 1;
      return acc;
    }, {})
  )
    .map(([, row]) => ({ ...row, score: percentage(row.correct, row.attempts) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const questionUpvoteCounts = upvotes.reduce<Record<string, number>>((acc, upvote) => {
    acc[upvote.question_id] = (acc[upvote.question_id] || 0) + 1;
    return acc;
  }, {});
  const qaRows = questions
    .map(question => ({
      id: question.id,
      question: question.question_text,
      participant: participantName(question),
      upvotes: questionUpvoteCounts[question.id] || 0,
      created_at: question.created_at,
    }))
    .sort((a, b) => b.upvotes - a.upvotes);

  const eventStats = scopedEvents.map(event => {
    const eventInteractionIds = analyticsInteractions.filter(interaction => interaction.event_id === event.id).map(interaction => interaction.id);
    const eventResponses = responses.filter(response => eventInteractionIds.includes(response.interaction_id));
    const eventQuestions = questions.filter(question => eventInteractionIds.includes(question.interaction_id));
    const eventPollVotes = pollResponses.filter(response => eventInteractionIds.includes(response.interaction_id));
    const eventParticipants = participants.filter(participant => participant.event_id === event.id);
    const eventActions = eventResponses.length + eventQuestions.length;
    const eventResponseRate = percentage(eventActions, Math.max(1, eventParticipants.length * Math.max(1, eventInteractionIds.length)));
    return {
      id: event.id,
      event_name: event.event_name,
      event_code: event.event_code,
      status: event.status,
      start_date: event.start_date,
      end_date: event.end_date,
      created_at: event.created_at,
      updated_at: event.updated_at,
      participants: eventParticipants.length,
      interactions: eventInteractionIds.length,
      questions: eventQuestions.length,
      poll_votes: eventPollVotes.length,
      responses: eventResponses.length,
      response_rate: eventResponseRate,
      engagement_score: percentage(eventActions, Math.max(1, eventParticipants.length * Math.max(1, eventInteractionIds.length))),
    };
  }).sort((a, b) => b.engagement_score - a.engagement_score);

  const activityDates = [
    ...scopedEvents.filter(event => inRange(event.created_at, range)).map(event => event.created_at),
    ...rangeInteractions.map(interaction => interaction.created_at),
    ...responses.map(response => response.submitted_at),
    ...questions.map(question => question.created_at),
  ];

  const interactionAnalytics: Record<string, any> = {};
  if (pollResponses.length > 0 || pollInteractions.length > 0) {
    interactionAnalytics.multiple_choice = {
      total_poll_votes: pollResponses.length,
      polls_with_responses: pollsWithResponses,
      average_votes_per_poll: round(pollResponses.length / Math.max(1, pollInteractions.length)),
      most_selected_option: pollDistribution[0]?.label || 'No votes yet',
      response_rate: percentage(pollResponses.length, Math.max(1, participants.length * Math.max(1, pollInteractions.length))),
      vote_distribution: pollDistribution.slice(0, 8),
      option_comparison: pollDistribution.slice(0, 8),
    };
  }

  if (openTextResponses.length > 0) {
    const texts = openTextResponses.map(response => String(response.text_value || ''));
    interactionAnalytics.open_text = {
      total_responses: openTextResponses.length,
      unique_responses: new Set(texts.map(text => text.toLowerCase().trim())).size,
      latest_responses: openTextResponses
        .slice()
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 6)
        .map(response => ({ text: response.text_value, participant: participantName(response), submitted_at: response.submitted_at })),
      keywords: textKeywords(texts),
      active_participants: topEntries(countBy(openTextResponses.map(response => ({ participant: participantName(response) })), 'participant'), 6),
    };
  }

  if (wordCloudResponses.length > 0) {
    interactionAnalytics.word_cloud = {
      total_words: wordCloudResponses.length,
      unique_words: wordFrequency.length,
      most_frequent_word: wordFrequency[0]?.label || '',
      words: wordFrequency,
      ranking: wordFrequency.slice(0, 10),
    };
  }

  if (ratingResponses.length > 0) {
    interactionAnalytics.rating = {
      average_rating: round(average(ratingValues)),
      total_ratings: ratingValues.length,
      highest_rating: ratingValues.length ? Math.max(...ratingValues) : 0,
      lowest_rating: ratingValues.length ? Math.min(...ratingValues) : 0,
      distribution: ratingDistribution.map(row => ({ label: row.label, value: row.value })),
      trend: ratingResponses
        .slice()
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
        .slice(-12)
        .map((response, index) => ({ label: `#${index + 1}`, value: Number(response.rating_value || 0) })),
    };
  }

  if (quizResponses.length > 0 || quizInteractions.length > 0) {
    const scores = quizParticipants.map(participant => participant.score);
    interactionAnalytics.quiz = {
      total_attempts: quizResponses.length,
      average_score: round(average(scores)),
      highest_score: scores.length ? Math.max(...scores) : 0,
      lowest_score: scores.length ? Math.min(...scores) : 0,
      correct_rate: percentage(correctQuiz, quizResponses.length),
      incorrect_rate: percentage(quizResponses.length - correctQuiz, quizResponses.length),
      score_distribution: quizParticipants.map(participant => ({ label: participant.name, value: participant.score })),
      correct_vs_wrong: [
        { label: 'Correct', value: correctQuiz },
        { label: 'Wrong', value: Math.max(0, quizResponses.length - correctQuiz) },
      ],
      leaderboard: quizParticipants,
    };
  }

  if (questions.length > 0 || qaInteractions.length > 0) {
    interactionAnalytics.qa = {
      total_questions: questions.length,
      upvotes: upvotes.length,
      downvotes: 0,
      anonymous_rate: questionAnonymousRate,
      popular_questions: qaRows.slice(0, 5),
      latest_questions: qaRows.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
      activity_trend: topEntries(countBy(questions.map(question => ({ day: new Date(question.created_at).toISOString().slice(0, 10) })), 'day'), 10).reverse(),
    };
  }

  const selectedEvent = eventId ? eventStats[0] : null;

  return NextResponse.json({
    metrics: {
      active_events: scopedEvents.filter(event => event.status === 'live').length,
      created_events: createdEvents,
      total_participants: participants.length,
      average_participants_per_event: round(participants.length / Math.max(1, scopedEvents.length)),
      total_interactions: interactions.length,
      interaction_breakdown: interactionBreakdown,
      total_responses: responses.length + questions.length,
      questions: questions.length,
      anonymous_question_rate: questionAnonymousRate,
      poll_votes: pollResponses.length,
      average_votes_per_poll: round(pollResponses.length / Math.max(1, pollInteractions.length)),
      response_rate: responseRate,
      engagement_score: engagementScore,
      quiz_answers: quizResponses.length,
      rating_responses: ratingResponses.length,
    },
    events: usableEvents,
    account_activity: [
      {
        user_id: lecturer?.id || lecturerId,
        name: lecturer?.name || 'Lecturer',
        email: lecturer?.email || '',
        events: createdEvents,
        interactions: rangeInteractions.length,
        questions: questions.length,
        votes: pollResponses.length + quizResponses.length,
        total_responses: responses.length + questions.length,
        activity_period: activityPeriod(activityDates),
      },
    ],
    most_active_events: eventStats.slice(0, 8),
    interaction_analytics: interactionAnalytics,
    event_detail: selectedEvent
      ? {
          summary: {
            participants: selectedEvent.participants,
            interactions: selectedEvent.interactions,
            responses: selectedEvent.responses,
            questions: selectedEvent.questions,
            poll_votes: selectedEvent.poll_votes,
            ratings: ratingResponses.filter(response => analyticsInteractions.find(interaction => interaction.id === response.interaction_id)?.event_id === selectedEvent.id).length,
            quiz_attempts: quizResponses.filter(response => analyticsInteractions.find(interaction => interaction.id === response.interaction_id)?.event_id === selectedEvent.id).length,
          },
          metrics: {
            join_rate: selectedEvent.participants > 0 ? 100 : 0,
            response_rate: selectedEvent.response_rate,
            engagement_score: selectedEvent.engagement_score,
          },
          breakdown: interactionBreakdown,
        }
      : null,
    range: { from, to },
  });
}
