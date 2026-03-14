import express from 'express';
import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { body } from 'express-validator';
import {
  getPosts,
  getPostById,
  getPostComments,
  getMyPosts,
  createPost,
  updatePost,
  deletePost,
  likePost,
  likeComment,
  commentOnPost,
  flagPost,
  unflagPost,
  reportComment,
  unflagComment,
  hideComment,
  deleteComment,
  listFlaggedComments,
} from '../controllers/post.controller.js';
import { protect, optionalProtect, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commentUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'comments');
fs.mkdirSync(commentUploadsDir, { recursive: true });
const postUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'posts');
fs.mkdirSync(postUploadsDir, { recursive: true });

const commentStorage = multer.diskStorage({
  destination: commentUploadsDir,
  filename: (_req, file, callback) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const commentUpload = multer({
  storage: commentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    callback(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

const postStorage = multer.diskStorage({
  destination: postUploadsDir,
  filename: (_req, file, callback) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const postUpload = multer({
  storage: postStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    callback(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
  },
});

const createValidation = [
  body('body').trim().notEmpty().withMessage('Post body is required'),
];

const commentValidation = [
  body('body').custom((value, { req }) => {
    const text = typeof value === 'string' ? value.trim() : '';
    const hasImage = Boolean(req.file) || Boolean(req.body.image_url);
    if (!text && !hasImage) {
      throw new Error('Comment text or image is required');
    }
    return true;
  }),
];

const reportCommentValidation = [
  body('reason')
    .optional({ nullable: true })
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Reason must be between 2 and 120 characters'),
  body('details')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Details must be 500 characters or fewer'),
];

router.get('/mine', protect, getMyPosts);
router.get('/comments/flagged', protect, authorize('admin', 'responder'), listFlaggedComments);
router.post('/comments/:commentId/like', protect, likeComment);
router.post('/comments/:commentId/report', protect, reportCommentValidation, validate, reportComment);
router.put('/comments/:commentId/unflag', protect, authorize('admin', 'responder'), unflagComment);
router.put('/comments/:commentId/hide', protect, authorize('admin', 'responder'), hideComment);
router.delete('/comments/:commentId', protect, deleteComment);

router.get('/', optionalProtect, getPosts);
router.get('/:id/comments', optionalProtect, getPostComments);
router.get('/:id', optionalProtect, getPostById);
router.post('/', protect, postUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }]), createValidation, validate, createPost);
router.put('/:id', protect, postUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }]), updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/comments', protect, commentUpload.single('image'), commentValidation, validate, commentOnPost);
router.put('/:id/flag', protect, flagPost);
router.put('/:id/unflag', protect, authorize('responder'), unflagPost);

export default router;
