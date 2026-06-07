'use client';

import { useState, useEffect, useCallback } from 'react';

const PARTICIPANT_KEY = 'slideengage_participant';

export interface ParticipantSession {
  id: string;
  event_id: string;
  session_token: string;
  display_name: string;
  event_code: string;
  event_name: string;
}

export function useParticipant() {
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(PARTICIPANT_KEY);
    if (stored) {
      try {
        setParticipant(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const joinEvent = useCallback(async (eventCode: string, displayName?: string) => {
    const res = await fetch('/api/events/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_code: eventCode.toUpperCase().replace('#', ''), display_name: displayName || 'Anonymous' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to join');
    const session: ParticipantSession = {
      id: data.participant.id,
      event_id: data.participant.event_id,
      session_token: data.participant.session_token,
      display_name: data.participant.display_name,
      event_code: data.event.event_code,
      event_name: data.event.event_name,
    };
    setParticipant(session);
    localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(session));
    return session;
  }, []);

  const leaveEvent = useCallback(() => {
    setParticipant(null);
    localStorage.removeItem(PARTICIPANT_KEY);
  }, []);

  return { participant, loading, joinEvent, leaveEvent };
}
