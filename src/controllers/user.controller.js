import { User, NgoApplication } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: NgoApplication, as: 'ngo_application', attributes: ['org_name', 'org_type', 'org_address'] }],
  });
  res.json({ success: true, user });
});

// PUT /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'location', 'bio', 'avatar'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  await User.update(updates, { where: { id: req.user.id } });
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
  res.json({ success: true, user });
});

// GET /api/users  (admin)
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] },
    include: [{ model: NgoApplication, as: 'ngo_application', attributes: ['org_name', 'org_type'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, users });
});

// GET /api/users/:id  (admin)
export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['password'] },
    include: [{ model: NgoApplication, as: 'ngo_application' }],
  });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// PATCH /api/users/:id  (admin — update any user)
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const allowed = ['name', 'email', 'role', 'phone', 'location', 'bio', 'avatar', 'is_active'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  // Hash new password if provided
  if (req.body.password) {
    updates.password = req.body.password; // model's beforeUpdate hook will hash it
  }

  await user.update(updates);
  const updated = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
  res.json({ success: true, user: updated });
});

// PATCH /api/users/:id/deactivate  (admin)
export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot deactivate admin' });

  await user.update({ is_active: false });
  res.json({ success: true, message: 'User deactivated' });
});
