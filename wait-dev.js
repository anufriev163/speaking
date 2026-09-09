const { spawn } = require('child_process');
const http = require('http');
const esbuild = require('esbuild');

async function buildElectron() {
  await esbuild.build({
    entryPoints: ['electron/main.ts', 'electron/preload.ts'],
    platform: 'node',
    format: 'cjs',
    outdir: 'dist-electron',
    external: ['electron', 'koffi'],
    bundle: true,
    sourcemap: 'inline'
  });
}

function checkVite(url, maxRetries = 40, interval = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const timer = setInterval(() => {
      http.get(url, (res) => {
        if (res.statusCode < 400) {
          clearInterval(timer);
          resolve(true);
        }
      }).on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          clearInterval(timer);
          reject(new Error('Vite dev server timeout'));
        }
      });
    }, interval);
  });
}

async function start() {
  console.log('[Dev] Building Electron backend...');
  await buildElectron();
  console.log('[Dev] Waiting for Vite server at http://localhost:5173...');
  try {
    await checkVite('http://localhost:5173');
    console.log('[Dev] Vite is ready. Launching Electron...');
    const electronBin = require('electron');
    const child = spawn(electronBin, ['.'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
    child.on('close', (code) => process.exit(code || 0));
  } catch (err) {
    console.error('[Dev] Error:', err);
    process.exit(1);
  }
}

start();
