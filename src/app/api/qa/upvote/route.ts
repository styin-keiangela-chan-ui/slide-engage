import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/qa/upvote — toggle upvote on a question
export async function POST(req: NextRequest) {
  try {
    const { question_id, participant_id } = await req.json();

    if (!question_id || !participant_id) {
      return NextResponse.json({ error: 'question_id and participant_id required' }, { status: 400 });
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from('qa_upvotes')
      .select('id')
      .eq('question_id', question_id)
      .eq('participant_id', participant_id)
      .single();

    if (existing) {
      // Remove upvote (toggle off)
      await supabase.from('qa_upvotes').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    } else {
      // Add upvote
      const { error } = await supabase
        .from('qa_upvotes')
        .insert({ question_id, participant_id });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ action: 'added' }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
