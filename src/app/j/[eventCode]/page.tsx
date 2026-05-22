import { redirect } from 'next/navigation';

export default async function ShortJoinPage({ params }: { params: Promise<{ eventCode: string }> }) {
  const { eventCode } = await params;
  const code = eventCode.replace('#', '').toUpperCase();
  redirect(`/join?code=${encodeURIComponent(code)}`);
}
