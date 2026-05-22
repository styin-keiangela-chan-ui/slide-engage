import { NextRequest, NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';
import QRCode from 'qrcode';

type PollSlideRequest = {
  question: string;
  options: string[];
  eventCode: string;
  joinUrl: string;
};

export async function POST(req: NextRequest) {
  try {
    const { question, options, eventCode, joinUrl } = (await req.json()) as PollSlideRequest;

    if (!question || !eventCode || !joinUrl || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'question, options, eventCode, and joinUrl required' }, { status: 400 });
    }

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'Slide Engage';
    pptx.subject = 'Slide Engage poll slide';
    pptx.title = question;
    pptx.theme = {
      headFontFace: 'Aptos Display',
      bodyFontFace: 'Aptos',
    };

    const slide = pptx.addSlide();
    slide.background = { color: 'F4F7F4' };
    slide.addText('Slide Engage', { x: 0.35, y: 0.2, w: 2.3, h: 0.25, fontSize: 9, bold: true, color: '2D8A4E', margin: 0 });
    slide.addText('ACTIVE POLL', { x: 3.0, y: 0.2, w: 3.0, h: 0.3, fontSize: 12, color: '6B7B8D', margin: 0 });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 0.85,
      w: 2.55,
      h: 5.85,
      rectRadius: 0.05,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2EBE6', width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, { x: 0.9, y: 1.55, w: 1.85, h: 1.85, fill: { color: 'FFFFFF' }, line: { color: '1A1A2E', width: 1 } });
    const qrDataUri = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      margin: 3,
      width: 420,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    slide.addImage({ data: qrDataUri, x: 0.95, y: 1.6, w: 1.75, h: 1.75 });
    slide.addText('Join at', { x: 0.72, y: 4.0, w: 2.2, h: 0.35, fontSize: 18, align: 'center', color: '1A1A2E', margin: 0 });
    slide.addText('Slide Engage', { x: 0.72, y: 4.48, w: 2.2, h: 0.36, fontSize: 19, bold: true, align: 'center', color: '1A1A2E', margin: 0 });
    slide.addText(`#${eventCode}`, { x: 0.72, y: 5.1, w: 2.2, h: 0.4, fontSize: 21, bold: true, align: 'center', color: '2D8A4E', margin: 0 });
    slide.addText(joinUrl, { x: 0.72, y: 5.75, w: 2.2, h: 0.35, fontSize: 8, align: 'center', color: '6B7B8D', fit: 'shrink', margin: 0 });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 3.3,
      y: 0.85,
      w: 9.45,
      h: 5.85,
      rectRadius: 0.05,
      fill: { color: 'FFFFFF' },
      line: { color: 'E2EBE6', width: 1 },
    });
    slide.addText(question, { x: 3.65, y: 1.12, w: 8.75, h: 0.55, fontSize: 22, bold: true, color: '1A1A2E', fit: 'shrink' });
    slide.addShape(pptx.ShapeType.line, { x: 3.3, y: 1.85, w: 9.45, h: 0, line: { color: 'E2EBE6', width: 1 } });

    const colors = ['2D8A4E', '1A6BB5', 'D46B08', '8B1A4A'];
    options.slice(0, 4).forEach((option, index) => {
      const y = 2.25 + index * 0.92;
      slide.addText(`${String.fromCharCode(65 + index)}. ${option}`, {
        x: 3.75,
        y,
        w: 7.9,
        h: 0.32,
        fontSize: 16,
        color: '1A1A2E',
        fit: 'shrink',
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 3.75,
        y: y + 0.42,
        w: 7.4,
        h: 0.18,
        rectRadius: 0.04,
        fill: { color: index === 0 ? colors[index] : 'A7A7A7', transparency: index === 0 ? 0 : 35 },
        line: { color: index === 0 ? colors[index] : 'A7A7A7', transparency: 100 },
      });
      slide.addText(index === 0 ? '100%' : '0%', {
        x: 11.25,
        y: y + 0.28,
        w: 0.7,
        h: 0.25,
        fontSize: 12,
        bold: index === 0,
        color: index === 0 ? colors[index] : '6B7B8D',
        margin: 0,
      });
    });

    slide.addText('Results update live in the Slide Engage task pane.', {
      x: 3.65,
      y: 6.25,
      w: 8.0,
      h: 0.22,
      fontSize: 9,
      color: '6B7B8D',
      margin: 0,
    });

    const base64 = await pptx.write({ outputType: 'base64' });
    return NextResponse.json({ base64 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
