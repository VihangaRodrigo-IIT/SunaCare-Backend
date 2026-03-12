import { Router } from 'express';
import {
  createPetReport,
  listGroupedPetReports,
  listPetReports,
  reviewPetListingReports,
  listPetReportHistory,
} from '../controllers/petReport.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';

const router = Router();

// Public (optional auth) � user submits a report
router.post('/',                    optionalProtect, createPetReport);

// Admin � grouped view (must come before /:id routes)
router.get('/grouped',              protect, authorize('admin'), listGroupedPetReports);

// Admin � flat list (compat)
router.get('/',                     protect, authorize('admin'), listPetReports);

// Admin � act on all reports for a specific pet
router.patch('/pet/:petId/review',  protect, authorize('admin'), reviewPetListingReports);

// Admin – resolved / dismissed history (optionally filtered by ?action=)
router.get('/history',              protect, authorize('admin'), listPetReportHistory);

export default router;
