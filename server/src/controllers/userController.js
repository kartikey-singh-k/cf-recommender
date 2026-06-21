import { query } from '../db/index.js';
import { validateHandle, fetchSubmissions } from '../services/cfService.js';
import { insertSubmissions, computeTagStats, computeComfortZone } from '../services/ingestionService.js';
import { invalidateAnalyticsCache } from '../controllers/analyticsController.js';
import { invalidateAICache } from '../services/aiService.js';
import { fetchRatingHistory } from '../services/cfService.js';


// ─── LINK CF HANDLE ─────────────────────────────────────
export async function linkHandle(req, res) {
  const { cf_handle } = req.body;
  const userId = req.user.userId;

  if (!cf_handle) {
    return res.status(400).json({ error: 'CF handle required' });
  }

  try {
    // 1. Validate handle exists on Codeforces
    const cfUser = await validateHandle(cf_handle);
    if (!cfUser.valid) {
      return res.status(400).json({ error: 'Codeforces handle not found' });
    }

    // 2. Check handle not already taken by another user
    const existing = await query(
      'SELECT id FROM users WHERE cf_handle = $1 AND id != $2',
      [cfUser.handle, userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This handle is already linked to another account' });
    }

    // 3. Save handle to user
    await query(
      'UPDATE users SET cf_handle = $1, updated_at = NOW() WHERE id = $2',
      [cfUser.handle, userId]
    );

    // 4. Respond immediately — don't make user wait for ingestion
    res.json({
      message: 'Handle linked. Syncing submissions in background...',
      handle: cfUser.handle,
      rating: cfUser.rating
    });

    // 5. Run ingestion AFTER responding (fire and forget)
    // Backfill, streak, and cache invalidation are all inside runIngestion
    runIngestion(userId, cfUser.handle).catch(err =>
      console.error('Ingestion failed:', err)
    );

  } catch (err) {
    console.error('Link handle error:', err);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}

// ─── BACKGROUND INGESTION JOB ───────────────────────────
async function runIngestion(userId, handle) {
  console.log(`Starting ingestion for ${handle}...`);

  // 1. Fetch all submissions from CF
  const rawSubmissions = await fetchSubmissions(handle);
  console.log(`Fetched ${rawSubmissions.length} submissions`);

  // 2. Bulk insert into DB
  const inserted = await insertSubmissions(userId, rawSubmissions);
  console.log(`Inserted ${inserted} new submissions`);

  // 3. Compute tag stats
  await computeTagStats(userId);
  console.log('Tag stats computed');

  // 4. Compute comfort zone
  const comfortZone = await computeComfortZone(userId);

  // 5. Update user record with comfort zone + sync time
  await query(
    `UPDATE users
     SET comfort_zone_rating = $1, last_synced_at = NOW()
     WHERE id = $2`,
    [comfortZone, userId]
  );

  // 6. Backfill solve_log from submissions (last 6 months)
  await query(`
    INSERT INTO solve_log (user_id, solved_date, problems_solved)
    SELECT
      $1,
      DATE(submitted_at) AS solved_date,
      COUNT(DISTINCT problem_id) AS problems_solved
    FROM submissions
    WHERE user_id = $1
      AND verdict = 'OK'
      AND submitted_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE(submitted_at)
    ON CONFLICT (user_id, solved_date) DO UPDATE SET
      problems_solved = EXCLUDED.problems_solved
  `, [userId]);

  // 7. Compute streaks
  // ROW_NUMBER() * INTERVAL '1 day' is correct PostgreSQL date arithmetic
  // current_streak also counts a streak active yesterday so it doesn't break at midnight
  const streakResult = await query(`
    WITH consecutive AS (
      SELECT
        solved_date,
        solved_date - (ROW_NUMBER() OVER (ORDER BY solved_date) * INTERVAL '1 day') AS grp
      FROM solve_log
      WHERE user_id = $1
    ),
    streaks AS (
      SELECT COUNT(*)::int AS streak_length, MAX(solved_date) AS last_day
      FROM consecutive
      GROUP BY grp
    )
    SELECT
      COALESCE(
        (SELECT streak_length FROM streaks WHERE last_day >= CURRENT_DATE - INTERVAL '1 day'),
        0
      ) AS current_streak,
      COALESCE(MAX(streak_length), 0) AS longest_streak
    FROM streaks
  `, [userId]);

  const { current_streak, longest_streak } = streakResult.rows[0];

  await query(
    `UPDATE users SET current_streak = $1, longest_streak = $2 WHERE id = $3`,
    [current_streak, longest_streak, userId]
  );

  // 8. Invalidate caches so next dashboard load gets fresh data
  await invalidateAnalyticsCache(userId);
  await invalidateAICache(userId);

  console.log(`Ingestion complete for ${handle}. Comfort zone: ${comfortZone}`);
}

// ─── MANUAL SYNC ────────────────────────────────────────
export async function syncSubmissions(req, res) {
  const userId = req.user.userId;

  try {
    const user = await query(
      'SELECT cf_handle, last_synced_at FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]?.cf_handle) {
      return res.status(400).json({ error: 'No CF handle linked' });
    }

    res.json({ message: 'Sync started' });

    // Fire and forget
    runIngestion(userId, user.rows[0].cf_handle).catch(console.error);

  } catch (err) {
    console.error('Sync error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// ─── GET USER PROFILE ────────────────────────────────────
export async function getProfile(req, res) {
  const userId = req.user.userId;

  try {
    const result = await query(
      `SELECT id, email, cf_handle, comfort_zone_rating,
              current_streak, longest_streak, last_synced_at
       FROM users WHERE id = $1`,
      [userId]
    );

    const statsResult = await query(
      `SELECT COUNT(*) AS total_submissions,
              COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'OK') AS problems_solved
       FROM submissions WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      user: result.rows[0],
      stats: statsResult.rows[0]
    });

  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── PUBLIC PROFILE (no auth required) ──────────────────
export async function getPublicProfile(req, res) {
  const { handle } = req.params;

  try {
    const userResult = await query(
      `SELECT id, cf_handle, comfort_zone_rating,
              current_streak, longest_streak
       FROM users WHERE cf_handle = $1`,
      [handle]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const [stats, weakTags, strongTags] = await Promise.all([
      query(
        `SELECT
           COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'OK') AS problems_solved,
           MAX(rating) FILTER (WHERE verdict = 'OK')               AS hardest_solved,
           ROUND(
             COUNT(DISTINCT problem_id) FILTER (WHERE verdict = 'OK')::decimal /
             NULLIF(COUNT(DISTINCT problem_id), 0) * 100
           , 1)                                                     AS success_rate
         FROM submissions WHERE user_id = $1`,
        [user.id]
      ),
      query(
        `SELECT tag, success_rate, solved, attempted
         FROM tag_stats
         WHERE user_id = $1 AND attempted >= 3
         ORDER BY success_rate ASC
         LIMIT 5`,
        [user.id]
      ),
      query(
        `SELECT tag, success_rate, solved, attempted
         FROM tag_stats
         WHERE user_id = $1 AND attempted >= 5
         ORDER BY success_rate DESC
         LIMIT 5`,
        [user.id]
      )
    ]);

    return res.json({
      handle: user.cf_handle,
      comfortZone: user.comfort_zone_rating,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      stats: stats.rows[0],
      weakTags: weakTags.rows,
      strongTags: strongTags.rows
    });

  } catch (err) {
    console.error('Public profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── RATING HISTORY (for chart) ──────────────────────────
export async function getRatingHistory(req, res) {
  const userId = req.user.userId;

  try {
    const user = await query(
      'SELECT cf_handle FROM users WHERE id = $1',
      [userId]
    );

    if (!user.rows[0]?.cf_handle) {
      return res.status(400).json({ error: 'No CF handle linked' });
    }

    const history = await fetchRatingHistory(user.rows[0].cf_handle);
    return res.json({ history });

  } catch (err) {
    console.error('Rating history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}