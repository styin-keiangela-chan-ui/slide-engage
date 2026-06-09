import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/qa/upvote — toggle upvote on a question
export async function POST(req: NextRequest) {
  try {
    const { question_id, participant_id, voter_role } = await req.json();

    if (!question_id) {
      return NextResponse.json({ error: 'question_id required' }, { status: 400 });
    }

    let voterId = participant_id;

    if (!voterId && voter_role === 'lecturer') {
      const { data: question, error: questionError } = await supabase
        .from('qa_questions')
        .select('id, interactions(event_id)')
        .eq('id', question_id)
        .single();

      const interactionRelation = (question as any)?.interactions;
      const eventId = Array.isArray(interactionRelation)
        ? interactionRelation[0]?.event_id
        : interactionRelation?.event_id;

      if (questionError || !eventId) {
        return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
      }

      const sessionToken = `lecturer-qa-like-${eventId}`;
      const { data: existingLecturerParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (existingLecturerParticipant?.id) {
        voterId = existingLecturerParticipant.id;
      } else {
        const { data: lecturerParticipant, error: participantError } = await supabase
          .from('participants')
          .insert({
            event_id: eventId,
            session_token: sessionToken,
            display_name: 'Lecturer',
          })
          .select('id')
          .single();

        if (participantError) {
          return NextResponse.json({ error: participantError.message }, { status: 500 });
        }

        voterId = lecturerParticipant.id;
      }
    }

    if (!voterId) {
      return NextResponse.json({ error: 'participant_id required' }, { status: 400 });
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from('qa_upvotes')
      .select('id')
      .eq('question_id', question_id)
      .eq('participant_id', voterId)
      .maybeSingle();

    if (existing) {
      // Remove upvote (toggle off)
      await supabase.from('qa_upvotes').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed', participant_id: voterId });
    } else {
      // Add upvote
      const { error } = await supabase
        .from('qa_upvotes')
        .insert({ question_id, participant_id: voterId });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ action: 'added', participant_id: voterId }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
