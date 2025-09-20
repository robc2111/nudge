// server/scripts/whatever-cron.js

async function notifyHeartbeat() {
  if (!process.env.HEARTBEAT_URL) return;
  try {
    // Node 18+ has global fetch; no polyfill needed
    await fetch(process.env.HEARTBEAT_URL, { method: 'GET' });
  } catch (e) {
    console.error('Heartbeat failed:', e.message);
  }
}

// … your job logic goes here …

// call after your job completes:
(async () => {
  try {
    await notifyHeartbeat();
  } catch {
    // best-effort; don’t crash the script
  }
})();
