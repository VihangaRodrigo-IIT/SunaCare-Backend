import { Router } from 'express';
import { adminDashboard, responderDashboard, approveOrg, rejectOrg } from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/admin',             protect, authorize('admin'),     adminDashboard);
router.get('/responder',         protect, authorize('responder'), responderDashboard);
router.patch('/approve-org/:id', protect, authorize('admin'),     approveOrg);
router.patch('/reject-org/:id',  protect, authorize('admin'),     rejectOrg);

export default router;
