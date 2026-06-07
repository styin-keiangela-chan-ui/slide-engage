import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function archiveMigrationMessage(message: string) {
  if (
    message.includes('interactions_status_check') ||
    message.includes('archived_at') ||
    message.includes('deleted_at')
  ) {
    return 'Interaction archive is not enabled in Supabase yet. Run src/lib/supabase/migrations/20260606_interaction_archive_bin.sql in Supabase SQL Editor, then try again.';
  }
  return message;
}

async function deleteInteractionResults(interactionId: string) {
  const { data: deletedResponses, error: responseError } = await supabase
    .from('responses')
    .delete()
    .eq('interaction_id', interactionId)
    .select('id');

  if (responseError) throw new Error(responseError.message);

  const { data: qaQuestions, error: qaReadError } = await supabase
    .from('qa_questions')
    .select('id')
    .eq('interaction_id', interactionId);

  if (qaReadError) throw new Error(qaReadError.message);

  const questionIds = (qaQuestions || []).map(question => question.id);
  let deletedUpvotesCount = 0;
  let deletedQuestionsCount = 0;

  if (questionIds.length > 0) {
    const { data: deletedUpvotes, error: upvoteError } = await supabase
      .from('qa_upvotes')
      .delete()
      .in('question_id', questionIds)
      .select('id');

    if (upvoteError) throw new Error(upvoteError.message);
    deletedUpvotesCount = deletedUpvotes?.length || 0;
  }

  const { data: deletedQuestions, error: questionError } = await supabase
    .from('qa_questions')
    .delete()
    .eq('interaction_id', interactionId)
    .select('id');

  if (questionError) throw new Error(questionError.message);
  deletedQuestionsCount = deletedQuestions?.length || 0;

  return {
    responses_deleted: deletedResponses?.length || 0,
    qa_questions_deleted: deletedQuestionsCount,
    qa_upvotes_deleted: deletedUpvotesCount,
  };
}

function clearPresentationReferences(config: Record<string, any>, timestamp: string) {
  const next = { ...(config || {}) };
  [
    'google_slides_slide_id',
    'google_slides_presentation_id',
    'powerpoint_slide_id',
    'powerpoint_shape_id',
    'powerpoint_result_shape_id',
    'slide_id',
    'shape_id',
  ].forEach(key => {
    delete next[key];
  });
  next.deleted_from_presentations_at = timestamp;
  next.vote_count = 0;
  return next;
}

// GET /api/interactions?event_id=xxx
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  const view = req.nextUrl.searchParams.get('view');
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';
  if (!eventId) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  let query = supabase
    .from('interactions')
    .select('*, interaction_options(*)')
    .eq('event_id', eventId)
    .order('position', { ascending: true });

  if (view === 'archive' || includeArchived) {
    query = query.eq('status', 'archived');
  } else {
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: archiveMigrationMessage(error.message) }, { status: 500 });
  return NextResponse.json({ interactions: data });
}

