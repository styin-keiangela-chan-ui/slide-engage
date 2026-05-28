import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';
import QRCode from 'qrcode';

type InteractionOption = {
  option_text?: string;
  option_letter?: string;
  is_correct?: boolean;
};

type InteractionSlideRequest = {
  interactionId?: string;
  interactionType: string;
  interactionLabel?: string;
  question: string;
  options?: InteractionOption[];
  eventCode: string;
  joinUrl: string;
  liveUrl: string;
  results?: any;
  totalResponses?: number;
};

type PreviewRow = {
  label: string;
  percentage?: number;
  count: number;
  correct?: boolean;
};

const colors = ['168A3A', '1A6BB5', 'D46B08', '8B1A4A', '7C3AED', '0F766E'];

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: unknown, max = 92) {
  const text = String(value ?? '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function svgText(value: unknown, x: number, y: number, options: {
  size?: number;
  weight?: number;
  color?: string;
  anchor?: string;
  family?: string;
  opacity?: number;
  rotate?: number;
} = {}) {
  const transform = options.rotate ? ` transform="rotate(${options.rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}"${transform} font-family="${options.family || 'Aptos, Arial, sans-serif'}" font-size="${options.size || 28}" font-weight="${options.weight || 400}" fill="#${options.color || '1A1A2E'}" text-anchor="${options.anchor || 'start'}" opacity="${options.opacity ?? 1}">${xmlEscape(value)}</text>`;
}

