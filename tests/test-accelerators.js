// In electron, globalShortcut requires GUI mode, but we can test via standard electron run
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'accelerator-test.log');

const { app, globalShortcut } = require('electron');

app.whenReady().then(() => {
  const tests = ['Control+~', 'Control+`', 'Ctrl+~', 'Ctrl+`', 'CommandOrControl+`', 'CommandOrControl+~'];
  const results = [];
  for (const t of tests) {
    try {
      const ok = globalShortcut.register(t, () => {});
      results.push(`${t}: ${ok ? 'SUCCESS' : 'FAILED'}`);
      if (ok) globalShortcut.unregister(t);
    } catch (e) {
      results.push(`${t}: ERROR: ${e.message}`);
    }
  }
  fs.writeFileSync(logFile, results.join('\n'), 'utf-8');
  app.quit();
});
