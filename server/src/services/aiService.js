import { GoogleGenerativeAI } from '@google/generative-ai';
import redisClient from '../db/redis.js';
import { query } from '../db/index.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = 'gemini-2.5-flash';
const CACHE_TTL = 86400; // 24 hours

// ─── HELPER: call Gemini with caching + error handling ──
// isJson = true forces JSON mime type (practice plan only)
async function cachedGeminiCall(cacheKey, prompt, maxTokens = 500, isJson = false) {
  // Check cache first
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch {
    // Redis down — continue without cache
  }

  try {
    const generationConfig = { maxOutputTokens: maxTokens };
    if (isJson) {
      generationConfig.responseMimeType = 'application/json';
    }

    const model = genAI.getGenerativeModel({ model: MODEL, generationConfig });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    // Strip markdown code fences just in case
    const text = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const response = {
      text,
      cached: false,
      rateLimited: false,
      generatedAt: new Date().toISOString()
    };

    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
    } catch {
      // Redis down — still return result
    }

    return response;

  } catch (err) {
    console.error('Gemini API error:', err.message);

    if (err.status === 429) {
      return {
        text: 'AI analysis temporarily unavailable due to rate limits. Try again in a few minutes.',
        cached: false,
        rateLimited: true,
        generatedAt: new Date().toISOString()
      };
    }

    if (err.status === 404) {
      return {
        text: 'AI model configuration error. Please contact support.',
        cached: false,
        rateLimited: false,
        generatedAt: new Date().toISOString()
      };
    }

    throw err;
  }
}

// ─── WEAKNESS REPORT ────────────────────────────────────
// Returns plain text — no JSON mime type
export async function generateWeaknessReport(userId) {
  const tagStats = await query(`
    SELECT tag, attempted, solved, success_rate, avg_difficulty
    FROM tag_stats
    WHERE user_id = $1 AND attempted >= 3
    ORDER BY success_rate ASC
    LIMIT 20
  `, [userId]);

  if (tagStats.rows.length === 0) {
    return {
      text: 'Not enough data yet. Solve at least 10 problems across different tags to generate your weakness report.',
      cached: false,
      rateLimited: false,
      generatedAt: new Date().toISOString()
    };
  }

  const user = await query(
    'SELECT cf_handle, comfort_zone_rating FROM users WHERE id = $1',
    [userId]
  );
  const { cf_handle, comfort_zone_rating } = user.rows[0];

  const tagSummary = tagStats.rows.map(t =>
    `${t.tag}: ${Math.round(t.success_rate * 100)}% success (${t.solved}/${t.attempted} solved, avg difficulty ${t.avg_difficulty})`
  ).join('\n');

  const prompt = `You are a competitive programming coach. Analyze this student's Codeforces tag performance and write a 3-4 sentence weakness analysis.

Student: ${cf_handle}
Comfort zone rating: ${comfort_zone_rating}

Tag performance (weakest first):
${tagSummary}

Rules:
- Be specific, reference actual numbers
- Identify the 1-2 most critical weak spots
- Give one concrete first step to improve
- Be direct, not generic
- Maximum 4 sentences`;

  const cacheKey = `ai:weakness:${userId}`;
  return cachedGeminiCall(cacheKey, prompt, 2000, false); // plain text
}

// ─── PRACTICE PLAN GENERATOR ────────────────────────────
// Returns JSON — uses JSON mime type + high token limit
export async function generatePracticePlan(userId, goal, weeks) {
  const tagStats = await query(`
    SELECT tag, success_rate, solved, attempted
    FROM tag_stats
    WHERE user_id = $1 AND attempted >= 2
    ORDER BY success_rate ASC
    LIMIT 15
  `, [userId]);

  const user = await query(
    'SELECT comfort_zone_rating FROM users WHERE id = $1',
    [userId]
  );
  const comfortZone = user.rows[0]?.comfort_zone_rating || 800;

  const weakTags = tagStats.rows
    .filter(t => t.success_rate < 0.7)
    .map(t => `${t.tag} (${Math.round(t.success_rate * 100)}% success)`)
    .join(', ');

  const prompt = `You are a competitive programming coach. Create a ${weeks}-week practice plan as JSON.

Goal: ${goal}
Comfort zone rating: ${comfortZone}
Weak tags: ${weakTags || 'general improvement'}

Return this exact JSON structure with ${weeks} items in weeklyPlan:
{"goal":"string","weeks":${weeks},"weeklyPlan":[{"week":1,"focus":"string","topics":["tag1","tag2"],"dailyTarget":"string","milestone":"string"}],"generalTips":["tip1","tip2","tip3"]}

Keep each string value under 120 characters. Fill all ${weeks} weeks.`;

  const goalSlug = goal.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
  const cacheKey = `ai:plan:v3:${userId}:${goalSlug}:${weeks}w`;
  return cachedGeminiCall(cacheKey, prompt, 4000, true); // JSON mime type + high tokens
}

// ─── PROBLEM HINT ────────────────────────────────────────
export async function getProblemHint(userId, problemId, problemName, problemTags) {
  const today = new Date().toISOString().split('T')[0];
  const hintsKey = `hints:count:${userId}:${today}`;

  try {
    const hintCount = await redisClient.get(hintsKey);
    if (hintCount && parseInt(hintCount) >= 3) {
      return {
        text: 'You have used all 3 hints for today. Hints reset at midnight.',
        rateLimited: true
      };
    }
    await redisClient.incr(hintsKey);
    await redisClient.expire(hintsKey, 86400);
  } catch {
    // Redis down — allow hint
  }

  const prompt = `You are a competitive programming mentor. Give a one-sentence hint for this problem.

Problem: ${problemName}
Tags: ${problemTags.join(', ')}

Rules:
- One sentence only
- Suggest direction without naming the algorithm directly
- Push the student to think, not copy
- Good example: "Think about what changes when you process elements from right to left"
- Bad example: "Use a stack to track indices" (too specific)

One sentence hint:`;

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { maxOutputTokens: 100 }
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const text = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    return { text, rateLimited: false };

  } catch (err) {
    console.error('Hint error:', err.message);

    if (err.status === 429) {
      return {
        text: 'Hint unavailable due to rate limits. Try again in a few minutes.',
        rateLimited: true
      };
    }

    return {
      text: 'Could not generate hint right now. Try again shortly.',
      rateLimited: false
    };
  }
}

// ─── INVALIDATE AI CACHE ─────────────────────────────────
export async function invalidateAICache(userId) {
  try {
    await redisClient.del(`ai:weakness:${userId}`);
  } catch {
    // Redis down — ignore
  }
}