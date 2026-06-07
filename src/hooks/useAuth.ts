'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Lecturer, Event } from '@/lib/types';

const AUTH_KEY = 'slideengage_lecturer';
const EVENT_KEY = 'slideengage_event';

export function useAuth() {
  const [lecturer, setLecturer] = useState<Lecturer | null>(null);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      try {
        setLecturer(JSON.parse(stored));
      } catch {}
    }
    const storedEvent = localStorage.getItem(EVENT_KEY);
    if (storedEvent) {
      try {
        const parsedEvent = JSON.parse(storedEvent) as Event;
        if (parsedEvent.status === 'archived') {
          localStorage.removeItem(EVENT_KEY);
        } else {
          setCurrentEvent(parsedEvent);
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!lecturer || !currentEvent?.id) return;

    let cancelled = false;
    fetch(`/api/events?id=${encodeURIComponent(currentEvent.id)}`, { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Selected event unavailable')))
      .then(data => {
        if (cancelled) return;
        const event = data.event as Event | null;
        if (!event || event.status === 'archived') {
          setCurrentEvent(null);
          localStorage.removeItem(EVENT_KEY);
          return;
        }
        if (JSON.stringify(event) !== JSON.stringify(currentEvent)) {
          setCurrentEvent(event);
          localStorage.setItem(EVENT_KEY, JSON.stringify(event));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentEvent(null);
        localStorage.removeItem(EVENT_KEY);
      });

    return () => {
      cancelled = true;
    };
  }, [lecturer, currentEvent?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setLecturer(data.lecturer);
    localStorage.setItem(AUTH_KEY, JSON.stringify(data.lecturer));
    return data.lecturer as Lecturer;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setLecturer(data.lecturer);
    localStorage.setItem(AUTH_KEY, JSON.stringify(data.lecturer));
    return data.lecturer as Lecturer;
  }, []);

  const logout = useCallback(() => {
    setLecturer(null);
    setCurrentEvent(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(EVENT_KEY);
  }, []);

  const selectEvent = useCallback((event: Event) => {
    if (event.status === 'archived') {
      setCurrentEvent(null);
      localStorage.removeItem(EVENT_KEY);
      return;
    }
    setCurrentEvent(event);
    localStorage.setItem(EVENT_KEY, JSON.stringify(event));
  }, []);

  const clearSelectedEvent = useCallback(() => {
    setCurrentEvent(null);
    localStorage.removeItem(EVENT_KEY);
  }, []);

  return { lecturer, currentEvent, loading, login, register, logout, selectEvent, clearSelectedEvent };
}
