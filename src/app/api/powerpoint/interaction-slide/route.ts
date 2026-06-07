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
  liveUrl?: string;
  results?: any;
  totalResponses?: number;
  snapshotOnly?: boolean;
};

type PreviewRow = {
  label: string;
  percentage?: number;
  count: number;
  correct?: boolean;
};

type WordPlacement = {
  text: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
};

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Box = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const colors = ['168A3A', '1A6BB5', 'D46B08', '8B1A4A', '7C3AED', '0F766E'];
const qrCache = new Map<string, string>();

async function getQrDataUri(joinUrl: string) {
  const cached = qrCache.get(joinUrl);
  if (cached) return cached;
  const dataUri = await QRCode.toDataURL(joinUrl, {
    errorCorrectionLevel: 'M',
    margin: 3,
    width: 520,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  if (qrCache.size > 50) qrCache.clear();
  qrCache.set(joinUrl, dataUri);
  return dataUri;
}

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function wordHash(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function estimateWordBox(text: string, x: number, y: number, size: number, rotate: number, padding: number): Box {
  const rawWidth = Math.max(size * 1.8, text.length * size * 0.56);
  const rawHeight = size * 1.12;
  const radians = Math.abs(rotate) * Math.PI / 180;
  const width = rawWidth * Math.cos(radians) + rawHeight * Math.sin(radians) + padding * 2;
  const height = rawWidth * Math.sin(radians) + rawHeight * Math.cos(radians) + padding * 2;
  return {
    left: x - width / 2,
    top: y - height / 2 - size * 0.1,
    right: x + width / 2,
    bottom: y + height / 2,
  };
}

function boxInside(box: Box, bounds: Bounds) {
  return box.left >= bounds.left &&
    box.top >= bounds.top &&
    box.right <= bounds.left + bounds.width &&
    box.bottom <= bounds.top + bounds.height;
}

function boxesOverlap(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function candidatePoints(bounds: Bounds, total: number, seed: number) {
  const points: Array<{ x: number; y: number; score: number }> = [];
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const cols = Math.max(5, Math.ceil(Math.sqrt(total) * 2.2));
  const rows = Math.max(4, Math.ceil(total / cols * 2.1));
  points.push({ x: centerX, y: centerY, score: 0 });

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const jitterX = (((seed + row * 17 + col * 23) % 11) - 5) * 3;
      const jitterY = (((seed + row * 29 + col * 13) % 9) - 4) * 3;
      const x = bounds.left + ((col + 0.5) / cols) * bounds.width + jitterX;
      const y = bounds.top + ((row + 0.5) / rows) * bounds.height + jitterY;
      const spreadBonus = Math.abs(x - centerX) * 0.05 + Math.abs(y - centerY) * 0.08;
      const score = Math.hypot(x - centerX, y - centerY) - spreadBonus + ((seed + row + col) % 7);
      points.push({ x, y, score });
    }
  }

  return points.sort((a, b) => a.score - b.score);
}

function layoutWordCloud(rows: PreviewRow[], bounds: Bounds): WordPlacement[] {
  const cleanRows = rows
    .map(row => ({
      label: truncate(row.label, rows.length > 30 ? 18 : rows.length > 15 ? 22 : 28),
      count: Math.max(1, Number(row.count || 1)),
    }))
    .filter(row => row.label.trim());

  const total = cleanRows.length;
  if (!total) return [];

  const maxCount = Math.max(1, ...cleanRows.map(row => row.count));
  const [minSize, maxSize, basePadding, rotationLimit] =
    total <= 5 ? [44, 112, 22, 10] :
    total <= 15 ? [30, 82, 17, 8] :
    total <= 30 ? [20, 58, 12, 4] :
    [15, 40, 8, 0];

  const sortedRows = cleanRows
    .map((row, index) => ({ ...row, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index);

  const placed: WordPlacement[] = [];
  const boxes: Box[] = [];

  sortedRows.forEach((row, order) => {
    const weight = Math.sqrt(row.count / maxCount);
    const originalSize = Math.round(minSize + (maxSize - minSize) * weight);
    const seed = wordHash(`${row.label}-${row.index}`);
    const rotate = rotationLimit ? ((seed % (rotationLimit * 2 + 1)) - rotationLimit) : 0;
    const points = candidatePoints(bounds, total, seed + order * 101);
    let best: WordPlacement | null = null;
    let bestBox: Box | null = null;

    for (let scale = 1; scale >= 0.42 && !best; scale -= 0.08) {
      const size = Math.max(11, Math.round(originalSize * scale));
      const padding = Math.max(3, Math.round(basePadding * scale));
      for (const point of points) {
        const x = clamp(point.x, bounds.left + padding, bounds.left + bounds.width - padding);
        const y = clamp(point.y, bounds.top + padding + size, bounds.top + bounds.height - padding);
        const box = estimateWordBox(row.label, x, y, size, scale < 0.72 ? 0 : rotate, padding);
        if (!boxInside(box, bounds)) continue;
        if (boxes.some(existing => boxesOverlap(existing, box))) continue;
        best = { text: row.label, x, y, size, rotate: scale < 0.72 ? 0 : rotate, color: colors[row.index % colors.length] };
        bestBox = box;
        break;
      }
    }

    if (best && bestBox) {
      placed.push(best);
      boxes.push(bestBox);
    }
  });

  return placed.sort((a, b) => b.size - a.size);
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
    return (Array.isArray(results) ? results : []).slice(0, 45).map((item: any) => ({
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
  const eventCode = body.eventCode.replace(/^#/, '');
  const joinHost = (() => {
    try {
      return new URL(body.joinUrl).host;
    } catch {
      return body.joinUrl.replace(/^https?:\/\//, '').split('/')[0];
    }
  })();

  const optionRows = (body.interactionType === 'poll' || body.interactionType === 'quiz')
    ? (body.options || []).slice(0, 6)
    : [];
  const resultMarkup = optionRows.length
    ? optionRows.map((option, index) => {
        const y = 385 + index * 84;
        return [
          svgRoundRect(650, y - 45, 1060, 68, 'F4F7F4', 'DDEBE3', 18),
          svgText(`${String.fromCharCode(65 + index)}. ${truncate(option.option_text || 'Option', 64)}`, 724, y, {
            size: 34,
            weight: option.is_correct ? 900 : 800,
            color: option.is_correct ? '168A3A' : '1A1A2E',
          }),
        ].join('');
      }).join('')
    : [
        svgText('Answer from your phone', 1205, 500, { size: 58, weight: 900, color: '1A1A2E', anchor: 'middle' }),
        svgText('Scan the QR code or enter the event code to join.', 1205, 565, { size: 34, weight: 700, color: '6B7B8D', anchor: 'middle' }),
      ].join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#F4F7F4"/>
  ${svgText('SlideEngage', 70, 68, { size: 28, weight: 900, color: '168A3A' })}
  ${svgText('INTERACTION SLIDE', 620, 68, { size: 24, weight: 900, color: '6B7B8D' })}
  ${svgRoundRect(72, 120, 460, 840, 'FFFFFF', 'DDEBE3', 28)}
  ${svgText('Join at', 132, 184, { size: 34, weight: 700, color: '1A1A2E' })}
  ${svgText(joinHost, 132, 234, { size: 37, weight: 900, color: '168A3A' })}
  <image href="${qrDataUri}" x="122" y="292" width="360" height="360"/>
  ${svgText('Scan QR code to join', 302, 705, { size: 30, weight: 800, color: '1A1A2E', anchor: 'middle' })}
  ${svgRoundRect(122, 755, 360, 92, 'EAF7EF', 'CBEAD4', 20)}
  ${svgText(`#${eventCode}`, 302, 818, { size: 54, weight: 900, color: '168A3A', anchor: 'middle' })}
  ${svgText(truncate(body.joinUrl, 42), 302, 897, { size: 22, weight: 700, color: '6B7B8D', anchor: 'middle' })}
  ${svgRoundRect(560, 120, 1288, 840, 'FFFFFF', 'DDEBE3', 28)}
  ${svgText(label.toUpperCase(), 620, 190, { size: 22, weight: 900, color: '6B7B8D' })}
  ${svgText('Scan the QR code or enter the event code to join.', 1745, 190, { size: 24, weight: 700, color: '6B7B8D', anchor: 'end' })}
  ${svgText(truncate(body.question, 68), 620, 290, { size: 64, weight: 900, color: '1A1A2E' })}
  <line x1="560" y1="330" x2="1848" y2="330" stroke="#E2EBE6" stroke-width="2"/>
  ${resultMarkup}
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
  slide.addText('Join live', { x: 0.68, y: 0.9, w: 2.35, h: 0.28, fontSize: 12, bold: true, color: '2D8A4E', margin: 0 });
  slide.addImage({ data: qrDataUri, x: 0.68, y: 1.28, w: 2.35, h: 2.35 });
  slide.addText('Scan QR code to join', { x: 0.64, y: 3.9, w: 2.42, h: 0.3, fontSize: 12, bold: true, align: 'center', color: '1A1A2E', margin: 0 });
  slide.addText(`#${eventCode}`, { x: 0.62, y: 4.42, w: 2.5, h: 0.62, fontSize: 27, bold: true, align: 'center', color: '168A3A', margin: 0 });
  slide.addText(joinUrl, { x: 0.62, y: 5.22, w: 2.5, h: 0.58, fontSize: 8, align: 'center', color: '6B7B8D', fit: 'shrink', margin: 0 });
  slide.addText('Join at SlideEngage', { x: 0.64, y: 6.0, w: 2.42, h: 0.28, fontSize: 12, bold: true, align: 'center', color: '1A1A2E', margin: 0 });
}

function addFrame(slide: any, pptx: any, label: string, question: string) {
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
  slide.addText('Scan the QR code or enter the event code to join.', { x: 8.0, y: 0.92, w: 4.05, h: 0.25, fontSize: 9, align: 'right', color: '6B7B8D', fit: 'shrink', margin: 0 });
  slide.addText(question, { x: 3.78, y: 1.25, w: 8.55, h: 0.9, fontSize: 30, bold: true, color: '1A1A2E', fit: 'shrink', margin: 0.02 });
  slide.addShape(pptx.ShapeType.line, { x: 3.45, y: 2.25, w: 9.35, h: 0, line: { color: 'E2EBE6', width: 1 } });
}

function addQuestionOptions(slide: any, pptx: any, options: InteractionOption[]) {
  if (!options.length) {
    slide.addText('Scan the QR code or enter the event code to answer.', {
      x: 4.2,
      y: 3.1,
      w: 7.1,
      h: 0.56,
      fontSize: 27,
      bold: true,
      align: 'center',
      color: '1A1A2E',
      fit: 'shrink',
      margin: 0,
    });
    slide.addText('Your response will appear on SlideEngage live results.', {
      x: 4.25,
      y: 3.75,
      w: 7.0,
      h: 0.36,
      fontSize: 15,
      align: 'center',
      color: '6B7B8D',
      fit: 'shrink',
      margin: 0,
    });
    return;
  }

  options.slice(0, 6).forEach((option, index) => {
    const y = 2.55 + index * 0.65;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.85,
      y,
      w: 8.25,
      h: 0.5,
      rectRadius: 0.04,
      fill: { color: 'F4F7F4' },
      line: { color: 'DDEBE3', width: 1 },
    });
    slide.addText(`${String.fromCharCode(65 + index)}. ${option.option_text || 'Option'}`, {
      x: 4.08,
      y: y + 0.13,
      w: 7.8,
      h: 0.24,
      fontSize: 15,
      bold: !!option.is_correct,
      color: option.is_correct ? '168A3A' : '1A1A2E',
      fit: 'shrink',
      margin: 0,
    });
  });
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
  const words = (results || []).slice(0, 30);
  if (!words.length) {
    slide.addText('Live words will appear here', { x: 5.25, y: 3.8, w: 5.2, h: 0.4, fontSize: 22, bold: true, align: 'center', color: 'A3AEA8', margin: 0 });
    return;
  }
  const count = words.length;
  const cols = count <= 6 ? 3 : count <= 15 ? 4 : 5;
  const rows = Math.ceil(count / cols);
  const maxCount = Math.max(1, ...words.map((item: any) => Number(item.count || 1)));
  const minSize = count <= 6 ? 18 : count <= 15 ? 14 : 10;
  const maxSize = count <= 6 ? 42 : count <= 15 ? 30 : 20;
  words.forEach((item: any, index: number) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const weight = Math.sqrt(Number(item.count || 1) / maxCount);
    const size = Math.round(minSize + (maxSize - minSize) * weight);
    const cellW = 7.75 / cols;
    const cellH = Math.min(0.64, 3.0 / Math.max(1, rows));
    slide.addText(truncate(item.word || item.text || '', count > 15 ? 16 : 24), {
      x: 3.9 + col * cellW,
      y: 2.5 + row * cellH,
      w: cellW * 0.92,
      h: Math.max(0.26, cellH * 0.74),
      fontSize: size,
      bold: true,
      rotate: count > 15 ? 0 : index % 3 === 0 ? -5 : index % 3 === 1 ? 5 : 0,
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
    const { question, interactionType, eventCode, joinUrl } = body;
    if (!question || !interactionType || !eventCode || !joinUrl) {
      return NextResponse.json({ error: 'question, interactionType, eventCode, and joinUrl required' }, { status: 400 });
    }

    const qrDataUri = await getQrDataUri(joinUrl);
    const previewSvg = buildPreviewSvg(body, qrDataUri);
    const svgBase64 = Buffer.from(previewSvg).toString('base64');

    if (body.snapshotOnly) {
      return NextResponse.json({ svgBase64 });
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
    slide.addText('INTERACTION SLIDE', { x: 3.45, y: 0.2, w: 3.0, h: 0.3, fontSize: 10, bold: true, color: '6B7B8D', margin: 0 });

    addJoinPanel(slide, pptx, qrDataUri, eventCode, joinUrl);
    addFrame(slide, pptx, body.interactionLabel || interactionType, question);
    addQuestionOptions(slide, pptx, interactionType === 'poll' || interactionType === 'quiz' ? body.options || [] : []);

    const base64 = await pptx.write({ outputType: 'base64' });
    return NextResponse.json({ base64, svgBase64 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
