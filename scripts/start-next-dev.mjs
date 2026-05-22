import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';

function isPortListening(port) {
  try {
    execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function findFreePort(preferredPort) {
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (!isPortListening(port)) return port;
  }
  throw new Error(`No free port found from ${preferredPort} to ${preferredPort + 49}.`);
}

const requestedPort = Number(process.env.PORT || process.env.NEXT_PORT || 3000);
const port = findFreePort(Number.isFinite(requestedPort) ? requestedPort : 3000);

if (port !== requestedPort) {
  console.log(`Port ${requestedPort} is already in use. Starting Next.js on ${port} instead.`);
}

if (process.env.SLIDEENGAGE_PRINT_PORT_ONLY === '1') {
  console.log(port);
  process.exit(0);
}

const child = spawn('next', ['dev', '-p', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(port),
  },
});

child.on('exit', code => process.exit(code ?? 0));

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