function svgRoundRect(x: number, y: number, width: number, height: number, fill: string, stroke = 'DDEBE3', radius = 24, opacity = 1) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="#${fill}" stroke="#${stroke}" stroke-width="2" opacity="${opacity}"/>`;
}

function previewRows(body: InteractionSlideRequest): PreviewRow[] {
  const results = body.results;
  if (body.interactionType === 'poll' || body.interactionType === 'quiz') {
    const options = body.options?.length
      ? body.options
      : (Array.isArray(results) ? results.map((item: any) => ({ option_text: item.option_text, option_letter: item.option_letter, is_correct: item.is_correct })) : []);
    return options.slice(0, 6).map((option, index) => {
      const result = Array.isArray(results)
        ? results.find((item: any) => item.option_text === option.option_text || item.option_letter === option.option_letter)
        : null;
      return {
        label: `${option.option_letter || String.fromCharCode(65 + index)}. ${option.option_text || 'Option'}`,
        percentage: Math.max(0, Math.min(100, Number(result?.percentage || 0))),
        count: Number(result?.count || 0),
        correct: !!option.is_correct,
      };
    });
  }

  if (body.interactionType === 'qa') {
    return (Array.isArray(results) ? results : []).slice(0, 5).map((item: any) => ({
      label: item.question_text || item.text || 'Question',
      count: Number(item.upvote_count || item.upvotes || 0),
    }));
  }

  if (body.interactionType === 'word_cloud') {
    return (Array.isArray(results) ? results : []).slice(0, 18).map((item: any) => ({
      label: item.word || item.text || item.text_value || 'Word',
      count: Number(item.count || 1),
    }));
  }

  const items = Array.isArray(results) ? results : (results?.text_responses || []);
  return items.slice(0, 5).map((item: any) => ({
    label: item.text || item.text_value || item.question_text || 'Response',
    count: 0,
  }));
}

function buildPreviewSvg(body: InteractionSlideRequest, qrDataUri: string) {
  const width = 1920;
  const height = 1080;
  const label = body.interactionLabel || body.interactionType;
  const rows = previewRows(body);
  const eventCode = body.eventCode.replace(/^#/, '');
  const joinHost = (() => {
    try {
      return new URL(body.joinUrl).host;
    } catch {
      return body.joinUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  })();

  let resultMarkup = '';
  if (body.interactionType === 'word_cloud') {
    if (!rows.length) {
      resultMarkup = svgText('Live responses will appear here', 1205, 560, { size: 44, weight: 800, color: 'A3AEA8', anchor: 'middle' });
    } else {
      const positions = [
        [900, 330, -8], [1240, 280, 7], [1110, 465, 0], [1450, 420, -6], [820, 575, 5],
        [1265, 645, -4], [1535, 610, 6], [980, 720, 0], [1380, 760, -9], [1620, 300, 8],
        [740, 430, 0], [1130, 810, 5], [1510, 815, 0], [850, 830, -5], [1320, 525, 8],
        [1640, 710, -6], [990, 245, 4], [720, 700, 0],
      ];
      const maxCount = Math.max(1, ...rows.map(row => row.count || 1));
      resultMarkup = rows.map((row, index) => {
        const [x, y, rotate] = positions[index % positions.length];
        const fontSize = Math.round(42 + ((row.count || 1) / maxCount) * 68 - Math.floor(index / positions.length) * 8);
        return svgText(truncate(row.label, 28), x, y, {
          size: Math.max(30, Math.min(110, fontSize)),
          weight: 900,
          color: colors[index % colors.length],
          anchor: 'middle',
          rotate,
        });
      }).join('');
    }
  } else if (body.interactionType === 'poll' || body.interactionType === 'quiz') {
    resultMarkup = rows.length
      ? rows.map((row, index) => {
          const y = 355 + index * 95;
          const percentage = row.percentage || 0;
          const barWidth = Math.max(14, 760 * (percentage / 100));
          return [
            svgText(truncate(row.label, 58), 690, y, { size: 29, weight: row.correct ? 900 : 700, color: '1A1A2E' }),
            svgRoundRect(690, y + 24, 760, 22, 'E3E7E5', 'E3E7E5', 12),
            svgRoundRect(690, y + 24, barWidth, 22, colors[index % colors.length], colors[index % colors.length], 12),
            svgText(`${percentage}%`, 1495, y + 42, { size: 27, weight: 900, color: colors[index % colors.length] }),
            svgText(`${row.count} votes`, 1595, y + 42, { size: 22, weight: 700, color: '6B7B8D' }),
          ].join('');
        }).join('')
      : svgText('Waiting for responses', 1205, 560, { size: 48, weight: 900, color: 'A3AEA8', anchor: 'middle' });
  } else if (body.interactionType === 'qa') {
    resultMarkup = rows.length
      ? rows.map((row, index) => {
          const y = 340 + index * 112;
          return [
            svgRoundRect(690, y - 42, 930, 82, 'F4F7F4', 'DDEBE3', 18),
            svgText(truncate(row.label, 74), 722, y + 8, { size: 27, weight: 800, color: '1A1A2E' }),
            svgText(`+${row.count}`, 1540, y + 8, { size: 24, weight: 900, color: '168A3A' }),
          ].join('');
        }).join('')
      : [
          svgText('Ask your question', 1205, 505, { size: 52, weight: 900, color: '1A1A2E', anchor: 'middle' }),
          svgText('Live questions will appear here', 1205, 560, { size: 31, weight: 700, color: 'A3AEA8', anchor: 'middle' }),
        ].join('');
  } else {
    resultMarkup = rows.length
      ? rows.map((row, index) => {
          const y = 355 + index * 112;
          return [
            svgRoundRect(690, y - 45, 930, 82, 'F4F7F4', 'DDEBE3', 18),
            svgText(truncate(row.label, 78), 722, y + 8, { size: 27, weight: 800, color: '1A1A2E' }),
          ].join('');
        }).join('')
      : svgText('Live responses will appear here', 1205, 560, { size: 44, weight: 800, color: 'A3AEA8', anchor: 'middle' });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#F4F7F4"/>
  ${svgText('SlideEngage', 70, 68, { size: 28, weight: 900, color: '168A3A' })}
  ${svgText('LIVE PRESENTATION', 620, 68, { size: 24, weight: 900, color: '6B7B8D' })}
  ${svgRoundRect(72, 120, 430, 840, 'FFFFFF', 'DDEBE3', 28)}
  ${svgText('Join at', 132, 190, { size: 31, weight: 700, color: '1A1A2E' })}
  ${svgText(joinHost, 132, 236, { size: 33, weight: 900, color: '168A3A' })}
  <image href="${qrDataUri}" x="132" y="300" width="300" height="300"/>
  ${svgText('Scan QR code to join', 282, 655, { size: 26, weight: 800, color: '1A1A2E', anchor: 'middle' })}
  ${svgRoundRect(132, 710, 300, 72, 'EAF7EF', 'CBEAD4', 18)}
  ${svgText(`#${eventCode}`, 282, 760, { size: 42, weight: 900, color: '168A3A', anchor: 'middle' })}
  ${svgText(truncate(body.joinUrl, 44), 282, 842, { size: 20, weight: 700, color: '6B7B8D', anchor: 'middle' })}
  ${svgRoundRect(560, 120, 1288, 840, 'FFFFFF', 'DDEBE3', 28)}
  ${svgText(label.toUpperCase(), 620, 190, { size: 22, weight: 900, color: '6B7B8D' })}
  ${svgText(`${body.totalResponses || 0} responses`, 1745, 190, { size: 22, weight: 700, color: '6B7B8D', anchor: 'end' })}
  ${svgText(truncate(body.question, 72), 620, 270, { size: 48, weight: 900, color: '1A1A2E' })}
  <line x1="560" y1="306" x2="1848" y2="306" stroke="#E2EBE6" stroke-width="2"/>
  ${resultMarkup}
  ${svgRoundRect(690, 885, 930, 54, 'EAF7EF', 'CBEAD4', 22)}
  ${svgText(`Join at ${joinHost} and enter code #${eventCode}`, 1155, 922, { size: 24, weight: 900, color: '168A3A', anchor: 'middle' })}
