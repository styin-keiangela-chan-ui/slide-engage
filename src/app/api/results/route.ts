import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/results?interaction_id=xxx — aggregated results for an interaction
export async function GET(req: NextRequest) {
  const interactionId = req.nextUrl.searchParams.get('interaction_id');
  if (!interactionId) {
    return NextResponse.json({ error: 'interaction_id required' }, { status: 400 });
  }

  // Get interaction with options
  const { data: interaction, error: intError } = await supabase
    .from('interactions')
    .select('*, interaction_options(*)')
    .eq('id', interactionId)
    .single();

  if (intError || !interaction) {
    return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
  }

  if (
    interaction.status === 'archived' ||
    (interaction as any).archived_at ||
    (interaction as any).deleted_at
  ) {
    return NextResponse.json({ error: 'This interaction has been deleted.' }, { status: 410 });
  }

  const config = (interaction.config || {}) as Record<string, any>;
  if (config.results_visible === false) {
    return NextResponse.json({
      interaction,
      results: [],
      total_responses: 0,
      hidden: true,
    });
  }

  // Get all responses
  const { data: responses, error: resError } = await supabase
    .from('responses')
    .select('*, participants(display_name)')
    .eq('interaction_id', interactionId);

  if (resError) return NextResponse.json({ error: resError.message }, { status: 500 });

  const totalResponses = responses?.length || 0;

  // Build results based on type
  if (interaction.type === 'poll' || interaction.type === 'quiz') {
    const options = interaction.interaction_options || [];
    const results = options
      .sort((a: any, b: any) => a.position - b.position)
      .map((opt: any) => {
        const count = (responses || []).filter(r => r.option_id === opt.id).length;
        return {
          option_id: opt.id,
          option_text: opt.option_text,
          option_letter: opt.option_letter,
          is_correct: opt.is_correct,
          count,
          percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        };
      });

    return NextResponse.json({
      interaction,
      results,
      total_responses: totalResponses,
    });
  }

  if (interaction.type === 'word_cloud') {
    // Aggregate word frequencies
    const wordCounts: Record<string, number> = {};
    (responses || []).forEach(r => {
      if (r.text_value) {
        const word = r.text_value.toLowerCase().trim();
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    const words = Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      interaction,
      results: words,
      total_responses: totalResponses,
    });
  }

  if (interaction.type === 'feedback') {
    // Average ratings and text responses
    const ratings = (responses || []).filter(r => r.rating_value !== null);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.rating_value || 0), 0) / ratings.length
      : 0;

    const textResponses = (responses || [])
      .filter(r => r.text_value)
      .map(r => ({
        text: r.text_value,
        display_name: r.participants?.display_name || 'Anonymous',
        submitted_at: r.submitted_at,
      }));

    return NextResponse.json({
      interaction,
      results: {
        average_rating: Math.round(avgRating * 10) / 10,
        rating_count: ratings.length,
        text_responses: textResponses,
      },
      total_responses: totalResponses,
    });
  }

  // Default: return raw responses
  return NextResponse.json({
    interaction,
    results: responses,
    total_responses: totalResponses,
  });
}
