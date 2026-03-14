import { UserSettings } from '../models/UserSettings.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALLOWED_KEYS = [
  'notif_email_reports', 'notif_email_users', 'notif_email_campaigns',
  'notif_push_reports',  'notif_push_urgent',  'notif_push_system',
  'coverage_radius_km',  'auto_assign',        'routing_priority',
  'two_factor_enabled',
];

// GET /api/settings
// Returns the settings row for the current user.
// Creates one with defaults on first call (lazy init — no need for signup hooks).
export const getSettings = asyncHandler(async (req, res) => {
  const [settings] = await UserSettings.findOrCreate({
    where:    { user_id: req.user.id },
    defaults: { user_id: req.user.id },
  });
  res.json({ success: true, settings });
});

// PUT /api/settings
// Partial update — only fields present in the request body are changed.
export const updateSettings = asyncHandler(async (req, res) => {
  const updates = {};
  ALLOWED_KEYS.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  const [settings] = await UserSettings.findOrCreate({
    where:    { user_id: req.user.id },
    defaults: { user_id: req.user.id },
  });

  if (Object.keys(updates).length) await settings.update(updates);

  res.json({ success: true, settings });
});
