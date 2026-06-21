import { query } from '../db/index.js';
import { getTodaysQueue, generateDailyQueue, saveQueueToDB } from '../services/recommendationService.js';
import { syncProblemList, isProblemSyncNeeded } from '../services/problemService.js';
import redisClient from '../db/redis.js';

// ─── GET TODAY'S QUEUE ───────────────────────────────────
export async function getQueue(req, res) {
  const userId = req.user.userId;

  try {
    // Sync problem list if needed (first time or weekly refresh)
    if (await isProblemSyncNeeded()) {
      console.log('Problem list stale — syncing...');
      syncProblemList().catch(err =>
        console.error('Problem sync failed:', err)
      );
    }

    const problems = await getTodaysQueue(userId);

    return res.json({
      date: new Date().toISOString().split('T')[0],
      problems,
      count: problems.length
    });

  } catch (err) {
    console.error('Get queue error:', err);
    return res.status(500).json({ error: 'Failed to generate queue' });
  }
}

// ─── FORCE REGENERATE ────────────────────────────────────
export async function regenerateQueue(req, res) {
  const userId = req.user.userId;
  const rateLimitKey = `regen:${userId}`;

  try {
    // Rate limit: once per hour
    const lastRegen = await redisClient.get(rateLimitKey);
    if (lastRegen) {
      const minutesAgo = (Date.now() - new Date(lastRegen)) / 60000;
      const minutesLeft = Math.ceil(60 - minutesAgo);
      return res.status(429).json({
        error: `Queue regenerated recently. Try again in ${minutesLeft} minutes.`
      });
    }

    const problems = await generateDailyQueue(userId);
    await saveQueueToDB(userId, problems);

    // Set rate limit — 1 hour TTL
    await redisClient.setEx(rateLimitKey, 3600, new Date().toISOString());

    return res.json({
      date: new Date().toISOString().split('T')[0],
      problems,
      count: problems.length,
      regenerated: true
    });

  } catch (err) {
    console.error('Regenerate queue error:', err);
    return res.status(500).json({ error: 'Failed to regenerate queue' });
  }
}

// ─── MARK PROBLEM AS SOLVED ──────────────────────────────
export async function markSolved(req, res) {
  const userId = req.user.userId;
  const { problemId } = req.body;

  if (!problemId) {
    return res.status(400).json({ error: 'problemId required' });
  }

  try {
    // Update solve log for today
    const today = new Date().toISOString().split('T')[0];
    await query(`
      INSERT INTO solve_log (user_id, solved_date, problems_solved)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, solved_date) DO UPDATE SET
        problems_solved = solve_log.problems_solved + 1
    `, [userId, today]);

    // Invalidate analytics cache so dashboard refreshes
    await Promise.allSettled([
      redisClient.del(`tag_stats:${userId}`),
      redisClient.del(`overview:${userId}`),
      redisClient.del(`comfort_zone:${userId}`)
    ]);

    return res.json({ success: true });

  } catch (err) {
    console.error('Mark solved error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}