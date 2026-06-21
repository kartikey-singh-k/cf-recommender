import { query } from '../db/index.js';

// ─── ADD FRIEND ──────────────────────────────────────────
export async function addFriend(req, res) {
  const userId = req.user.userId;
  const { cf_handle } = req.body;

  if (!cf_handle) {
    return res.status(400).json({ error: 'cf_handle required' });
  }

  try {
    // Find the friend by CF handle
    const friendResult = await query(
      'SELECT id, cf_handle, comfort_zone_rating, current_streak FROM users WHERE cf_handle = $1',
      [cf_handle]
    );

    if (friendResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No user with that CF handle found. They need to sign up first.'
      });
    }

    const friend = friendResult.rows[0];

    // Can't add yourself
    if (friend.id === userId) {
      return res.status(400).json({ error: 'You cannot add yourself as a friend' });
    }

    // Check already friends
    const existing = await query(
      'SELECT id FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [userId, friend.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Already friends' });
    }

    // Add friendship
    await query(
      'INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)',
      [userId, friend.id]
    );

    return res.status(201).json({
      message: `Added ${friend.cf_handle} as a friend`,
      friend: {
        id: friend.id,
        cf_handle: friend.cf_handle,
        comfort_zone_rating: friend.comfort_zone_rating,
        current_streak: friend.current_streak
      }
    });

  } catch (err) {
    console.error('Add friend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── GET FRIENDS LIST ────────────────────────────────────
export async function getFriends(req, res) {
  const userId = req.user.userId;

  try {
    const result = await query(`
      SELECT
        u.id,
        u.cf_handle,
        u.comfort_zone_rating,
        u.current_streak,
        u.longest_streak,
        -- Get top 3 weak tags for each friend
        (
          SELECT json_agg(t ORDER BY t.success_rate ASC)
          FROM (
            SELECT tag, success_rate, solved, attempted
            FROM tag_stats
            WHERE user_id = u.id
              AND attempted >= 3
            ORDER BY success_rate ASC
            LIMIT 3
          ) t
        ) as weak_tags
      FROM friendships f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1
      ORDER BY u.cf_handle ASC
    `, [userId]);

    return res.json({ friends: result.rows });

  } catch (err) {
    console.error('Get friends error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── REMOVE FRIEND ───────────────────────────────────────
export async function removeFriend(req, res) {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    await query(
      'DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2',
      [userId, friendId]
    );
    return res.json({ message: 'Friend removed' });

  } catch (err) {
    console.error('Remove friend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── TAG COMPARISON ──────────────────────────────────────
export async function compareWithFriend(req, res) {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    // Get both users' tag stats
    const [myTags, friendTags, friendInfo] = await Promise.all([
      query(`
        SELECT tag, success_rate, solved, attempted
        FROM tag_stats
        WHERE user_id = $1 AND attempted >= 3
        ORDER BY tag ASC
      `, [userId]),

      query(`
        SELECT tag, success_rate, solved, attempted
        FROM tag_stats
        WHERE user_id = $1 AND attempted >= 3
        ORDER BY tag ASC
      `, [friendId]),

      query(
        'SELECT cf_handle, comfort_zone_rating, current_streak FROM users WHERE id = $1',
        [friendId]
      )
    ]);

    // Find common tags both users have attempted
    const myTagMap = {};
    myTags.rows.forEach(t => { myTagMap[t.tag] = t; });

    const friendTagMap = {};
    friendTags.rows.forEach(t => { friendTagMap[t.tag] = t; });

    const commonTags = Object.keys(myTagMap)
      .filter(tag => friendTagMap[tag])
      .map(tag => ({
        tag,
        mine: {
          success_rate: parseFloat(myTagMap[tag].success_rate),
          solved: myTagMap[tag].solved,
          attempted: myTagMap[tag].attempted
        },
        theirs: {
          success_rate: parseFloat(friendTagMap[tag].success_rate),
          solved: friendTagMap[tag].solved,
          attempted: friendTagMap[tag].attempted
        },
        // Positive = I'm better, Negative = friend is better
        diff: parseFloat(myTagMap[tag].success_rate) - parseFloat(friendTagMap[tag].success_rate)
      }))
      .sort((a, b) => a.diff - b.diff); // worst for me first

    return res.json({
      friend: friendInfo.rows[0],
      commonTags,
      myTagCount: myTags.rows.length,
      friendTagCount: friendTags.rows.length
    });

  } catch (err) {
    console.error('Compare error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}