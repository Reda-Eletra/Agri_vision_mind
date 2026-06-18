const pool = require('../config/database');
const { createPostSchema, createCommentSchema } = require('../validators/appValidator');

// ─── Helper: build Frontend-compatible post object ────────────
const mapPostRow = (row, likedBy = [], comments = [], currentUserId = null) => ({
  id:          row.id,
  authorId:    row.user_id,
  authorName:  row.author_name  || row.name || 'Unknown',
  authorAvatar: row.author_avatar || row.avatar_url || '',
  title:       row.title,
  content:     row.body,   // Frontend uses `content`; DB stores as `body`
  category:    row.category || 'general',
  imageUrl:    row.image_url,
  likes:       parseInt(row.likes_count, 10) || 0,
  likedByMe:   currentUserId ? likedBy.includes(currentUserId) : false,
  comments,
  timestamp:   row.created_at,
});

const mapCommentRow = (row) => ({
  id:          row.id,
  authorName:  row.author_name  || row.name || 'Unknown',
  authorAvatar: row.author_avatar || row.avatar_url || '',
  content:     row.body,
  timestamp:   row.created_at,
});

// ─── POST /posts ──────────────────────────────────────────────
const createPost = async (req, res) => {
  const { error } = createPostSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    // Accept both `content` (Frontend) and `body` (legacy)
    const body = req.body.content || req.body.body;
    const { title, category } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || null);

    const result = await pool.query(
      `INSERT INTO posts (user_id, title, body, category, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, body, category || 'general', imageUrl]
    );

    // Fetch author info
    const userRow = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = userRow.rows[0] || {};

    res.status(201).json({
      message: 'Post created successfully',
      data: mapPostRow(
        { ...result.rows[0], author_name: u.name, author_avatar: u.avatar_url },
        [], [], req.user.id
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /posts ───────────────────────────────────────────────
const getPosts = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    // Cap limit at 100 to prevent excessive data fetches
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.is_visible = TRUE AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE is_visible = TRUE AND deleted_at IS NULL'
    );

    if (result.rows.length === 0) {
      return res.json({
        message: 'Success',
        data: [],
        pagination: { page, limit, total: parseInt(total.rows[0].count, 10) },
      });
    }

    // Batch-fetch likes and comments for all posts in 2 queries (fixes N+1)
    const postIds = result.rows.map((r) => r.id);
    const placeholders = postIds.map((_, i) => `$${i + 1}`).join(', ');

    const [likesResult, commentsResult] = await Promise.all([
      pool.query(
        `SELECT pl.post_id, pl.user_id
         FROM post_likes pl
         WHERE pl.post_id IN (${placeholders})`,
        postIds
      ),
      pool.query(
        `SELECT pc.*, u.name AS author_name, u.avatar_url AS author_avatar
         FROM post_comments pc JOIN users u ON pc.user_id = u.id
         WHERE pc.post_id IN (${placeholders})
         ORDER BY pc.created_at ASC`,
        postIds
      ),
    ]);

    // Group likes by post_id → array of user IDs
    const likesByPost = {};
    for (const like of likesResult.rows) {
      if (!likesByPost[like.post_id]) likesByPost[like.post_id] = [];
      likesByPost[like.post_id].push(like.user_id);
    }

    // Group comments by post_id
    const commentsByPost = {};
    for (const comment of commentsResult.rows) {
      if (!commentsByPost[comment.post_id]) commentsByPost[comment.post_id] = [];
      commentsByPost[comment.post_id].push(mapCommentRow(comment));
    }

    const currentUserId = req.user?.id || null;
    const posts = result.rows.map((row) =>
      mapPostRow(
        row,
        likesByPost[row.id] || [],
        commentsByPost[row.id] || [],
        currentUserId
      )
    );

    res.json({
      message: 'Success',
      data: posts,
      pagination: { page, limit, total: parseInt(total.rows[0].count, 10) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /posts/:id ───────────────────────────────────────────
const getPostById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.id = $1 AND p.is_visible = TRUE AND p.deleted_at IS NULL`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const [likes, comments] = await Promise.all([
      pool.query(
        'SELECT user_id FROM post_likes WHERE post_id = $1',
        [req.params.id]
      ),
      pool.query(
        `SELECT pc.*, u.name AS author_name, u.avatar_url AS author_avatar
         FROM post_comments pc JOIN users u ON pc.user_id = u.id
         WHERE pc.post_id = $1 ORDER BY pc.created_at ASC`,
        [req.params.id]
      ),
    ]);

    const likedBy = likes.rows.map((l) => l.user_id);

    res.json({
      message: 'Success',
      data: mapPostRow(result.rows[0], likedBy, comments.rows.map(mapCommentRow), req.user?.id),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /posts/:id ────────────────────────────────────────
const deletePost = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE posts
       SET deleted_at = NOW(), is_visible = FALSE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Post not found or unauthorized' });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /posts/:id/comments ─────────────────────────────────
const createComment = async (req, res) => {
  const { error } = createCommentSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const post = await pool.query(
      `SELECT id FROM posts
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (post.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const body = req.body.content || req.body.body;
    const result = await pool.query(
      'INSERT INTO post_comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.user.id, body]
    );

    const userRow = await pool.query(
      'SELECT name, avatar_url FROM users WHERE id = $1',
      [req.user.id]
    );
    const u = userRow.rows[0] || {};

    res.status(201).json({
      message: 'Comment added',
      data: mapCommentRow({ ...result.rows[0], author_name: u.name, author_avatar: u.avatar_url }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── GET /posts/:id/comments ──────────────────────────────────
const getComments = async (req, res) => {
  try {
    const post = await pool.query(
      `SELECT id FROM posts
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (post.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    const result = await pool.query(
      `SELECT pc.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM post_comments pc JOIN users u ON pc.user_id = u.id
       WHERE pc.post_id = $1 ORDER BY pc.created_at ASC`,
      [req.params.id]
    );
    res.json({ message: 'Success', data: result.rows.map(mapCommentRow) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /comments/:id ─────────────────────────────────────
const deleteComment = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM post_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Comment not found or unauthorized' });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── POST /posts/:id/like ─────────────────────────────────────
const likePost = async (req, res) => {
  try {
    const post = await pool.query(
      `SELECT id FROM posts
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (post.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    await pool.query(
      'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    await pool.query(
      'UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1',
      [req.params.id]
    );
    const count = await pool.query('SELECT likes_count FROM posts WHERE id = $1', [req.params.id]);
    res.json({
      message: 'Post liked',
      data: { likesCount: Number(count.rows[0].likes_count), likedByMe: true },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── DELETE /posts/:id/like ───────────────────────────────────
const unlikePost = async (req, res) => {
  try {
    const post = await pool.query(
      `SELECT id FROM posts
       WHERE id = $1 AND is_visible = TRUE AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (post.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

    await pool.query(
      'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    await pool.query(
      'UPDATE posts SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = $1) WHERE id = $1',
      [req.params.id]
    );
    const count = await pool.query('SELECT likes_count FROM posts WHERE id = $1', [req.params.id]);
    res.json({
      message: 'Post unliked',
      data: { likesCount: Number(count.rows[0].likes_count), likedByMe: false },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPost, getPosts, getPostById, deletePost,
  createComment, getComments, deleteComment,
  likePost, unlikePost,
};
