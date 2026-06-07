import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env.local')) {
  const envFile = readFileSync('.env.local', 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-real-vercel-domain.vercel.app';

console.log('Starting Slide Engage add-in development environment...');
console.log('');
console.log('Local Next.js dev server: starts with npm run dev');
console.log(`Production manifest URL: ${appUrl.replace(/\/$/, '')}/manifest.xml`);
console.log('Install guide: /addin-install');
console.log('');
console.log('PowerPoint sideload path: Insert -> Add-ins -> My Add-ins -> Upload My Add-in');
console.log('');

const next = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

const socket = spawn('npm', ['run', 'socket:dev'], {
  stdio: 'inherit',
  shell: true,
});

function shutdown(code = 0) {
  next.kill();
  socket.kill();
  process.exit(code);
}

next.on('exit', code => {
  socket.kill();
  process.exit(code ?? 0);
});

socket.on('exit', code => {
  next.kill();
  process.exit(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
