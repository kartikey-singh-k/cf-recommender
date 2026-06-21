import { query } from '../db/index.js';
import {
  getProblemsForRecommendation,
  getStretchProblems,
  getForgottenTagProblems
} from './problemService.js';

// ─── WEIGHTED RANDOM TAG SELECTION ──────────────────────
// Tags with lower success rate get higher weight
// = more likely to appear in daily queue
function weightedRandomSelect(tagStats, count) {
  if (tagStats.length === 0) return [];

  // weight = 1 - success_rate
  // dp at 30% success → weight 0.70
  // greedy at 85% success → weight 0.15
  const weighted = tagStats.map(t => ({
    tag: t.tag,
    weight: 1 - parseFloat(t.success_rate)
  }));

  const totalWeight = weighted.reduce((sum, t) => sum + t.weight, 0);
  const selected = [];
  const usedTags = new Set();

  // Keep picking until we have enough unique tags
  let attempts = 0;
  while (selected.length < count && attempts < 100) {
    attempts++;

    // Weighted random pick
    let random = Math.random() * totalWeight;
    for (const item of weighted) {
      random -= item.weight;
      if (random <= 0 && !usedTags.has(item.tag)) {
        selected.push(item.tag);
        usedTags.add(item.tag);
        break;
      }
    }
  }

  return selected;
}

// ─── FORMAT PROBLEM FOR RESPONSE ────────────────────────
function formatProblem(problem, reason) {
  return {
    id: problem.cf_problem_id,
    name: problem.name,
    rating: problem.rating,
    tags: problem.tags,
    url: `https://codeforces.com/problemset/problem/${problem.contest_id}/${problem.problem_index}`,
    editorialUrl: `https://codeforces.com/blog/entry/${problem.contest_id}`,
    reason  // why this problem was picked — shown to user
  };
}

// ─── MAIN: GENERATE DAILY QUEUE ─────────────────────────
export async function generateDailyQueue(userId) {
  // 1. Get user's comfort zone and tag stats
  const userResult = await query(
    'SELECT comfort_zone_rating FROM users WHERE id = $1',
    [userId]
  );
  const comfortZone = userResult.rows[0]?.comfort_zone_rating || 800;

  const tagStatsResult = await query(`
    SELECT tag, success_rate, attempted, solved
    FROM tag_stats
    WHERE user_id = $1
      AND attempted >= 2
    ORDER BY success_rate ASC
  `, [userId]);

  const tagStats = tagStatsResult.rows;

  // Rating ranges
  const minRating = comfortZone + 100;  // recommendation floor
  const maxRating = comfortZone + 200;  // recommendation ceiling
  const stretchMin = comfortZone + 200;
  const stretchMax = comfortZone + 350;

  const queue = [];

  // ── SLOT 1, 2, 3: Weak tag problems ─────────────────
  // Pick 3 tags using weighted random selection
  const weakTags = weightedRandomSelect(tagStats, 3);
  console.log(`Weak tags selected: ${weakTags.join(', ')}`);

  if (weakTags.length > 0) {
    const tagProblems = await getProblemsForRecommendation(
      userId, weakTags, minRating, maxRating
    );

    for (const tag of weakTags) {
      const problems = tagProblems[tag] || [];
      if (problems.length > 0) {
        const picked = problems[Math.floor(Math.random() * problems.length)];
        const tagStat = tagStats.find(t => t.tag === tag);
        const successPct = Math.round(parseFloat(tagStat?.success_rate || 0) * 100);
        queue.push(formatProblem(
          picked,
          `Weak tag: ${tag} (${successPct}% success rate)`
        ));
      }
    }
  }

  // ── SLOT 4: Stretch problem ──────────────────────────
  // Higher rating, any tag — keeps you growing
  const stretchProblems = await getStretchProblems(userId, stretchMin, stretchMax);
  if (stretchProblems.length > 0) {
    const picked = stretchProblems[Math.floor(Math.random() * stretchProblems.length)];
    queue.push(formatProblem(
      picked,
      `Stretch: push beyond your comfort zone (${stretchMin}-${stretchMax})`
    ));
  }

  // ── SLOT 5: Forgotten tag ────────────────────────────
  // Tag you haven't touched in 14+ days
  const forgottenProblems = await getForgottenTagProblems(userId, comfortZone);
  if (forgottenProblems.length > 0) {
    const picked = forgottenProblems[Math.floor(Math.random() * forgottenProblems.length)];
    queue.push(formatProblem(
      picked,
      `Forgotten tag: you have not solved this type in 14+ days`
    ));
  }

  // ── FALLBACK: if queue is short, fill with rated problems ─
  if (queue.length < 3) {
    const fallback = await getStretchProblems(userId, minRating, maxRating);
    for (const p of fallback) {
      if (queue.length >= 5) break;
      if (!queue.find(q => q.id === p.cf_problem_id)) {
        queue.push(formatProblem(p, `Recommended at your level (${minRating}-${maxRating})`));
      }
    }
  }

  return queue;
}

// ─── SAVE QUEUE TO DB ────────────────────────────────────
export async function saveQueueToDB(userId, problems) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await query(`
    INSERT INTO daily_queues (user_id, queue_date, problems)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, queue_date) DO UPDATE SET
      problems = EXCLUDED.problems,
      generated_at = NOW()
  `, [userId, today, JSON.stringify(problems)]);
}

// ─── GET OR GENERATE TODAY'S QUEUE ──────────────────────
export async function getTodaysQueue(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Check if already generated today
  const existing = await query(`
    SELECT problems FROM daily_queues
    WHERE user_id = $1 AND queue_date = $2
  `, [userId, today]);

  if (existing.rows.length > 0) {
    return existing.rows[0].problems; // already a JS object (JSONB)
  }

  // Generate fresh queue
  const problems = await generateDailyQueue(userId);
  await saveQueueToDB(userId, problems);
  return problems;
}