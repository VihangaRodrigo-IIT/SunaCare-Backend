import { Campaign, Donation, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { sequelize } from '../config/database.js';

const DONATION_BASE_ATTRS = ['id', 'campaign_id', 'donor_id', 'amount', 'message', 'is_anonymous', 'created_at', 'updated_at'];
const DONATION_EXTRA_ATTRS = ['payment_method', 'donor_name', 'bank_reference', 'receipt_url', 'receipt_name'];
let cachedDonationAttrs = null;
let cachedCampaignCols = null;

async function getCampaignCols() {
  if (cachedCampaignCols) return cachedCampaignCols;
  try {
    const [rows] = await sequelize.query('SHOW COLUMNS FROM campaigns');
    cachedCampaignCols = new Set(rows.map((r) => r.Field));
  } catch {
    cachedCampaignCols = new Set(['id', 'status', 'created_by']);
  }
  return cachedCampaignCols;
}

async function getDonationAttrs() {
  if (cachedDonationAttrs) return cachedDonationAttrs;
  try {
    const [rows] = await sequelize.query('SHOW COLUMNS FROM donations');
    const existing = new Set(rows.map((r) => r.Field));
    cachedDonationAttrs = [...DONATION_BASE_ATTRS, ...DONATION_EXTRA_ATTRS.filter((k) => existing.has(k))];
  } catch {
    cachedDonationAttrs = DONATION_BASE_ATTRS;
  }
  return cachedDonationAttrs;
}

function sanitizeByAttrs(payload, attrs) {
  const allowed = new Set(attrs);
  return Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.has(k)));
}

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @access  Public
export const getCampaigns = asyncHandler(async (req, res) => {
  const where = { status: 'active' };
  const campaignCols = await getCampaignCols();
  const donationAttrs = await getDonationAttrs();

  // Public visibility: only admin-approved active campaigns.
  if (campaignCols.has('approval_status')) {
    where.approval_status = 'approved';
  }

  // Admins can see all campaigns.
  if (req.user && req.user.role === 'admin') {
    delete where.status;
    if (campaignCols.has('approval_status')) delete where.approval_status;
    if (req.query.status) where.status = String(req.query.status).toLowerCase();
    if (campaignCols.has('approval_status') && req.query.approval_status) {
      where.approval_status = String(req.query.approval_status).toLowerCase();
    }
  }

  // Responders/NGOs: only own campaigns, all statuses.
  if (req.user && req.user.role === 'responder') {
    delete where.status;
    if (campaignCols.has('approval_status')) delete where.approval_status;
    where.created_by = req.user.id;
    if (req.query.status) where.status = String(req.query.status).toLowerCase();
    if (campaignCols.has('approval_status') && req.query.approval_status) {
      where.approval_status = String(req.query.approval_status).toLowerCase();
    }
  }

  const campaigns = await Campaign.findAll({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'org_name', 'avatar'] },
    ],
    order: [['created_at', 'DESC']],
  });

  const campaignIds = campaigns.map(c => c.id);
  const donationRows = campaignIds.length
    ? await Donation.findAll({
        where: { campaign_id: campaignIds },
        attributes: donationAttrs,
        include: [
          { model: User, as: 'donor', attributes: ['id', 'name'] },
        ],
        order: [['created_at', 'DESC']],
      })
    : [];

  const donationsByCampaign = {};
  for (const donation of donationRows) {
    const d = donation.toJSON();
    if (!donationsByCampaign[d.campaign_id]) {
      donationsByCampaign[d.campaign_id] = { rows: [], total: 0 };
    }
    donationsByCampaign[d.campaign_id].rows.push(d);
    donationsByCampaign[d.campaign_id].total += Number(d.amount || 0);
  }

  // Attach computed fields
  const result = campaigns.map((c) => {
    const obj = c.toJSON();
    const bucket = donationsByCampaign[obj.id] || { rows: [], total: 0 };
    obj.raised = Number(bucket.total.toFixed(2));
    obj.donation_count = bucket.rows.length;
    obj.recent_donations = bucket.rows.slice(0, 5).map((d) => ({
      ...d,
      donor_name: d.is_anonymous ? 'Anonymous' : (d.donor_name || d.donor?.name || 'Anonymous'),
    }));
    return obj;
  });

  res.status(200).json({ success: true, count: result.length, data: { campaigns: result } });
});

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Public
export const getCampaignById = asyncHandler(async (req, res) => {
  const donationAttrs = await getDonationAttrs();
  const campaign = await Campaign.findByPk(req.params.id, {
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'org_name', 'avatar'] },
      {
        model: Donation,
        as: 'donations',
        attributes: donationAttrs,
        include: [
          { model: User, as: 'donor', attributes: ['id', 'name'] },
        ],
      },
    ],
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const obj = campaign.toJSON();
  const donations = obj.donations || [];
  const totalRaised = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  obj.raised = Number(totalRaised.toFixed(2));
  obj.donation_count = donations.length;
  obj.recent_donations = (obj.donations || []).map((d) => ({
    ...d,
    donor_name: d.is_anonymous ? 'Anonymous' : (d.donor_name || d.donor?.name || 'Anonymous'),
  }));

  res.status(200).json({ success: true, data: { campaign: obj } });
});

