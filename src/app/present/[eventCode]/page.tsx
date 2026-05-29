'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import LiveResultsView from '@/components/live-results/LiveResultsView';

export default function PublicPresentPage() {
  const params = useParams<{ eventCode: string }>();
  const searchParams = useSearchParams();
  const eventCode = Array.isArray(params.eventCode) ? params.eventCode[0] : params.eventCode;
  const officePresenter = searchParams.get('officePresenter') === '1';

  useEffect(() => {
    if (!officePresenter) return;

    const enterFullscreen = async () => {
      try {
        if (document.fullscreenEnabled && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };

    const closePresenter = async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
      window.close();
      window.setTimeout(() => {
        if (!window.closed && window.history.length > 1) window.history.back();
      }, 120);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePresenter();
    };

    enterFullscreen();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [officePresenter]);

  return <LiveResultsView eventCode={eventCode} publicMode />;
}
