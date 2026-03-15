import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);          // all settings routes require a valid JWT
router.get('/',  getSettings);
router.put('/',  updateSettings);

export default router;
