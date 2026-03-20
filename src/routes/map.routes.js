import { Router } from 'express';
import { listMapReports, listPublicMapReports } from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/reports', protect, authorize('responder'), listMapReports);
router.get('/public/reports', listPublicMapReports);

export default router;