</svg>`;
}

function addJoinPanel(slide: any, pptx: any, qrDataUri: string, eventCode: string, joinUrl: string) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.45,
    y: 0.65,
    w: 2.75,
    h: 6.0,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'DDEBE3', width: 1 },
  });
  slide.addText('Join live', { x: 0.72, y: 0.95, w: 2.2, h: 0.25, fontSize: 10, bold: true, color: '2D8A4E', margin: 0 });
  slide.addImage({ data: qrDataUri, x: 0.82, y: 1.35, w: 2.02, h: 2.02 });
  slide.addText('Scan QR code', { x: 0.72, y: 3.68, w: 2.2, h: 0.25, fontSize: 11, bold: true, align: 'center', color: '1A1A2E', margin: 0 });
  slide.addText('to join the event', { x: 0.72, y: 3.95, w: 2.2, h: 0.25, fontSize: 10, align: 'center', color: '6B7B8D', margin: 0 });
  slide.addText(`#${eventCode}`, { x: 0.72, y: 4.45, w: 2.2, h: 0.48, fontSize: 22, bold: true, align: 'center', color: '168A3A', margin: 0 });
  slide.addText(joinUrl, { x: 0.66, y: 5.25, w: 2.34, h: 0.5, fontSize: 8, align: 'center', color: '6B7B8D', fit: 'shrink', margin: 0 });
  slide.addText('Join at SlideEngage', { x: 0.72, y: 6.05, w: 2.2, h: 0.25, fontSize: 11, bold: true, align: 'center', color: '1A1A2E', margin: 0 });
}

function addFrame(slide: any, pptx: any, label: string, question: string, totalResponses: number) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.45,
    y: 0.65,
    w: 9.35,
    h: 6.0,
    rectRadius: 0.08,
    fill: { color: 'FFFFFF' },
    line: { color: 'DDEBE3', width: 1 },
  });
  slide.addText(label.toUpperCase(), { x: 3.78, y: 0.92, w: 3.3, h: 0.25, fontSize: 10, bold: true, color: '6B7B8D', margin: 0 });
  slide.addText(`${totalResponses || 0} responses`, { x: 11.25, y: 0.92, w: 1.1, h: 0.25, fontSize: 10, align: 'right', color: '6B7B8D', margin: 0 });
  slide.addText(question, { x: 3.78, y: 1.32, w: 8.45, h: 0.6, fontSize: 21, bold: true, color: '1A1A2E', fit: 'shrink', margin: 0.02 });
  slide.addShape(pptx.ShapeType.line, { x: 3.45, y: 2.12, w: 9.35, h: 0, line: { color: 'E2EBE6', width: 1 } });
}

