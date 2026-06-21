import { query } from '../db/index.js';
import redisClient from '../db/redis.js';

const CACHE_TTL = 3600; // 1 hour in seconds

// ─── HELPER: cache wrapper ───────────────────────────────
async function withCache(key, ttl, fetchFn) {
  try {
    const cached = await redisClient.get(key);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis down — just fetch fresh
  }

  const data = await fetchFn();

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch {
    // Redis down — still return data
  }

  return data;
}

// ─── TAG STATS ───────────────────────────────────────────
export async function getTagStats(req, res) {
  const userId = req.user.userId;
  const cacheKey = `tag_stats:${userId}`;

  try {
    const data = await withCache(cacheKey, CACHE_TTL, async () => {
      const result = await query(
        `SELECT tag, attempted, solved, success_rate,
                avg_difficulty, last_solved_at
         FROM tag_stats
         WHERE user_id = $1
         ORDER BY success_rate ASC`,
        [userId]
      );
      return result.rows;
    });

    return res.json({ tags: data });

  } catch (err) {
    console.error('Tag stats error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── COMFORT ZONE ────────────────────────────────────────
export async function getComfortZone(req, res) {
  const userId = req.user.userId;
  const cacheKey = `comfort_zone:${userId}`;

  try {
    const data = await withCache(cacheKey, CACHE_TTL, async () => {
      // Rating distribution — how many problems solved per bucket
      const distribution = await query(
        `SELECT
           FLOOR(rating / 100) * 100   AS bucket,
           COUNT(DISTINCT problem_id)  AS attempted,
           COUNT(DISTINCT CASE WHEN verdict = 'OK'
                 THEN problem_id END)  AS solved
         FROM submissions
         WHERE user_id = $1 AND rating IS NOT NULL
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [userId]
      );

      // Comfort zone from users table
      const user = await query(
        'SELECT comfort_zone_rating FROM users WHERE id = $1',
        [userId]
      );

      return {
        comfortZoneRating: user.rows[0].comfort_zone_rating,
        recommendationFloor: user.rows[0].comfort_zone_rating + 100,
        stretchRating: user.rows[0].comfort_zone_rating + 200,
        distribution: distribution.rows
      };
    });

    return res.json(data);

  } catch (err) {
    console.error('Comfort zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── STREAK + SOLVE LOG ──────────────────────────────────
export async function getStreak(req, res) {
  const userId = req.user.userId;

  try {
    // Get solve log for last 6 months (for heatmap)
    const solveLog = await query(
      `SELECT solved_date, problems_solved
       FROM solve_log
       WHERE user_id = $1
         AND solved_date >= NOW() - INTERVAL '6 months'
       ORDER BY solved_date ASC`,
      [userId]
    );

    // Get streak from users table
    const user = await query(
      'SELECT current_streak, longest_streak FROM users WHERE id = $1',
      [userId]
    );

    return res.json({
      currentStreak: user.rows[0].current_streak,
      longestStreak: user.rows[0].longest_streak,
      solveLog: solveLog.rows
    });

  } catch (err) {
    console.error('Streak error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── OVERVIEW STATS ──────────────────────────────────────
export async function getOverview(req, res) {
  const userId = req.user.userId;
  const cacheKey = `overview:${userId}`;

  try {
    const data = await withCache(cacheKey, CACHE_TTL, async () => {
      const result = await query(
        `SELECT
           COUNT(DISTINCT problem_id)
             FILTER (WHERE verdict = 'OK')           AS problems_solved,
           COUNT(DISTINCT problem_id)                AS problems_attempted,
           COUNT(*)                                  AS total_submissions,
           ROUND(
             COUNT(DISTINCT problem_id)
               FILTER (WHERE verdict = 'OK')::decimal /
             NULLIF(COUNT(DISTINCT problem_id), 0) * 100
           , 1)                                      AS overall_success_rate,
           MAX(rating) FILTER (WHERE verdict = 'OK') AS hardest_solved
         FROM submissions
         WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0];
    });

    return res.json({ overview: data });

  } catch (err) {
    console.error('Overview error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── INVALIDATE CACHE (call after sync) ─────────────────
export async function invalidateAnalyticsCache(userId) {
  const keys = [
    `tag_stats:${userId}`,
    `comfort_zone:${userId}`,
    `overview:${userId}`
  ];
  await Promise.allSettled(keys.map(k => redisClient.del(k)));
}