// POST /api/interactions — create new interaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id, type, title, config, options } = body;

    if (!event_id) {
      return NextResponse.json({ error: 'Please select or create an event before adding interactions.' }, { status: 400 });
    }

    if (!type || !title) {
      return NextResponse.json({ error: 'type and title required' }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Please select or create an event before adding interactions.' }, { status: 400 });
    }

    if (event.status === 'archived') {
      return NextResponse.json({ error: 'Restore this event before adding interactions.' }, { status: 409 });
    }

    // Get current max position
    const { data: existing } = await supabase
      .from('interactions')
      .select('position')
      .eq('event_id', event_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

    // Create interaction
    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        event_id,
        type,
        title,
        status: 'draft',
        config: config || {},
        position: nextPos,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Create options if provided (for polls/quizzes)
    if (options && options.length > 0) {
      const letters = 'ABCDEFGHIJ';
      const optionRows = options.map((opt: any, i: number) => ({
        interaction_id: interaction.id,
        option_text: opt.option_text,
        option_letter: letters[i] || String(i + 1),
        is_correct: opt.is_correct || false,
        position: i,
      }));

      const { error: optError } = await supabase
        .from('interaction_options')
        .insert(optionRows);

      if (optError) {
        // Rollback interaction
        await supabase.from('interactions').delete().eq('id', interaction.id);
        return NextResponse.json({ error: optError.message }, { status: 500 });
      }
    }

    // Fetch with options
    const { data: full } = await supabase
      .from('interactions')
      .select('*, interaction_options(*)')
      .eq('id', interaction.id)
      .single();

    return NextResponse.json({ interaction: full }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/interactions — update interaction (status, title, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, options, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Interaction id required' }, { status: 400 });
    }

    const { data: existingInteraction, error: existingError } = await supabase
      .from('interactions')
      .select('id, status')
      .eq('id', id)
      .single();

    if (existingError || !existingInteraction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    const wantsRestore = updates.restore === true || (existingInteraction.status === 'archived' && updates.status && updates.status !== 'archived');
    delete updates.restore;

    if (existingInteraction.status === 'archived' && !wantsRestore) {
      return NextResponse.json({ error: 'This interaction has been deleted.' }, { status: 410 });
    }

    if (updates.status === 'live') {
      const { data: targetInteraction, error: targetError } = await supabase
        .from('interactions')
        .select('event_id')
        .eq('id', id)
        .single();

      if (targetError || !targetInteraction) {
        return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
      }

      const { data: parentEvent, error: eventError } = await supabase
        .from('events')
        .select('status')
        .eq('id', targetInteraction.event_id)
        .single();

      if (eventError || !parentEvent) {
        return NextResponse.json({ error: 'Event not found for this interaction.' }, { status: 404 });
      }

      if (parentEvent.status !== 'live') {
        return NextResponse.json(
          { error: 'Make this event active before starting an interaction.' },
          { status: 409 }
        );
      }

    }

    const updatePayload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
    if (wantsRestore) {
      updatePayload.status = updates.status || 'closed';
      updatePayload.archived_at = null;
      updatePayload.deleted_at = null;
    }

    const { data, error } = await supabase
      .from('interactions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (Array.isArray(options)) {
      const { error: deleteError } = await supabase
        .from('interaction_options')
        .delete()
        .eq('interaction_id', id);

      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

      if (options.length > 0) {
        const letters = 'ABCDEFGHIJ';
        const optionRows = options.map((opt: any, i: number) => ({
          interaction_id: id,
          option_text: opt.option_text,
          option_letter: letters[i] || String(i + 1),
          is_correct: opt.is_correct || false,
          position: i,
        }));

        const { error: optionError } = await supabase
          .from('interaction_options')
          .insert(optionRows);

        if (optionError) return NextResponse.json({ error: optionError.message }, { status: 500 });
      }
    }

    const { data: full } = await supabase
      .from('interactions')
      .select('*, interaction_options(*)')
      .eq('id', id)
      .single();

    return NextResponse.json({ interaction: full || data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/interactions?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';
  const timestamp = new Date().toISOString();

  const { data: interaction, error: readError } = await supabase
    .from('interactions')
    .select('id, status, config')
    .eq('id', id)
    .single();

  if (readError || !interaction) {
    return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
  }

  try {
    const resultCounts = await deleteInteractionResults(id);

    if (permanent) {
      const { data: deletedOptions, error: optionError } = await supabase
        .from('interaction_options')
        .delete()
        .eq('interaction_id', id)
        .select('id');

      if (optionError) throw new Error(optionError.message);

      const { error: deleteError } = await supabase
        .from('interactions')
        .delete()
        .eq('id', id);

      if (deleteError) throw new Error(deleteError.message);

      console.log('[SlideEngage] interaction permanently deleted', {
        interaction_id: id,
        responses_deleted: resultCounts.responses_deleted,
        qa_questions_deleted: resultCounts.qa_questions_deleted,
        qa_upvotes_deleted: resultCounts.qa_upvotes_deleted,
        options_deleted: deletedOptions?.length || 0,
        timestamp,
      });

      return NextResponse.json({
        success: true,
        permanent: true,
        interaction_id: id,
        options_deleted: deletedOptions?.length || 0,
        timestamp,
        ...resultCounts,
      });
    }

    const { error: updateError } = await supabase
      .from('interactions')
      .update({
        status: 'archived',
        archived_at: timestamp,
        deleted_at: timestamp,
        updated_at: timestamp,
        config: clearPresentationReferences((interaction as any).config || {}, timestamp),
      })
      .eq('id', id);

    if (updateError) throw new Error(updateError.message);

    console.log('[SlideEngage] interaction archived', {
      interaction_id: id,
      was_live: interaction.status === 'live',
      responses_deleted: resultCounts.responses_deleted,
      qa_questions_deleted: resultCounts.qa_questions_deleted,
      qa_upvotes_deleted: resultCounts.qa_upvotes_deleted,
      timestamp,
    });

    return NextResponse.json({
      success: true,
      archived: true,
      message: 'Interaction deleted successfully.',
      interaction_id: id,
      timestamp,
      ...resultCounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: archiveMigrationMessage(error.message || 'Unable to delete interaction.') }, { status: 500 });
  }
}
