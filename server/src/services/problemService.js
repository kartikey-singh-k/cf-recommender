import axios from 'axios';
import { query } from '../db/index.js';
import redisClient from '../db/redis.js';

const CF_BASE = process.env.CF_API_BASE;
const PROBLEM_CACHE_KEY = 'problems:last_cached';
const CACHE_DAYS = 7;

// ─── FETCH AND CACHE FULL PROBLEM LIST ──────────────────
export async function syncProblemList() {
  console.log('Syncing CF problem list...');

  const response = await axios.get(`${CF_BASE}/problemset.problems`, {
    timeout: 15000
  });

  if (response.data.status !== 'OK') {
    throw new Error('CF API returned non-OK status');
  }

  const problems = response.data.result.problems;
  console.log(`Fetched ${problems.length} problems from CF`);

  // Filter out problems with no rating (unrated/gym problems)
  const rated = problems.filter(p => p.rating && p.contestId);

  // Bulk upsert — update if exists, insert if new
  // Process in batches of 500 to avoid query size limits
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < rated.length; i += batchSize) {
    const batch = rated.slice(i, i + batchSize);

    const values = [];
    const placeholders = batch.map((p, idx) => {
      const offset = idx * 6;
      const problemId = `${p.contestId}${p.index}`;
      values.push(
        problemId,
        p.contestId,
        p.index,
        p.name,
        p.rating,
        p.tags || []
      );
      return `($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6})`;
    });

    await query(`
      INSERT INTO problems (cf_problem_id, contest_id, problem_index, name, rating, tags)
      VALUES ${placeholders.join(',')}
      ON CONFLICT (cf_problem_id) DO UPDATE SET
        name = EXCLUDED.name,
        rating = EXCLUDED.rating,
        tags = EXCLUDED.tags,
        cached_at = NOW()
    `, values);

    inserted += batch.length;
    console.log(`Upserted ${inserted}/${rated.length} problems`);
  }

  // Mark last sync time in Redis
  await redisClient.set(PROBLEM_CACHE_KEY, new Date().toISOString());

  console.log('Problem list sync complete');
  return rated.length;
}

// ─── CHECK IF SYNC NEEDED ────────────────────────────────
export async function isProblemSyncNeeded() {
  try {
    const lastCached = await redisClient.get(PROBLEM_CACHE_KEY);
    if (!lastCached) return true;

    const daysSince = (Date.now() - new Date(lastCached)) / (1000 * 60 * 60 * 24);
    return daysSince >= CACHE_DAYS;
  } catch {
    return true; // Redis down — assume sync needed
  }
}

// ─── GET PROBLEMS FOR RECOMMENDATION ────────────────────
// Fetch problems matching specific tags and rating range
// that the user hasn't already attempted
export async function getProblemsForRecommendation(userId, tags, minRating, maxRating) {
  // Get all problem IDs user has already attempted
  const attempted = await query(
    'SELECT DISTINCT problem_id FROM submissions WHERE user_id = $1',
    [userId]
  );
  const attemptedIds = new Set(attempted.rows.map(r => r.problem_id));

  // For each tag, find matching unsolved problems in rating range
  const results = {};

  for (const tag of tags) {
    const result = await query(`
      SELECT cf_problem_id, name, rating, tags, contest_id, problem_index
      FROM problems
      WHERE rating BETWEEN $1 AND $2
        AND $3 = ANY(tags)
        AND cf_problem_id != ALL($4::text[])
      ORDER BY RANDOM()
      LIMIT 10
    `, [minRating, maxRating, tag, [...attemptedIds]]);

    results[tag] = result.rows;
  }

  return results;
}

// ─── GET STRETCH PROBLEMS ────────────────────────────────
export async function getStretchProblems(userId, minRating, maxRating) {
  const attempted = await query(
    'SELECT DISTINCT problem_id FROM submissions WHERE user_id = $1',
    [userId]
  );
  const attemptedIds = [...new Set(attempted.rows.map(r => r.problem_id))];

  const result = await query(`
    SELECT cf_problem_id, name, rating, tags, contest_id, problem_index
    FROM problems
    WHERE rating BETWEEN $1 AND $2
      AND cf_problem_id != ALL($3::text[])
    ORDER BY RANDOM()
    LIMIT 5
  `, [minRating, maxRating, attemptedIds]);

  return result.rows;
}

// ─── GET FORGOTTEN TAG PROBLEMS ─────────────────────────
// Problems in tags not solved in the last 14 days
export async function getForgottenTagProblems(userId, comfortRating) {
  // Find tags not solved recently
  const forgottenTags = await query(`
    SELECT tag
    FROM tag_stats
    WHERE user_id = $1
      AND solved > 0
      AND (last_solved_at IS NULL OR last_solved_at < NOW() - INTERVAL '14 days')
    ORDER BY last_solved_at ASC NULLS FIRST
    LIMIT 3
  `, [userId]);

  if (forgottenTags.rows.length === 0) return [];

  const attempted = await query(
    'SELECT DISTINCT problem_id FROM submissions WHERE user_id = $1',
    [userId]
  );
  const attemptedIds = [...new Set(attempted.rows.map(r => r.problem_id))];

  const tag = forgottenTags.rows[0].tag;

  const result = await query(`
    SELECT cf_problem_id, name, rating, tags, contest_id, problem_index
    FROM problems
    WHERE rating BETWEEN $1 AND $2
      AND $3 = ANY(tags)
      AND cf_problem_id != ALL($4::text[])
    ORDER BY RANDOM()
    LIMIT 3
  `, [comfortRating - 100, comfortRating + 100, tag, attemptedIds]);

  return result.rows;
}
