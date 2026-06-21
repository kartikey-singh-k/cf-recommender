import axios from 'axios';

const CF_BASE = process.env.CF_API_BASE;

// Delay helper — CF rate limit is 5 req/sec
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── VALIDATE HANDLE ────────────────────────────────────
export async function validateHandle(handle) {
  try {
    const response = await axios.get(`${CF_BASE}/user.info`, {
      params: { handles: handle },
      timeout: 5000
    });

    if (response.data.status !== 'OK') {
      return { valid: false };
    }

    const user = response.data.result[0];
    return {
      valid: true,
      handle: user.handle,        // CF returns the correctly-cased handle
      rating: user.rating || 800, // unrated users have no rating field
      rank: user.rank || 'unrated'
    };

  } catch (err) {
    if (err.response?.status === 400) {
      return { valid: false };    // CF returns 400 for unknown handles
    }
    throw new Error('Codeforces API unreachable');
  }
}

// ─── FETCH ALL SUBMISSIONS ───────────────────────────────
export async function fetchSubmissions(handle) {
  const allSubmissions = [];
  const batchSize = 10000;  // CF max per request
  let from = 1;

  while (true) {
    await delay(300);  // respect CF rate limit

    const response = await axios.get(`${CF_BASE}/user.status`, {
      params: { handle, from, count: batchSize },
      timeout: 15000
    });

    if (response.data.status !== 'OK') break;

    const batch = response.data.result;
    if (batch.length === 0) break;

    allSubmissions.push(...batch);

    // If we got less than batchSize, we've reached the end
    if (batch.length < batchSize) break;

    from += batchSize;
  }

  return allSubmissions;
}

// ─── FETCH RATING HISTORY ────────────────────────────────
export async function fetchRatingHistory(handle) {
  try {
    const response = await axios.get(`${CF_BASE}/user.rating`, {
      params: { handle },
      timeout: 5000
    });

    if (response.data.status !== 'OK') return [];

    return response.data.result.map(contest => ({
      contestId: contest.contestId,
      contestName: contest.contestName,
      rank: contest.rank,
      oldRating: contest.oldRating,
      newRating: contest.newRating,
      ratingChange: contest.newRating - contest.oldRating,
      timestamp: new Date(contest.ratingUpdateTimeSeconds * 1000)
    }));

  } catch {
    return [];
  }
}