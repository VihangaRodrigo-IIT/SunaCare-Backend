import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createGuestReport,
  createReport,
  listReports,
  getReport,
  updateStatus,
  assignReport,
  flagReport,
  unflagReport,
  listMapReports,
  listPublicMapReports,
  updateReportMapVisibility,
  deleteReport,
} from '../controllers/report.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'reports'),
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

router.post('/guest', upload.single('media'), createGuestReport);
router.post('/', optionalProtect, upload.single('media'), createReport);
router.get('/map/public', listPublicMapReports);
router.get('/map/all', protect, authorize('responder'), listMapReports);
router.get('/', protect, listReports);
router.get('/:id', protect, getReport);
router.patch('/:id/map-visibility', protect, authorize('responder'), updateReportMapVisibility);
router.put('/:id/status', protect, authorize('responder'), updateStatus);
router.patch('/:id/assign', protect, authorize('responder'), assignReport);
router.put('/:id/flag', protect, flagReport);
router.put('/:id/unflag', protect, authorize('admin'), unflagReport);
router.delete('/:id', protect, authorize('admin'), deleteReport);

export default router;
