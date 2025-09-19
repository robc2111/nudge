// server/cron/index.js
const cron = require('node-cron');
const { scheduleDbBackups } = require('./backups');

scheduleDbBackups(cron);

// You can add other schedules here, e.g., weekly prompts, etc.
