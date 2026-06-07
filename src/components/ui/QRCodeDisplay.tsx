'use client';

import { useState } from 'react';
import { isLocalUrl, normalizePublicUrl } from '@/lib/public-url';

interface QRCodeDisplayProps {
  eventCode?: string;
  size?: number;
}

const PUBLIC_URL_ERROR = 'Public app URL is required before generating QR codes for students.';

export default function QRCodeDisplay({ eventCode, size = 200 }: QRCodeDisplayProps) {
  const [showModal, setShowModal] = useState(false);
  const code = eventCode?.replace('#', '').toUpperCase() || '';
  const publicBaseUrl = normalizePublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const publicUrlReady = Boolean(publicBaseUrl && !isLocalUrl(publicBaseUrl));
  const joinUrl = code && publicUrlReady ? `${publicBaseUrl}/join?code=${encodeURIComponent(code)}` : '';
  const qrUrl = code && publicUrlReady ? `/api/qrcode?code=${encodeURIComponent(code)}&format=svg` : '';

  const handleDownload = async () => {
    if (!code || !publicUrlReady) return;
    const res = await fetch(`/api/qrcode?code=${encodeURIComponent(code)}&format=png`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SlideEngage-QR-${code}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
  };

  if (!code) {
    return (
      <div className="rounded-xl border border-[#E2EBE6] bg-white p-4 text-center text-sm font-semibold text-[#6B7B8D]">
        Please select an event before generating QR code.
      </div>
    );
  }

  if (!publicUrlReady) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
        {PUBLIC_URL_ERROR}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          className="rounded-xl border-2 border-[#E2EBE6] bg-white p-5 transition hover:shadow"
          onClick={() => setShowModal(true)}
          title="Click to enlarge"
        >
          <img src={qrUrl} alt={`QR code for event #${code}`} width={size} height={size} className="block bg-white" />
        </button>

        <div className="inline-block rounded-xl border-2 border-dashed border-[#2D8A4E] bg-[#EAF7EF] px-5 py-2 font-mono text-xl font-extrabold text-[#2D8A4E]">
          #{code}
        </div>

        <div className="max-w-[250px] break-all text-center text-xs text-[#6B7B8D]">{joinUrl}</div>

        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="rounded-[7px] border border-[#E2EBE6] px-4 py-1.5 text-xs font-semibold transition hover:border-[#2D8A4E] hover:text-[#2D8A4E]"
          >
            Copy link
          </button>
          <button
            onClick={handleDownload}
            className="rounded-[7px] border border-[#E2EBE6] px-4 py-1.5 text-xs font-semibold transition hover:border-[#2D8A4E] hover:text-[#2D8A4E]"
          >
            Download QR
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[300] flex cursor-pointer flex-col items-center justify-center gap-6 bg-black/60" onClick={() => setShowModal(false)}>
          <div className="rounded-3xl bg-white p-8 shadow-xl" onClick={event => event.stopPropagation()}>
            <img src={qrUrl} alt={`QR code for event #${code}`} width={400} height={400} className="block bg-white" />
            <div className="mt-4 text-center">
              <div className="font-mono text-3xl font-extrabold text-[#2D8A4E]">#{code}</div>
              <div className="mt-1 text-sm text-[#6B7B8D]">Scan to join at Slide Engage</div>
              <div className="mt-0.5 text-sm font-semibold text-[#1A1A2E]">{joinUrl}</div>
            </div>
          </div>
          <button onClick={() => setShowModal(false)} className="rounded-full bg-white px-6 py-2 font-semibold text-[#1A1A2E]">
            Close
          </button>
        </div>
      )}
    </>
  );
}
