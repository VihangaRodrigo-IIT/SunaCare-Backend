import { Router } from 'express';
import { register, login, logout, refresh, sendOtp, verifyOtp, getMe, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register',         register);
router.post('/login',            login);
router.post('/logout',           protect, logout);
router.post('/refresh',          protect, refresh);
router.get('/me',                protect, getMe);
router.post('/change-password',  protect, changePassword);
router.post('/send-otp',         sendOtp);
router.post('/verify-otp',       verifyOtp);

export default router;
