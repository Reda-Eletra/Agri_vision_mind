const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const upload = require('../config/multer');
const {
  createPost, getPosts, getPostById, deletePost,
  createComment, getComments, deleteComment,
  likePost, unlikePost,
} = require('../controllers/communityController');
const {
  createTransaction,
  getTransactions,
  getAllTransactions,
  createGeneralTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');

// ─── Posts ────────────────────────────────────────────────────
router.post('/posts',        authenticate, upload.single('image'), createPost);
router.get('/posts',         authenticate, getPosts);
router.get('/posts/:id',     authenticate, getPostById);
router.delete('/posts/:id',  authenticate, deletePost);

// ─── Comments ─────────────────────────────────────────────────
router.post('/posts/:id/comments',   authenticate, createComment);
router.get('/posts/:id/comments',    authenticate, getComments);
router.delete('/comments/:id',       authenticate, deleteComment);

// ─── Likes ────────────────────────────────────────────────────
router.post('/posts/:id/like',   authenticate, likePost);
router.delete('/posts/:id/like', authenticate, unlikePost);

// ─── Transactions (farm-scoped) ──────────────────────────────
router.post('/farms/:id/transactions', authenticate, createTransaction);
router.get('/farms/:id/transactions',  authenticate, getTransactions);

// ─── Transactions (general – not tied to a specific farm) ────
router.get('/transactions',         authenticate, getAllTransactions);
router.post('/transactions',        authenticate, createGeneralTransaction);
router.delete('/transactions/:id',  authenticate, deleteTransaction);

module.exports = router;
