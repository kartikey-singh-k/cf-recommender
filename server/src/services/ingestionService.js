import { query } from '../db/index.js';

// Transform raw CF submission into our DB schema
function transformSubmission(userId, sub) {
  const problemId = `${sub.problem.contestId}${sub.problem.index}`;
  return {
    userId,
    cfSubmissionId: sub.id,
    problemId,
    problemName: sub.problem.name,
    rating: sub.problem.rating || null,
    tags: sub.problem.tags || [],
    verdict: sub.verdict,
    submittedAt: new Date(sub.creationTimeSeconds * 1000)
  };
}

// Bulk insert with ON CONFLICT to skip duplicates
export async function insertSubmissions(userId, rawSubmissions) {
  if (rawSubmissions.length === 0) return 0;

  const submissions = rawSubmissions.map(s => transformSubmission(userId, s));

  // Build bulk insert — PostgreSQL supports inserting multiple rows at once
  // Much faster than individual INSERTs in a loop
  const values = [];
  const placeholders = submissions.map((sub, i) => {
    const offset = i * 8;
    values.push(
      sub.userId,
      sub.cfSubmissionId,
      sub.problemId,
      sub.problemName,
      sub.rating,
      sub.tags,
      sub.verdict,
      sub.submittedAt
    );
    return `($${offset+1},$${offset+2},$${offset+3},$${offset+4},$${offset+5},$${offset+6},$${offset+7},$${offset+8})`;
  });

  const sql = `
    INSERT INTO submissions
      (user_id, cf_submission_id, problem_id, problem_name, rating, tags, verdict, submitted_at)
    VALUES ${placeholders.join(',')}
    ON CONFLICT (user_id, cf_submission_id) DO NOTHING
  `;

  const result = await query(sql, values);
  return result.rowCount;
}

// Compute tag stats from submissions in DB
export async function computeTagStats(userId) {
  // Delete existing stats and recompute from scratch
  await query('DELETE FROM tag_stats WHERE user_id = $1', [userId]);

  // This single SQL query does all the heavy lifting:
  // For each tag, count how many problems were attempted vs solved
  const sql = `
    INSERT INTO tag_stats (user_id, tag, attempted, solved, success_rate, avg_difficulty, last_solved_at)
    SELECT
      user_id,
      tag,
      COUNT(DISTINCT problem_id)                              AS attempted,
      COUNT(DISTINCT CASE WHEN verdict = 'OK' THEN problem_id END) AS solved,
      ROUND(
        COUNT(DISTINCT CASE WHEN verdict = 'OK' THEN problem_id END)::decimal /
        NULLIF(COUNT(DISTINCT problem_id), 0),
        4
      )                                                       AS success_rate,
      ROUND(AVG(rating) FILTER (WHERE verdict = 'OK' AND rating IS NOT NULL)) AS avg_difficulty,
      MAX(submitted_at) FILTER (WHERE verdict = 'OK')        AS last_solved_at
    FROM submissions, UNNEST(tags) AS tag
    WHERE user_id = $1
      AND tag != ''
    GROUP BY user_id, tag
    ORDER BY success_rate ASC
  `;

  await query(sql, [userId]);
}

// Compute comfort zone rating
export async function computeComfortZone(userId) {
  const sql = `
    SELECT
      FLOOR(rating / 100) * 100   AS bucket,
      COUNT(DISTINCT problem_id)  AS attempted,
      COUNT(DISTINCT CASE WHEN verdict = 'OK' THEN problem_id END) AS solved
    FROM submissions
    WHERE user_id = $1
      AND rating IS NOT NULL
    GROUP BY bucket
    HAVING COUNT(DISTINCT problem_id) >= 3
    ORDER BY bucket DESC
  `;

  const result = await query(sql, [userId]);

  // Find highest bucket with >70% solve rate
  for (const row of result.rows) {
    const solveRate = row.solved / row.attempted;
    if (solveRate >= 0.7) {
      return parseInt(row.bucket);
    }
  }

  return 800; // default for new users
}