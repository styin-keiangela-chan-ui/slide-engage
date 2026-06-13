import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/qa/restore-last?interaction_id=xxx — find the latest restorable Q&A question
export async function GET(req: NextRequest) {
  try {
    const interactionId = req.nextUrl.searchParams.get('interaction_id');

    if (!interactionId) {
      return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
    }

    const { data: question, error } = await supabase
      .from('qa_questions')
      .select('*, participants(display_name), qa_upvotes(id, participant_id)')
      .eq('interaction_id', interactionId)
      .eq('answered', true)
      .order('answered_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: question || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load restorable question.' }, { status: 500 });
  }
}

// POST /api/qa/restore-last — restore the most recently removed Q&A question
export async function POST(req: NextRequest) {
  try {
    const { interaction_id } = await req.json();

    if (!interaction_id) {
      return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
    }

    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('id, status')
      .eq('id', interaction_id)
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found.' }, { status: 404 });
    }

    if (interaction.status === 'archived') {
      return NextResponse.json({ error: 'This interaction has been deleted.' }, { status: 410 });
    }

    const { data: removedQuestions, error: questionError } = await supabase
      .from('qa_questions')
      .select('*')
      .eq('interaction_id', interaction_id)
      .or('answered.eq.true,answered_at.not.is.null,is_hidden.eq.true')
      .order('answered_at', { ascending: false, nullsFirst: false })
      .order('deleted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (questionError) {
      return NextResponse.json({ error: questionError.message }, { status: 500 });
    }

    const question = removedQuestions?.[0];
    if (!question) {
      return NextResponse.json({ error: 'No question available to restore.' }, { status: 404 });
    }

    const { data: restored, error: restoreError } = await supabase
      .from('qa_questions')
      .update({
        answered: false,
        answered_at: null,
        is_hidden: false,
        deleted_at: null,
        deleted_by: null,
      })
      .eq('id', question.id)
      .select('*, participants(display_name), qa_upvotes(id, participant_id)')
      .single();

    if (restoreError) {
      return NextResponse.json({ error: restoreError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Question restored.',
      question: restored,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to restore question.' }, { status: 500 });
  }
}
