import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function safeLecturer(lecturer: any) {
  if (!lecturer) return null;
  const { password_hash, ...safe } = lecturer;
  return safe;
}

function eventDateColumnError() {
  return NextResponse.json(
    {
      error:
        'Event dates could not be saved because the events table is missing start_date/end_date. Run src/lib/supabase/migrations/20260520_add_event_dates.sql in Supabase, then reload the schema cache.',
    },
    { status: 500 }
  );
}

function eventStatusConstraintError() {
  return NextResponse.json(
    {
      error:
        'Archive is not enabled in your Supabase events table yet. Run src/lib/supabase/migrations/20260522_event_status_live_closed_archived.sql in Supabase SQL Editor, then try Archive again.',
    },
    { status: 500 }
  );
}

function generateEventCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function uniqueEventCode(preferredCode?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = (attempt === 0 && preferredCode ? preferredCode : generateEventCode()).toUpperCase().replace('#', '');
    const { data } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', code)
      .maybeSingle();

    if (!data) return code;
  }

  return `${Date.now()}`.slice(-6).toUpperCase();
}

// GET /api/events — list events for a lecturer
export async function GET(req: NextRequest) {
  const lecturerId = req.nextUrl.searchParams.get('lecturer_id');
  const eventId = req.nextUrl.searchParams.get('id');
  const view = req.nextUrl.searchParams.get('view');
  const includeArchived =
    req.nextUrl.searchParams.get('include_archived') === 'true'
    || req.nextUrl.searchParams.get('includeArchived') === 'true'
    || view === 'archive';

  if (eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  }

  if (!lecturerId) {
    return NextResponse.json({ error: 'lecturer_id required' }, { status: 400 });
  }

  let query = supabase
    .from('events')
    .select('*, lecturers(id, email, name)')
    .eq('lecturer_id', lecturerId)
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.neq('status', 'archived');
  } else if (view === 'archive') {
    query = query.eq('status', 'archived');
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}

// HEAD /api/events?cohost_email=xxx — check whether invitee has a SlideEngage account
export async function HEAD(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('cohost_email')?.trim().toLowerCase();
  if (!email) return new NextResponse(null, { status: 400 });

  const { data, error } = await supabase
    .from('lecturers')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

// PUT /api/events — invite a registered user as an event collaborator
export async function PUT(req: NextRequest) {
  try {
    const {
      event_id,
      email,
      role = 'guest',
      can_manage_interactions = true,
      can_view_results = true,
    } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!event_id) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400 });
    }

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Enter the co-host email.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lecturers')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'This Gmail is not registered with SlideEngage yet.' }, { status: 404 });
    }

    const { data: collaborator, error: collaboratorError } = await supabase
      .from('event_collaborators')
      .upsert({
        event_id,
        user_id: data.id,
        role,
        can_manage_interactions,
        can_view_results,
      }, { onConflict: 'event_id,user_id' })
      .select('*, lecturers(id, email, name)')
      .single();

    if (collaboratorError) {
      return NextResponse.json({ error: collaboratorError.message }, { status: 500 });
    }

    return NextResponse.json({ collaborator, lecturer: safeLecturer(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/events — create a new event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, lecturer_id, event_name, event_code, allow_anonymous, show_results, start_date, end_date } = body;

    if (action === 'duplicate') {
      const { source_event_id, event_name: duplicateName, event_code: duplicateCode, start_date: duplicateStart, end_date: duplicateEnd } = body;

      if (!source_event_id || !lecturer_id || !duplicateName) {
        return NextResponse.json({ error: 'source_event_id, lecturer_id, and event_name required' }, { status: 400 });
      }

      const { data: sourceEvent, error: sourceError } = await supabase
        .from('events')
        .select('*')
        .eq('id', source_event_id)
        .single();

      if (sourceError || !sourceEvent) {
        return NextResponse.json({ error: 'Source event not found' }, { status: 404 });
      }

      const code = await uniqueEventCode(duplicateCode);
      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          lecturer_id,
          event_name: duplicateName,
          event_code: code,
          status: 'closed',
          allow_anonymous: sourceEvent.allow_anonymous,
          show_results: sourceEvent.show_results,
          start_date: duplicateStart || sourceEvent.start_date || null,
          end_date: duplicateEnd || sourceEvent.end_date || duplicateStart || null,
        })
        .select('*, lecturers(id, email, name)')
        .single();

      if (eventError && /start_date|end_date|schema cache/i.test(eventError.message)) return eventDateColumnError();
      if (eventError && /events_status_check|check constraint|violates check/i.test(eventError.message)) return eventStatusConstraintError();
      if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

      const { data: sourceInteractions, error: interactionError } = await supabase
        .from('interactions')
        .select('*, interaction_options(*)')
        .eq('event_id', source_event_id)
        .order('position', { ascending: true });

      if (interactionError) return NextResponse.json({ error: interactionError.message }, { status: 500 });

      for (const interaction of sourceInteractions || []) {
        const { data: createdInteraction, error: createInteractionError } = await supabase
          .from('interactions')
          .insert({
            event_id: newEvent.id,
            type: interaction.type,
            title: interaction.title,
            status: 'draft',
            config: interaction.config || {},
            position: interaction.position || 0,
          })
          .select()
          .single();

        if (createInteractionError) return NextResponse.json({ error: createInteractionError.message }, { status: 500 });

        const options = (interaction.interaction_options || []).map((option: any) => ({
          interaction_id: createdInteraction.id,
          option_text: option.option_text,
          option_letter: option.option_letter,
          is_correct: option.is_correct,
          position: option.position,
        }));

        if (options.length > 0) {
          const { error: optionsError } = await supabase.from('interaction_options').insert(options);
          if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ event: newEvent }, { status: 201 });
    }

    if (!lecturer_id || !event_name || !event_code) {
      return NextResponse.json({ error: 'lecturer_id, event_name, and event_code required' }, { status: 400 });
    }

    const code = event_code.toUpperCase().replace('#', '');

    // Check if code is taken
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', code)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Event code already in use' }, { status: 409 });
    }

    const insertPayload = {
      lecturer_id,
      event_name,
      event_code: code,
      status: 'closed',
      allow_anonymous: allow_anonymous ?? true,
      show_results: show_results ?? 'after_voting',
      start_date: start_date || null,
      end_date: end_date || null,
    };

    const { data, error } = await supabase
      .from('events')
      .insert(insertPayload)
      .select()
      .single();

    if (error && /start_date|end_date|schema cache/i.test(error.message)) return eventDateColumnError();
    if (error && /events_status_check|check constraint|violates check/i.test(error.message)) return eventStatusConstraintError();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/events — update event status or settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, transfer_email, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event id required' }, { status: 400 });
    }

    if (transfer_email) {
      const normalizedEmail = String(transfer_email).trim().toLowerCase();
      const { data: newOwner, error: ownerError } = await supabase
        .from('lecturers')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (ownerError || !newOwner) {
        return NextResponse.json({ error: 'User not found in SlideEngage.' }, { status: 404 });
      }

      updates.lecturer_id = newOwner.id;
    }

    const { data, error } = await supabase
      .from('events')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, lecturers(id, email, name)')
      .single();

    if (error && /start_date|end_date|schema cache/i.test(error.message)) return eventDateColumnError();
    if (error && /events_status_check|check constraint|violates check/i.test(error.message)) return eventStatusConstraintError();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/events?id=xxx — archive by default; permanently delete only when explicitly requested
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 });
  }

  if (permanent) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, deleted: true });
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error && /events_status_check|check constraint|violates check/i.test(error.message)) return eventStatusConstraintError();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, archived: true });
}
