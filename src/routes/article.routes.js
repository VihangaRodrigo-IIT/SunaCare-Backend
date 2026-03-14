import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listArticles, listAllArticles, getArticle, createArticle, updateArticle, deleteArticle } from '../controllers/article.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
	destination: path.join(__dirname, '..', '..', 'uploads', 'articles'),
	filename: (_req, file, callback) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		callback(null, `${unique}${path.extname(file.originalname)}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		const allowed = /jpeg|jpg|png|gif|webp/;
		const ext = allowed.test(path.extname(file.originalname).toLowerCase());
		const mime = allowed.test(file.mimetype);
		callback(ext && mime ? null : new Error('Only image files are allowed'), ext && mime);
	},
});

const router = Router();

router.get('/all', protect, authorize('responder'), listAllArticles);  // responder+ — includes drafts
router.get('/',    listArticles);                                       // public — published only
router.get('/:id', optionalProtect, getArticle);                       // public + optional auth (for view tracking)
router.post('/',         protect, authorize('responder'), upload.single('cover_image'), createArticle);
router.put('/:id',       protect, authorize('responder'), upload.single('cover_image'), updateArticle);
router.delete('/:id',    protect, authorize('responder'), deleteArticle);

export default router;
