import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/responses?interaction_id=xxx
export async function GET(req: NextRequest) {
  const interactionId = req.nextUrl.searchParams.get('interaction_id');
  if (!interactionId) {
    return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('responses')
    .select('*, participants(display_name)')
    .eq('interaction_id', interactionId)
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ responses: data });
}

// POST /api/responses — submit a response (vote, answer, word, rating)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interaction_id, participant_id, option_id, text_value, rating_value } = body;

    if (!interaction_id || !participant_id) {
      return NextResponse.json({ error: 'interaction_id and participant_id required' }, { status: 400 });
    }

    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .select('status, config')
      .eq('id', interaction_id)
      .single();

    if (interactionError || !interaction) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    const config = (interaction.config || {}) as Record<string, any>;
    if (interaction.status !== 'live' || config.voting_open === false) {
      return NextResponse.json({ error: 'Voting is closed for this interaction.' }, { status: 403 });
    }

    // Check if already responded (for polls — one vote per person)
    if (option_id) {
      const { data: existing } = await supabase
        .from('responses')
        .select('id')
        .eq('interaction_id', interaction_id)
        .eq('participant_id', participant_id)
        .not('option_id', 'is', null)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'You have already voted on this' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('responses')
      .insert({
        interaction_id,
        participant_id,
        option_id: option_id || null,
        text_value: text_value || null,
        rating_value: rating_value || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ response: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/responses?interaction_id=xxx — reset all results for an interaction
export async function DELETE(req: NextRequest) {
  const interactionId = req.nextUrl.searchParams.get('interaction_id');
  if (!interactionId) {
    return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('responses')
    .delete()
    .eq('interaction_id', interactionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
