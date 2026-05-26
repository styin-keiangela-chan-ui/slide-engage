import { existsSync, readFileSync } from 'node:fs';

const requiredUrl = 'https://slide-engage.vercel.app';
const requiredTaskpane = `${requiredUrl}/taskpane-test`;
const manifestFiles = [
  'public/manifest.xml',
  'public/office-addin/manifest.xml',
  'public/pptx-addin/manifest.xml',
  'office-addin/manifest.xml',
];

let failed = false;

for (const file of manifestFiles) {
  if (!existsSync(file)) {
    console.error(`Missing manifest: ${file}`);
    failed = true;
    continue;
  }

  const manifest = readFileSync(file, 'utf8');
  const checks = [
    [manifest.includes(requiredTaskpane), `SourceLocation must use ${requiredTaskpane}`],
    [manifest.includes(`<AppDomain>${requiredUrl}</AppDomain>`), `AppDomain must include ${requiredUrl}`],
    [manifest.includes(`${requiredUrl}/assets/icons/icon-32.png`), '32px icon must use production HTTPS URL'],
    [manifest.includes(`${requiredUrl}/assets/icons/icon-80.png`), '80px icon must use production HTTPS URL'],
    [!manifest.includes('localhost'), 'manifest must not contain localhost'],
    [!manifest.includes('your-real-vercel-domain'), 'manifest must not contain placeholder domain'],
  ];

  for (const [ok, message] of checks) {
    if (!ok) {
      console.error(`${file}: ${message}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log('Office add-in manifests are production-ready.');
