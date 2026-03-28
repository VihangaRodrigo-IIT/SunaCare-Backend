import { Router } from 'express';
import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ngoDocUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'ngo-docs');
fs.mkdirSync(ngoDocUploadsDir, { recursive: true });

const ngoDocStorage = multer.diskStorage({
	destination: ngoDocUploadsDir,
	filename: (_req, file, callback) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		callback(null, `${unique}${path.extname(file.originalname)}`);
	},
});

const ngoDocUpload = multer({
	storage: ngoDocStorage,
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.get('/',                               optionalProtect, listMapNgos);
router.get('/admin/list',                    protect, authorize('admin'), listAdminNgos);
router.get('/me/pin',                        protect, authorize('responder'), getMyMapNgo);
router.put('/me/pin',                        protect, authorize('responder'), upsertMyMapNgo);
router.post('/',                             protect, authorize('admin'), createMapNgo);
router.patch('/:id',                         protect, authorize('admin'), updateMapNgo);
router.delete('/:id',                        protect, authorize('admin'), deleteMapNgo);

router.post('/applications',                    ngoDocUpload.single('document'), submitApplication);                     // public
router.get('/applications',                     protect, authorize('admin'), listApplications);
router.get('/applications/:id',                 protect, authorize('admin'), getApplication);
router.post('/:id/credentials',                 protect, authorize('admin'), createCredentials);
router.post('/:id/credentials/resend',          protect, authorize('admin'), resendCredentials);

export default router;
