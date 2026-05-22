import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'public/office-addin/icon-80.png';
const publicDir = 'public/assets/icons';
const installerDir = 'installer/assets';
const sizes = [16, 32, 64, 80, 128, 256, 512];

await mkdir(publicDir, { recursive: true });
await mkdir(installerDir, { recursive: true });

for (const size of sizes) {
  const buffer = await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(buffer).toFile(`${publicDir}/icon-${size}.png`);
  await sharp(buffer).toFile(`${installerDir}/icon-${size}.png`);
}

await copyFile(`${publicDir}/icon-32.png`, 'public/favicon.png');
await copyFile(`${publicDir}/icon-512.png`, `${installerDir}/slideengage-installer-icon.png`);

console.log(`Generated SlideEngage icons: ${sizes.map(size => `${size}x${size}`).join(', ')}`);
