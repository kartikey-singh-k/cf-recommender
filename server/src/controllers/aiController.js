import {
  generateWeaknessReport,
  generatePracticePlan,
  getProblemHint
} from '../services/aiService.js';

// ─── WEAKNESS REPORT ────────────────────────────────────
export async function getWeaknessReport(req, res) {
  const userId = req.user.userId;

  try {
    const result = await generateWeaknessReport(userId);
    return res.json(result);
  } catch (err) {
    console.error('Weakness report error:', err);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
}

// ─── PRACTICE PLAN ───────────────────────────────────────
export async function getPracticePlan(req, res) {
  const userId = req.user.userId;
  const { goal, weeks } = req.body;

  if (!goal || !weeks) {
    return res.status(400).json({ error: 'goal and weeks are required' });
  }

  if (weeks < 1 || weeks > 12) {
    return res.status(400).json({ error: 'weeks must be between 1 and 12' });
  }

  try {
    const result = await generatePracticePlan(userId, goal, parseInt(weeks));

    // If rate limited or error — return as is
    if (result.rateLimited) {
      return res.json(result);
    }

    // Try to parse JSON from text
    let parsed = null;
    if (typeof result.text === 'string') {
      try {
        // Extra cleanup in case model still adds any stray characters
        const clean = result.text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        parsed = JSON.parse(clean);
      } catch (parseErr) {
        console.error('JSON parse failed. Raw text:', result.text);
        // Return raw text so frontend can show something
        return res.json(result);
      }
    }

    return res.json({
      ...result,
      parsed
    });

  } catch (err) {
    console.error('Practice plan error:', err);
    return res.status(500).json({ error: 'Failed to generate plan' });
  }
}

// ─── PROBLEM HINT ────────────────────────────────────────
export async function getHint(req, res) {
  const userId = req.user.userId;
  const { problemId, problemName, problemTags } = req.body;

  if (!problemId || !problemName) {
    return res.status(400).json({ error: 'problemId and problemName required' });
  }

  try {
    const result = await getProblemHint(
      userId,
      problemId,
      problemName,
      problemTags || []
    );
    return res.json(result);
  } catch (err) {
    console.error('Hint error:', err);
    return res.status(500).json({ error: 'Failed to generate hint' });
  }
}