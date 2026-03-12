import { Router } from 'express';
import {
	submitApplication,
	listApplications,
	getApplication,
	createCredentials,
	resendCredentials,
	listMapNgos,
	listAdminNgos,
	createMapNgo,
	updateMapNgo,
	deleteMapNgo,
	getMyMapNgo,
	upsertMyMapNgo,
} from '../controllers/ngo.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/',                               optionalProtect, listMapNgos);
router.get('/admin/list',                    protect, authorize('admin'), listAdminNgos);
router.get('/me/pin',                        protect, authorize('responder'), getMyMapNgo);
router.put('/me/pin',                        protect, authorize('responder'), upsertMyMapNgo);
router.post('/',                             protect, authorize('admin'), createMapNgo);
router.patch('/:id',                         protect, authorize('admin'), updateMapNgo);
router.delete('/:id',                        protect, authorize('admin'), deleteMapNgo);

router.post('/applications',                    submitApplication);                     // public
router.get('/applications',                     protect, authorize('admin'), listApplications);
router.get('/applications/:id',                 protect, authorize('admin'), getApplication);
router.post('/:id/credentials',                 protect, authorize('admin'), createCredentials);
router.post('/:id/credentials/resend',          protect, authorize('admin'), resendCredentials);

export default router;
