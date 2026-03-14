import express from 'express';
import { body } from 'express-validator';
import {
  getCampaigns, getCampaignById, createCampaign,
  updateCampaign, donateToCampaign, getMyDonations, reviewCampaign, resubmitCampaign, deleteCampaign,
} from '../controllers/campaign.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

const createValidation = [
  body('title').trim().notEmpty().withMessage('Campaign title is required'),
  body('goal_amount').notEmpty().withMessage('Goal amount is required')
    .isFloat({ min: 1 }).withMessage('Goal amount must be greater than 0'),
  body('campaign_for').trim().notEmpty().withMessage('Campaign purpose is required'),
  body('bank_name').trim().notEmpty().withMessage('Bank name is required'),
  body('bank_account_name').trim().notEmpty().withMessage('Bank account name is required'),
  body('bank_account_number').trim().notEmpty().withMessage('Bank account number is required'),
  body('bank_branch').trim().notEmpty().withMessage('Bank branch is required'),
];

const donateValidation = [
  body('amount').notEmpty().withMessage('Donation amount is required')
    .isFloat({ min: 1 }).withMessage('Donation amount must be at least 1'),
  body('bank_reference').trim().notEmpty().withMessage('Bank transfer reference is required'),
  body('receipt_url').trim().notEmpty().withMessage('Receipt proof is required'),
];

// NOTE: /my/donations must be defined before /:id so it is not treated as an ID
router.get('/my/donations',     protect,                                    getMyDonations);

router.get('/',                 optionalProtect,                            getCampaigns);
router.get('/:id',              optionalProtect,                            getCampaignById);
router.post('/',                protect, authorize('responder'), createValidation, validate, createCampaign);
router.put('/:id',              protect, authorize('responder'),            updateCampaign);
router.delete('/:id',           protect, authorize('responder'),            deleteCampaign);
router.patch('/:id/resubmit',   protect, authorize('responder'),            resubmitCampaign);
router.patch('/:id/review',     protect, authorize('admin'),                reviewCampaign);
router.post('/:id/donate',      protect, donateValidation, validate,        donateToCampaign);

export default router;