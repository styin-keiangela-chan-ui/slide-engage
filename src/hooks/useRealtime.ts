'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Hook to subscribe to real-time changes on a Supabase table
export function useRealtime<T>(
  table: string,
  filter?: { column: string; value: string },
  callback?: (payload: any) => void
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    // Initial fetch
    async function fetchData() {
      let query = supabase.from(table).select('*');
      if (filter) {
        query = query.eq(filter.column, filter.value);
      }
      const { data: rows, error } = await query;
      if (!error && rows) {
        setData(rows as T[]);
      }
      setLoading(false);
    }

    fetchData();

    // Subscribe to real-time changes
    const channelFilter = filter
      ? `${table}:${filter.column}=eq.${filter.value}`
      : table;

    channel = supabase
      .channel(`realtime-${channelFilter}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          if (callback) callback(payload);

          // Auto-update local state
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new as T]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev =>
              prev.map(item =>
                (item as any).id === (payload.new as any).id ? payload.new as T : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setData(prev =>
              prev.filter(item => (item as any).id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value]);

  return { data, loading, setData };
}
