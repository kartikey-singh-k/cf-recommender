import cron from 'node-cron';
import { query } from '../db/index.js';
import { generateDailyQueue, saveQueueToDB } from '../services/recommendationService.js';
import { syncProblemList } from '../services/problemService.js';

// ─── DAILY QUEUE GENERATION — runs at midnight every day ─
// Cron syntax: '0 0 * * *' = at 00:00 every day
export function startDailyQueueJob() {
  cron.schedule('0 0 * * *', async () => {
    console.log('Daily queue job started:', new Date().toISOString());

    try {
      // 1. Refresh problem list if needed (runs weekly)
      await syncProblemList();

      // 2. Get all users with linked CF handles
      const users = await query(
        'SELECT id, cf_handle FROM users WHERE cf_handle IS NOT NULL'
      );
      console.log(`Generating queues for ${users.rows.length} users`);

      // 3. Generate queue for each user
      // Process sequentially to avoid overwhelming DB
      let success = 0;
      let failed = 0;

      for (const user of users.rows) {
        try {
          const problems = await generateDailyQueue(user.id);
          await saveQueueToDB(user.id, problems);
          success++;
        } catch (err) {
          console.error(`Queue generation failed for ${user.cf_handle}:`, err.message);
          failed++;
        }
      }

      console.log(`Daily queue job complete. Success: ${success}, Failed: ${failed}`);

    } catch (err) {
      console.error('Daily queue job crashed:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'  // IST — adjust to your timezone
  });

  console.log('Daily queue cron job scheduled (midnight IST)');
}

// ─── WEEKLY PROBLEM SYNC — runs every Sunday at 2 AM ────
export function startWeeklySyncJob() {
  cron.schedule('0 2 * * 0', async () => {
    console.log('Weekly problem sync started');
    try {
      const count = await syncProblemList();
      console.log(`Weekly sync complete: ${count} problems cached`);
    } catch (err) {
      console.error('Weekly sync failed:', err);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Weekly problem sync scheduled (Sunday 2 AM IST)');
}