// @desc    Create campaign
// @route   POST /api/campaigns
// @access  Private/Responder+
export const createCampaign = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    campaign_for,
    category,
    image,
    goal_amount,
    end_date,
    bank_name,
    bank_account_name,
    bank_account_number,
    bank_branch,
  } = req.body;
  const campaignCols = await getCampaignCols();

  const payload = {
    title,
    description,
    category,
    image,
    goal_amount,
    end_date,
    status: 'draft',
    created_by: req.user.id,
  };

  if (campaignCols.has('campaign_for')) payload.campaign_for = campaign_for || null;
  if (campaignCols.has('bank_name')) payload.bank_name = bank_name || null;
  if (campaignCols.has('bank_account_name')) payload.bank_account_name = bank_account_name || null;
  if (campaignCols.has('bank_account_number')) payload.bank_account_number = bank_account_number || null;
  if (campaignCols.has('bank_branch')) payload.bank_branch = bank_branch || null;

  if (campaignCols.has('approval_status')) payload.approval_status = 'pending';
  if (campaignCols.has('submitted_at')) payload.submitted_at = new Date();

  const campaign = await Campaign.create(payload);

  logger.info(`New campaign created: "${campaign.title}" by user ${req.user.id}`);

  res.status(201).json({ success: true, data: { campaign } });
});

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private/Responder+
export const updateCampaign = asyncHandler(async (req, res) => {
  const campaignCols = await getCampaignCols();
  const campaign = await Campaign.findByPk(req.params.id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to update this campaign' });
  }

  // Prevent responders from directly changing approval workflow fields.
  const payload = { ...req.body };
  if (req.user.role !== 'admin') {
    delete payload.approval_status;
    delete payload.review_note;
    delete payload.reviewed_at;
    delete payload.reviewed_by;
  }

  // Backward compatibility if DB has not migrated yet.
  if (!campaignCols.has('approval_status')) delete payload.approval_status;
  if (!campaignCols.has('review_note')) delete payload.review_note;
  if (!campaignCols.has('reviewed_at')) delete payload.reviewed_at;
  if (!campaignCols.has('reviewed_by')) delete payload.reviewed_by;
  if (!campaignCols.has('submitted_at')) delete payload.submitted_at;
  if (!campaignCols.has('campaign_for')) delete payload.campaign_for;
  if (!campaignCols.has('bank_name')) delete payload.bank_name;
  if (!campaignCols.has('bank_account_name')) delete payload.bank_account_name;
  if (!campaignCols.has('bank_account_number')) delete payload.bank_account_number;
  if (!campaignCols.has('bank_branch')) delete payload.bank_branch;

  await campaign.update(payload);

  res.status(200).json({ success: true, data: { campaign } });
});

