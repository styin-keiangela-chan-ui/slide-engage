import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const nextUrl = process.argv[2];

function normalizeUrl(value) {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'https:') {
    throw new Error('Use an HTTPS production URL.');
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)) {
    throw new Error('Production URL cannot be localhost.');
  }
  return url.origin;
}

const productionUrl = normalizeUrl(nextUrl);

const files = [
  '.env.example',
  'README.md',
  'PUBLIC_DEPLOYMENT.md',
  'installer/README.md',
  'installer/macos/install-slideengage.sh',
  'office-addin/README.md',
  'office-addin/DEPLOYMENT.md',
  'office-addin/manifest.xml',
  'public/manifest.xml',
  'public/office-addin/manifest.xml',
  'public/pptx-addin/manifest.xml',
  'public/SlideEngage_GoogleSlides_Addon.gs',
  'public/pptx-addin/taskpane.html',
  'src/app/download/page.tsx',
  'scripts/start-addin.mjs',
];

if (!productionUrl) {
  console.error('Usage: npm run configure:public-url -- https://your-real-vercel-domain.vercel.app');
  process.exit(1);
}

for (const file of files) {
  if (!existsSync(file)) continue;
  const current = readFileSync(file, 'utf8');
  const next = current
    .replaceAll('https://your-vercel-domain.vercel.app', productionUrl)
    .replaceAll('https://slide-engage.vercel.app', productionUrl);
  writeFileSync(file, next);
}

console.log(`Slide Engage production URL configured: ${productionUrl}`);
