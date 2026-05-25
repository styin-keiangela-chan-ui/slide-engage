'use client';

import { useParams } from 'next/navigation';
import LiveResultsView from '@/components/live-results/LiveResultsView';

export default function PublicPresentPage() {
  const params = useParams<{ eventCode: string }>();
  const eventCode = Array.isArray(params.eventCode) ? params.eventCode[0] : params.eventCode;

  return <LiveResultsView eventCode={eventCode} publicMode />;
}
