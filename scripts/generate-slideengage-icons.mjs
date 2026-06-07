import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

const publicDir = 'public/assets/icons';
const officeDir = 'public/office-addin';
const installerDir = 'installer/assets';
const sizes = [16, 32, 64, 80, 128, 256, 512];

await mkdir(publicDir, { recursive: true });
await mkdir(officeDir, { recursive: true });
await mkdir(installerDir, { recursive: true });

function iconSvg(size) {
  const scale = size / 512;
  const stroke = Math.max(10, Math.round(18 * scale));
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#34D176"/>
          <stop offset="1" stop-color="#168A3A"/>
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0B5D2B" flood-opacity="0.22"/>
        </filter>
      </defs>

      <circle cx="256" cy="256" r="238" fill="url(#bg)"/>

      <g filter="url(#softShadow)">
        <circle cx="256" cy="256" r="142" fill="#FFFFFF"/>
        <circle cx="256" cy="256" r="112" fill="#E53935"/>
        <circle cx="256" cy="256" r="78" fill="#FFFFFF"/>
        <circle cx="256" cy="256" r="47" fill="#E53935"/>
        <circle cx="256" cy="256" r="18" fill="#FFFFFF"/>

        <path d="M334 178 L414 96 L399 159 L462 144 L381 225 Z" fill="#36A3FF"/>
        <path d="M334 178 L381 225 L256 256 Z" fill="#1D5ED8"/>
        <path d="M318 194 L256 256" fill="none" stroke="#0F2C6E" stroke-width="${stroke}" stroke-linecap="round"/>
      </g>
    </svg>`;
}

for (const size of sizes) {
  const buffer = await sharp(Buffer.from(iconSvg(size)))
    .png()
    .toBuffer();

  await sharp(buffer).toFile(`${publicDir}/icon-${size}.png`);
  await sharp(buffer).toFile(`${officeDir}/icon-${size}.png`);
  await sharp(buffer).toFile(`${installerDir}/icon-${size}.png`);
}

await copyFile(`${publicDir}/icon-32.png`, 'public/favicon.png');
await copyFile(`${publicDir}/icon-512.png`, `${installerDir}/slideengage-installer-icon.png`);

console.log(`Generated SlideEngage icons: ${sizes.map(size => `${size}x${size}`).join(', ')}`);
