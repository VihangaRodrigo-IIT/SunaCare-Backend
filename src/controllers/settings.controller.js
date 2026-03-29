import { UserSettings } from '../models/UserSettings.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ALLOWED_KEYS = [
  'notif_email_reports', 'notif_email_users', 'notif_email_campaigns',
  'notif_push_reports',  'notif_push_urgent',  'notif_push_system',
  'coverage_radius_km',  'auto_assign',        'routing_priority',
];

function parseCoverageRadius(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed < 1) return 1;
  if (parsed > 500) return 500;
  return parsed;
}

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

  if (updates.coverage_radius_km !== undefined) {
    const parsedRadius = parseCoverageRadius(updates.coverage_radius_km);
    if (parsedRadius === undefined) {
      delete updates.coverage_radius_km;
    } else {
      updates.coverage_radius_km = parsedRadius;
    }
  }

  const [settings] = await UserSettings.findOrCreate({
    where:    { user_id: req.user.id },
    defaults: { user_id: req.user.id },
  });

  if (Object.keys(updates).length) await settings.update(updates);

  res.json({ success: true, settings });
});
