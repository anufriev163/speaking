const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const target = path.join(__dirname, 'node_modules', 'electron', 'dist');
if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
}

const zip = 'C:\\Users\\чапа\\AppData\\Local\\electron\\Cache\\073c10f139c87e3badb3ab4fec283ab33ea3ccf18b5cb8ce88ffcc6cb893b618\\electron-v34.5.8-win32-x64.zip';
console.log('Extracting:', zip);
console.log('To target:', target);

execFileSync('tar', ['-xf', zip, '-C', target], { stdio: 'inherit' });

fs.writeFileSync(path.join(__dirname, 'node_modules', 'electron', 'path.txt'), 'electron.exe', 'utf-8');

const exePath = path.join(target, 'electron.exe');
console.log('Verified electron.exe exists:', fs.existsSync(exePath));
