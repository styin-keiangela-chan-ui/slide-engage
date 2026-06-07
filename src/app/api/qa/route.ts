import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/qa?interaction_id=xxx — get questions with upvote counts
export async function GET(req: NextRequest) {
  const interactionId = req.nextUrl.searchParams.get('interaction_id');
  const participantId = req.nextUrl.searchParams.get('participant_id');
  const sort = req.nextUrl.searchParams.get('sort') || 'popular';
  const search = (req.nextUrl.searchParams.get('search') || '').trim();
  const archived = req.nextUrl.searchParams.get('archived') === 'true';

  if (!interactionId) {
    return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
  }

  const { data: interaction, error: interactionError } = await supabase
    .from('interactions')
    .select('status')
    .eq('id', interactionId)
    .single();

  if (interactionError || !interaction) {
    return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
  }

  if (interaction.status === 'archived') {
    return NextResponse.json({ error: 'This interaction has been deleted.' }, { status: 410 });
  }

  let query = supabase
    .from('qa_questions')
    .select('*, participants(display_name)')
    .eq('interaction_id', interactionId)
    .eq('is_hidden', archived);

  if (search) {
    query = query.ilike('question_text', `%${search}%`);
  }

  const { data: questions, error } = await query.order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get upvote counts for each question
  const questionIds = (questions || []).map(q => q.id);

  let upvoteCounts: Record<string, number> = {};
  let userUpvotes: Set<string> = new Set();

  if (questionIds.length > 0) {
    const { data: upvotes } = await supabase
      .from('qa_upvotes')
      .select('question_id, participant_id')
      .in('question_id', questionIds);

    if (upvotes) {
      upvotes.forEach(u => {
        upvoteCounts[u.question_id] = (upvoteCounts[u.question_id] || 0) + 1;
        if (participantId && u.participant_id === participantId) {
          userUpvotes.add(u.question_id);
        }
      });
    }
  }

  const enriched = (questions || []).map(q => ({
    ...q,
    upvote_count: upvoteCounts[q.id] || 0,
    has_upvoted: userUpvotes.has(q.id),
    display_name: q.participants?.display_name || 'Anonymous',
  }));

  if (sort === 'recent') {
    enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    enriched.sort((a, b) => b.upvote_count - a.upvote_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return NextResponse.json({ questions: enriched });
}

// POST /api/qa — submit a new question
export async function POST(req: NextRequest) {
  try {
    const { interaction_id, participant_id, question_text } = await req.json();

    if (!interaction_id || !participant_id || !question_text) {
      return NextResponse.json({ error: 'interaction_id, participant_id, and question_text required' }, { status: 400 });
    }

    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('status, config')
      .eq('id', interaction_id)
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    if (interaction.status === 'archived') {
      return NextResponse.json({ error: 'This interaction has been deleted.' }, { status: 410 });
    }

    if (interaction.status !== 'live') {
      return NextResponse.json({ error: 'Q&A is closed for this interaction.' }, { status: 403 });
    }

    const config = (interaction.config || {}) as Record<string, any>;
    const characterLimit = Number(config.character_limit || 160);
    if (question_text.trim().length > characterLimit) {
      return NextResponse.json({ error: `Question must be ${characterLimit} characters or fewer.` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('qa_questions')
      .insert({ interaction_id, participant_id, question_text: question_text.trim() })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ question: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/qa — update question (pin, hide, ai_answer)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Question id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('qa_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ question: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