// @desc    Review a campaign (approve / keep pending / discard)
// @route   PATCH /api/campaigns/:id/review
// @access  Private/Admin
export const reviewCampaign = asyncHandler(async (req, res) => {
  const campaignCols = await getCampaignCols();
  const campaign = await Campaign.findByPk(req.params.id);
  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const action = String(req.body.action || '').toLowerCase();
  const note = req.body.note || null;

  if (!['approve', 'pending', 'discard'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action. Use approve, pending, or discard.' });
  }

  const payload = {};

  if (action === 'approve') {
    payload.status = 'active';
    if (campaignCols.has('approval_status')) payload.approval_status = 'approved';
  }
  if (action === 'pending') {
    payload.status = 'draft';
    if (campaignCols.has('approval_status')) payload.approval_status = 'pending';
  }
  if (action === 'discard') {
    payload.status = 'closed';
    if (campaignCols.has('approval_status')) payload.approval_status = 'discarded';
  }

  if (campaignCols.has('review_note')) payload.review_note = note;
  if (campaignCols.has('reviewed_at')) payload.reviewed_at = new Date();
  if (campaignCols.has('reviewed_by')) payload.reviewed_by = req.user.id;

  await campaign.update(payload);

  const refreshed = await Campaign.findByPk(campaign.id, {
    include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'org_name', 'email'] }],
  });

  res.status(200).json({ success: true, data: { campaign: refreshed } });
});

// @desc    Resubmit a rejected campaign for admin review
// @route   PATCH /api/campaigns/:id/resubmit
// @access  Private/Responder
export const resubmitCampaign = asyncHandler(async (req, res) => {
  const campaignCols = await getCampaignCols();
  const campaign = await Campaign.findByPk(req.params.id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to resubmit this campaign' });
  }

  if (!campaignCols.has('approval_status')) {
    return res.status(400).json({ success: false, message: 'Approval workflow is not enabled for campaigns' });
  }

  if (campaign.approval_status !== 'discarded') {
    return res.status(400).json({ success: false, message: 'Only rejected campaigns can be resubmitted' });
  }

  const payload = {
    status: 'draft',
    approval_status: 'pending',
    ...(campaignCols.has('review_note') ? { review_note: null } : {}),
    ...(campaignCols.has('reviewed_at') ? { reviewed_at: null } : {}),
    ...(campaignCols.has('reviewed_by') ? { reviewed_by: null } : {}),
    ...(campaignCols.has('submitted_at') ? { submitted_at: new Date() } : {}),
  };

  await campaign.update(payload);

  res.status(200).json({ success: true, message: 'Campaign resubmitted for admin review', data: { campaign } });
});

// @desc    Donate to a campaign
// @route   POST /api/campaigns/:id/donate
// @access  Private
export const donateToCampaign = asyncHandler(async (req, res) => {
  const { amount, message, isAnonymous, donor_name, bank_reference, receipt_url, receipt_name } = req.body;
  const donationAttrs = await getDonationAttrs();

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Please provide a valid donation amount' });
  }

  if (!receipt_url) {
    return res.status(400).json({ success: false, message: 'Receipt proof is required for bank transfer donations' });
  }

  if (!bank_reference) {
    return res.status(400).json({ success: false, message: 'Bank transfer reference is required' });
  }

  const campaign = await Campaign.findByPk(req.params.id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.status !== 'active') {
    return res.status(400).json({ success: false, message: 'This campaign is no longer accepting donations' });
  }

  const donationPayload = sanitizeByAttrs({
    campaign_id: campaign.id,
    donor_id: req.user.id,
    amount,
    message: message || null,
    is_anonymous: isAnonymous || false,
    payment_method: 'bank_transfer',
    donor_name: donor_name || req.user.name || null,
    bank_reference,
    receipt_url,
    receipt_name: receipt_name || null,
  }, donationAttrs);

  const donation = await Donation.create(donationPayload);

  // Update campaign raised amount
  campaign.raised = parseFloat(campaign.raised) + parseFloat(amount);
  await campaign.save();

  res.status(201).json({ success: true, data: { donation } });
});

// @desc    Get my donations
// @route   GET /api/campaigns/my/donations
// @access  Private
export const getMyDonations = asyncHandler(async (req, res) => {
  const donationAttrs = await getDonationAttrs();

  const donations = await Donation.findAll({
    attributes: donationAttrs,
    where: { donor_id: req.user.id },
    include: [
      { model: Campaign, as: 'campaign', attributes: ['id', 'title', 'image', 'status', 'goal_amount', 'raised'] },
    ],
    order: [['created_at', 'DESC']],
  });

  res.status(200).json({ success: true, count: donations.length, data: { donations } });
});

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private/Responder owner or Admin
export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findByPk(req.params.id);

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this campaign' });
  }

  await campaign.destroy();

  res.status(200).json({ success: true, message: 'Campaign deleted successfully' });
});