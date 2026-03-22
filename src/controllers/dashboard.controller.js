import { User, NgoApplication, NgoVerification, Report, Pet, Campaign, Donation, Post, Article } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Op } from 'sequelize';

function generateDefaultPassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// GET /api/dashboard/admin
export const adminDashboard = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    totalUsers, totalNGOs, pendingNGOs,
    totalReports, criticalReports, activeReports, resolvedToday,
    totalPets, adoptedPets, pendingPets,
    activeCampaigns, pendingCampaigns,
    totalDonationsResult,
    totalPosts, flaggedPosts,
    pendingArticles,
  ] = await Promise.all([
    User.count({ where: { role: 'user' } }),
    User.count({ where: { role: 'responder' } }),
    NgoApplication.count({ where: { approval_status: 'pending' } }),
    Report.count(),
    Report.count({ where: { urgency: 'urgent', status: { [Op.notIn]: ['rescued', 'closed'] } } }),
    Report.count({ where: { status: { [Op.notIn]: ['rescued', 'closed'] } } }),
    Report.count({ where: { status: { [Op.in]: ['rescued', 'closed'] }, updated_at: { [Op.gte]: today } } }),
    Pet.count(),
    Pet.count({ where: { status: 'adopted' } }),
    Pet.count({ where: { status: 'pending' } }),
    Campaign.count({ where: { status: 'active' } }),
    Campaign.count({ where: { status: 'draft' } }),
    Donation.sum('amount'),
    Post.count(),
    Post.count({ where: { is_flagged: true } }),
    Article.count({ where: { status: 'draft' } }),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers, totalNGOs, pendingNGOs,
      totalReports, criticalReports, activeReports, resolvedToday,
      totalPets, adoptedPets, pendingPets,
      activeCampaigns, pendingCampaigns,
      totalDonations: totalDonationsResult || 0,
      totalPosts, flaggedPosts,
      pendingArticles,
    },
  });
});

// GET /api/dashboard/responder
export const responderDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    assignedReports, resolvedThisMonth,
    activeCampaigns, campaignDonations,
    publishedArticles, pendingAdoptions,
  ] = await Promise.all([
    Report.count({ where: { assigned_to: userId, status: { [Op.notIn]: ['rescued', 'closed'] } } }),
    Report.count({ where: { assigned_to: userId, status: { [Op.in]: ['rescued', 'closed'] }, updated_at: { [Op.gte]: monthStart } } }),
    Campaign.count({ where: { created_by: userId, status: 'active' } }),
    Donation.sum('amount', {
      include: [{ model: Campaign, as: 'campaign', where: { created_by: userId }, attributes: [] }],
    }),
    Article.count({ where: { author_id: userId, status: 'published' } }),
    Pet.count({ where: { posted_by: userId, status: 'pending' } }),
  ]);

  res.json({
    success: true,
    stats: {
      assignedReports,
      resolvedThisMonth,
      activeCampaigns,
      totalDonationsRaised: campaignDonations || 0,
      publishedArticles,
      pendingAdoptions,
    },
  });
});

// PATCH /api/dashboard/approve-org/:id  (admin)
export const approveOrg = asyncHandler(async (req, res) => {
  const app = await NgoApplication.findByPk(req.params.id);
  if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

  const loginEmail = String(app.email || '').trim().toLowerCase();
  if (!loginEmail) {
    return res.status(400).json({ success: false, message: 'Application email is required to approve and create credentials' });
  }

  let verification = await NgoVerification.findOne({ where: { application_id: app.id } });
  let user = verification?.user_id ? await User.findByPk(verification.user_id) : null;

  if (!user) {
    user = await User.findOne({ where: { role: 'responder', email: loginEmail } });
  }

  let plainPassword = verification?.password_plain || '';
  if (!plainPassword) {
    plainPassword = generateDefaultPassword();
  }

  if (!user) {
    user = await User.create({
      name: app.contact_name,
      email: loginEmail,
      password: plainPassword,
      role: 'responder',
      phone: app.phone,
      ngo_application_id: app.id,
      is_active: true,
    });
  } else {
    await user.update({
      role: 'responder',
      ngo_application_id: app.id,
      is_active: true,
      password: plainPassword,
    });
  }

  if (verification) {
    await verification.update({
      user_id: user.id,
      username: loginEmail,
      password_plain: plainPassword,
    });
  } else {
    await NgoVerification.create({
      application_id: app.id,
      user_id: user.id,
      username: loginEmail,
      password_plain: plainPassword,
      email_sent: false,
    });
  }

  await app.update({ approval_status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() });

  res.json({
    success: true,
    message: 'Organisation approved and credentials generated',
    credentials: {
      login_email: loginEmail,
      password: plainPassword,
    },
  });
});

// PATCH /api/dashboard/reject-org/:id  (admin)
export const rejectOrg = asyncHandler(async (req, res) => {
  const app = await NgoApplication.findByPk(req.params.id);
  if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

  await app.update({
    approval_status: 'rejected',
    review_note: req.body.note || null,
    reviewed_by: req.user.id,
    reviewed_at: new Date(),
  });

  // Revoke responder portal access for accounts tied to this NGO application.
  await User.update(
    { is_active: false },
    {
      where: {
        role: 'responder',
        [Op.or]: [
          { ngo_application_id: app.id },
          { email: String(app.email || '').toLowerCase() },
        ],
      },
    }
  );

  res.json({ success: true, message: 'Organisation rejected' });
});