function addPollResults(slide: any, pptx: any, options: InteractionOption[], results: any[]) {
  const rows = options.length ? options : (results || []).map((item: any) => ({ option_text: item.option_text, option_letter: item.option_letter, is_correct: item.is_correct }));
  rows.slice(0, 6).forEach((option, index) => {
    const result = (results || []).find((item: any) => item.option_text === option.option_text || item.option_letter === option.option_letter) || {};
    const percentage = Math.max(0, Math.min(100, Number(result.percentage || 0)));
    const y = 2.45 + index * 0.62;
    slide.addText(`${option.option_letter || String.fromCharCode(65 + index)}. ${option.option_text || 'Option'}`, {
      x: 3.85,
      y,
      w: 6.9,
      h: 0.25,
      fontSize: 13,
      bold: !!option.is_correct,
      color: '1A1A2E',
      fit: 'shrink',
      margin: 0,
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.85,
      y: y + 0.32,
      w: 6.8,
      h: 0.14,
      rectRadius: 0.03,
      fill: { color: 'E3E7E5' },
      line: { color: 'E3E7E5', transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.85,
      y: y + 0.32,
      w: Math.max(0.08, 6.8 * (percentage / 100)),
      h: 0.14,
      rectRadius: 0.03,
      fill: { color: colors[index % colors.length] },
      line: { color: colors[index % colors.length], transparency: 100 },
    });
    slide.addText(`${percentage}%`, { x: 10.85, y: y + 0.22, w: 0.65, h: 0.2, fontSize: 11, bold: true, color: colors[index % colors.length], margin: 0 });
    slide.addText(`${result.count || 0}`, { x: 11.65, y: y + 0.22, w: 0.45, h: 0.2, fontSize: 11, color: '6B7B8D', margin: 0 });
  });
}

function addWordCloud(slide: any, results: any[]) {
  const words = (results || []).slice(0, 18);
  if (!words.length) {
    slide.addText('Live words will appear here', { x: 5.25, y: 3.8, w: 5.2, h: 0.4, fontSize: 22, bold: true, align: 'center', color: 'A3AEA8', margin: 0 });
    return;
  }
  words.forEach((item: any, index: number) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const size = Math.max(16, Math.min(42, 18 + Number(item.count || 1) * 7 - row * 2));
    slide.addText(item.word || item.text || '', {
      x: 3.9 + col * 2.05 + (row % 2) * 0.35,
      y: 2.55 + row * 0.62,
      w: 2.0,
      h: 0.45,
      fontSize: size,
      bold: true,
      rotate: index % 3 === 0 ? -8 : index % 3 === 1 ? 7 : 0,
      color: colors[index % colors.length],
      fit: 'shrink',
      margin: 0,
    });
  });
}

function addOpenText(slide: any, pptx: any, responses: any) {
  const items = Array.isArray(responses) ? responses.slice(0, 5) : (responses?.text_responses || []).slice(0, 5);
  if (!items.length) {
    slide.addText('Responses will appear here', { x: 5.25, y: 3.55, w: 5.2, h: 0.4, fontSize: 20, bold: true, align: 'center', color: 'A3AEA8', margin: 0 });
    return;
  }
  items.forEach((item: any, index: number) => {
    const y = 2.45 + index * 0.72;
    slide.addShape(pptx.ShapeType.roundRect, { x: 3.85, y, w: 8.25, h: 0.48, rectRadius: 0.04, fill: { color: 'F4F7F4' }, line: { color: 'DDEBE3', width: 1 } });
    slide.addText(item.question_text || item.text || item.text_value || 'Response', { x: 4.05, y: y + 0.12, w: 7.85, h: 0.22, fontSize: 12, color: '1A1A2E', fit: 'shrink', margin: 0 });
  });
}

