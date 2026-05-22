import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/interactions?event_id=xxx
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get('event_id');
  if (!eventId) {
    return NextResponse.json({ error: 'event_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('interactions')
    .select('*, interaction_options(*)')
    .eq('event_id', eventId)
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { data, error } = await supabase
      .from('interactions')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

  const { error } = await supabase.from('interactions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
