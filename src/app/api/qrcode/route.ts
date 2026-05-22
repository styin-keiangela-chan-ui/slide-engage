import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getConfiguredPublicAppUrl } from '@/lib/public-url';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const format = req.nextUrl.searchParams.get('format') || 'png';
  const rawBaseUrl = getConfiguredPublicAppUrl();

  if (!code) {
    return NextResponse.json({ error: 'Event code required' }, { status: 400 });
  }

  if (!rawBaseUrl) {
    return NextResponse.json(
      { error: 'Public app URL is required before generating QR codes for students.' },
      { status: 400 }
    );
  }

  let baseUrl: string;
  try {
    const parsed = new URL(rawBaseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid app URL protocol');
    }
    baseUrl = parsed.origin;
  } catch {
    return NextResponse.json({ error: 'Invalid base_url' }, { status: 400 });
  }

  const cleanCode = code.toUpperCase().replace('#', '');
  const joinUrl = `${baseUrl}/join?code=${encodeURIComponent(cleanCode)}`;

  try {
    if (format === 'svg') {
      const svg = await QRCode.toString(joinUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        width: 512,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      });
    }

    const pngBuffer = await QRCode.toBuffer(joinUrl, {
      errorCorrectionLevel: 'M',
      width: 800,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