function addRating(slide: any, pptx: any, results: any) {
  const average = Number(results?.average_rating || 0);
  const count = Number(results?.rating_count || 0);
  slide.addText(average ? average.toFixed(1) : '0.0', { x: 4.0, y: 2.55, w: 2.2, h: 0.8, fontSize: 48, bold: true, color: '168A3A', margin: 0 });
  slide.addText(`${count} ratings`, { x: 4.05, y: 3.42, w: 2.0, h: 0.25, fontSize: 13, color: '6B7B8D', margin: 0 });
  for (let i = 0; i < 5; i += 1) {
    slide.addText(i < Math.round(average) ? '*' : '-', { x: 6.25 + i * 0.58, y: 2.78, w: 0.5, h: 0.4, fontSize: 26, bold: true, color: 'EAB308', margin: 0 });
  }
  slide.addShape(pptx.ShapeType.roundRect, { x: 4.05, y: 4.25, w: 6.8, h: 0.18, rectRadius: 0.04, fill: { color: 'E3E7E5' }, line: { color: 'E3E7E5', transparency: 100 } });
  slide.addShape(pptx.ShapeType.roundRect, { x: 4.05, y: 4.25, w: Math.max(0.1, 6.8 * (average / 5)), h: 0.18, rectRadius: 0.04, fill: { color: '168A3A' }, line: { color: '168A3A', transparency: 100 } });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InteractionSlideRequest;
    const { question, interactionType, eventCode, joinUrl, liveUrl } = body;
    if (!question || !interactionType || !eventCode || !joinUrl || !liveUrl) {
      return NextResponse.json({ error: 'question, interactionType, eventCode, joinUrl, and liveUrl required' }, { status: 400 });
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'SlideEngage';
    pptx.subject = 'SlideEngage interaction slide';
    pptx.title = question;
    pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };

    const slide = pptx.addSlide();
    slide.background = { color: 'F4F7F4' };
    slide.addText('SlideEngage', { x: 0.35, y: 0.2, w: 2.3, h: 0.25, fontSize: 9, bold: true, color: '168A3A', margin: 0 });
    slide.addText('LIVE PRESENTATION', { x: 3.45, y: 0.2, w: 3.0, h: 0.3, fontSize: 10, bold: true, color: '6B7B8D', margin: 0 });

    const qrDataUri = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      margin: 3,
      width: 520,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const previewSvg = buildPreviewSvg(body, qrDataUri);
    const svgBase64 = Buffer.from(previewSvg).toString('base64');

    addJoinPanel(slide, pptx, qrDataUri, eventCode, joinUrl);
    addFrame(slide, pptx, body.interactionLabel || interactionType, question, body.totalResponses || 0);

    const results = body.results;
    if (interactionType === 'poll' || interactionType === 'quiz') {
      addPollResults(slide, pptx, body.options || [], Array.isArray(results) ? results : []);
    } else if (interactionType === 'word_cloud') {
      addWordCloud(slide, Array.isArray(results) ? results : []);
    } else if (interactionType === 'feedback' && results && typeof results === 'object' && 'average_rating' in results) {
      addRating(slide, pptx, results);
    } else if (interactionType === 'qa') {
      addOpenText(slide, pptx, Array.isArray(results) ? results : []);
    } else {
      addOpenText(slide, pptx, Array.isArray(results) ? results : results?.text_responses || []);
    }

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.85,
      y: 5.92,
      w: 7.8,
      h: 0.38,
      rectRadius: 0.06,
      fill: { color: 'EAF7EF' },
      line: { color: 'CBEAD4', width: 1 },
    });
    slide.addText(`Open live view: ${liveUrl}`, {
      x: 4.02,
      y: 6.02,
      w: 7.45,
      h: 0.16,
      fontSize: 9,
      bold: true,
      color: '168A3A',
      fit: 'shrink',
      margin: 0,
    });

    const base64 = await pptx.write({ outputType: 'base64' });
    return NextResponse.json({ base64, svgBase64 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
