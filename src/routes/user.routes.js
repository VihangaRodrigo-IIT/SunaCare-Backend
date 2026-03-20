import { Router } from 'express';
import { getMe, updateMe, listUsers, getUser, updateUser, deactivateUser } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/me',               protect, getMe);
router.put('/me',               protect, updateMe);
router.put('/profile',          protect, updateMe);   // alias used by admin/responder settings
router.get('/',                 protect, authorize('admin'), listUsers);
router.get('/:id',              protect, authorize('admin'), getUser);
router.patch('/:id',            protect, authorize('admin'), updateUser);
router.patch('/:id/deactivate', protect, authorize('admin'), deactivateUser);

export default router;
