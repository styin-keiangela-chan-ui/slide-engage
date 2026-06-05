'use client';

import { useEffect, useMemo, useState } from 'react';
import LiveResultsView from '@/components/live-results/LiveResultsView';
import { createClient } from '@/lib/supabase/client';
import type { Event } from '@/lib/types';

type Props = {
  params: Promise<{
    eventId: string;
    interactionId: string;
  }>;
};

export default function InteractionLiveResultPage({ params }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [eventId, setEventId] = useState('');
  const [interactionId, setInteractionId] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closeHint, setCloseHint] = useState('');

  useEffect(() => {
    params.then(value => {
      setEventId(value.eventId);
      setInteractionId(value.interactionId);
    });
  }, [params]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;

    async function loadEvent() {
      setLoading(true);
      setError('');
      const { data, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .neq('status', 'archived')
        .maybeSingle();

      if (cancelled) return;
      if (eventError) {
        setError(eventError.message);
        setEvent(null);
      } else {
        setEvent((data as Event | null) || null);
        if (!data) setError('Event not found.');
      }
      setLoading(false);
    }

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [eventId, supabase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.fullscreenElement) return;
      window.close();
      setCloseHint('You may close this tab to return to your presentation.');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0F172A] p-8 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2DD36F] border-t-transparent" />
          <p className="text-lg font-bold">Loading live results...</p>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0F172A] p-8 text-white">
        <div className="max-w-xl rounded-2xl border border-white/15 bg-white/10 p-8 text-center shadow-2xl">
          <h1 className="text-3xl font-black">Live results unavailable</h1>
          <p className="mt-3 text-slate-300">{error || 'Event not found.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A]">
      <div className="fixed right-5 top-5 z-[60] rounded-full border border-white/15 bg-black/35 px-4 py-2 text-sm font-bold text-white backdrop-blur">
        Press ESC to return to presentation
      </div>
      {closeHint && (
        <div className="fixed left-1/2 top-5 z-[60] -translate-x-1/2 rounded-full bg-[#168A3A] px-4 py-2 text-sm font-bold text-white shadow-lg">
          {closeHint}
        </div>
      )}
      <LiveResultsView event={event} preferredInteractionId={interactionId} slidesOnly publicMode />
    </main>
  );
}
