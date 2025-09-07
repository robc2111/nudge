// server/scripts/whatever-cron.js (at the end of your job)
const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

async function notifyHeartbeat() {
  if (!process.env.HEARTBEAT_URL) return;
  try {
    await fetch(process.env.HEARTBEAT_URL, { method: 'GET' });
  } catch (e) {
    console.error('Heartbeat failed:', e.message);
  }
}
// call notifyHeartbeat() after successful job run
