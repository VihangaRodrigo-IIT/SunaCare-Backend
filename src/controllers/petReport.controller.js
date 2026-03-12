import { PetReport, Pet, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sequelize } from '../config/database.js';

const PET_ATTR_CANDIDATES = [
  'id', 'name', 'species', 'breed', 'age_years', 'age_months', 'gender', 'size', 'color',
  'description', 'health_notes', 'ideal_home', 'location', 'status', 'urgent',
  'vaccinated', 'neutered', 'microchipped', 'dewormed',
  'image_url', 'contact_name', 'contact_phone', 'contact_email', 'posted_by', 'created_at', 'updated_at',
];
const PET_MIN_ATTRS = ['id', 'name', 'species', 'status', 'posted_by'];
const USER_ATTRS     = ['id', 'name', 'email'];
const REPORTER_ATTRS = ['id', 'name', 'email'];
const PET_REPORT_ATTR_CANDIDATES = [
  'id', 'pet_id', 'reported_by', 'reason', 'affected_fields', 'details',
  'reporter_name', 'reporter_email', 'status', 'admin_note', 'resolved_at',
  'action_taken', 'pet_name_snapshot', 'created_at', 'updated_at',
];
const PET_REPORT_BASE_ATTRS = [
  'id', 'pet_id', 'reported_by', 'reason', 'affected_fields', 'details',
  'reporter_name', 'reporter_email', 'status', 'admin_note', 'resolved_at', 'created_at', 'updated_at',
];

let cachedPetAttrs = null;
let cachedPetReportCols = null;
let cachedPetReportAttrs = null;

async function getPetAttrs() {
  if (cachedPetAttrs) return cachedPetAttrs;
  try {
    const [rows] = await sequelize.query('SHOW COLUMNS FROM pets');
    const existing = new Set(rows.map((r) => r.Field));
    const selected = PET_ATTR_CANDIDATES.filter((c) => existing.has(c));
    const merged = Array.from(new Set([...PET_MIN_ATTRS.filter((c) => existing.has(c)), ...selected]));
    cachedPetAttrs = merged.length ? merged : PET_MIN_ATTRS;
  } catch {
    cachedPetAttrs = PET_MIN_ATTRS;
  }
  return cachedPetAttrs;
}

async function getPetReportCols() {
  if (cachedPetReportCols) return cachedPetReportCols;
  try {
    const [rows] = await sequelize.query('SHOW COLUMNS FROM pet_reports');
    cachedPetReportCols = new Set(rows.map((r) => r.Field));
  } catch {
    cachedPetReportCols = new Set(PET_REPORT_BASE_ATTRS);
  }
  return cachedPetReportCols;
}

async function getPetReportAttrs() {
  if (cachedPetReportAttrs) return cachedPetReportAttrs;
  const cols = await getPetReportCols();
  const attrs = PET_REPORT_ATTR_CANDIDATES.filter((c) => cols.has(c));
  cachedPetReportAttrs = attrs.length ? attrs : PET_REPORT_BASE_ATTRS;
  return cachedPetReportAttrs;
}

function filterPayloadByCols(payload, cols) {
  return Object.fromEntries(Object.entries(payload).filter(([k]) => cols.has(k)));
}

function inferActionTaken(report) {
  if (report.action_taken) return report.action_taken;

  // Dismissed reports map directly.
  if (report.status === 'dismissed') return 'dismiss';

  // Reviewed can mean delete or keep_pending.
  if (report.status === 'reviewed') {
    // Deleted listing commonly has no linked pet anymore.
    if (!report.pet || report.pet_id == null) return 'delete';
    // Keep pending leaves pet record and sets status to pending.
    if (report.pet.status === 'pending') return 'keep_pending';

    const note = (report.admin_note || '').toLowerCase();
    if (note.includes('removed') || note.includes('delete')) return 'delete';
    if (note.includes('review') || note.includes('pending')) return 'keep_pending';

    // Conservative fallback for reviewed records with pet still present.
    return 'keep_pending';
  }

  return null;
}

// POST /api/pet-reports  (optional auth)
export const createPetReport = asyncHandler(async (req, res) => {
  const { pet_id, reason, affected_fields, details, reporter_name, reporter_email } = req.body;

  if (!pet_id) return res.status(400).json({ success: false, message: 'pet_id is required' });
  if (!reason) return res.status(400).json({ success: false, message: 'reason is required' });

  const pet = await Pet.findByPk(pet_id);
  if (!pet) return res.status(404).json({ success: false, message: 'Pet listing not found' });

  const report = await PetReport.create({
    pet_id,
    reported_by:     req.user?.id    || null,
    reason,
    affected_fields: Array.isArray(affected_fields) ? affected_fields : [],
    details:         details         || null,
    reporter_name:   reporter_name   || req.user?.name  || null,
    reporter_email:  reporter_email  || req.user?.email || null,
  });

  res.status(201).json({ success: true, report: { id: report.id, status: report.status } });
});

// GET /api/pet-reports/grouped  (admin only)
// Returns pending reports grouped by pet, sorted by report count descending.
export const listGroupedPetReports = asyncHandler(async (req, res) => {
  const petAttrs = await getPetAttrs();
  const reportAttrs = await getPetReportAttrs();

  const allReports = await PetReport.findAll({
    attributes: reportAttrs,
    where: { status: 'pending' },
    include: [
      {
        model: Pet, as: 'pet',
        attributes: petAttrs,
        include: [{ model: User, as: 'poster', attributes: USER_ATTRS, required: false }],
        required: false,
      },
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
    ],
    order: [['created_at', 'DESC']],
  });

  const map = new Map();
  for (const report of allReports) {
    const key = report.pet_id ?? `orphan_${report.id}`;
    if (!map.has(key)) {
      map.set(key, {
        pet:           report.pet ?? null,
        pet_id:        report.pet_id ?? null,
        report_count:  0,
        latest_report: report.created_at,
        reports:       [],
      });
    }
    const group = map.get(key);
    group.report_count += 1;
    if (new Date(report.created_at) > new Date(group.latest_report)) {
      group.latest_report = report.created_at;
    }
    group.reports.push({
      id:              report.id,
      reason:          report.reason,
      affected_fields: report.affected_fields,
      details:         report.details,
      reporter_name:   report.reporter_name,
      reporter_email:  report.reporter_email,
      reporter:        report.reporter ?? null,
      created_at:      report.created_at,
    });
  }

  const grouped = Array.from(map.values())
    .sort((a, b) => b.report_count - a.report_count || new Date(b.latest_report) - new Date(a.latest_report));

  res.json({ success: true, grouped, total: grouped.length });
});

// GET /api/pet-reports  (admin only) � flat list, kept for compat
export const listPetReports = asyncHandler(async (req, res) => {
  const petAttrs = await getPetAttrs();
  const reportAttrs = await getPetReportAttrs();

  const where = {};
  if (req.query.status) where.status = req.query.status;

  const reports = await PetReport.findAll({
    attributes: reportAttrs,
    where,
    include: [
      {
        model: Pet, as: 'pet',
        attributes: petAttrs,
        include: [{ model: User, as: 'poster', attributes: USER_ATTRS, required: false }],
        required: false,
      },
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
    ],
    order: [['created_at', 'DESC']],
  });

  res.json({ success: true, reports });
});

// PATCH /api/pet-reports/pet/:petId/review  (admin only)
// body: { action: 'delete' | 'keep_pending' | 'dismiss', admin_note?: string }
export const reviewPetListingReports = asyncHandler(async (req, res) => {
  const { petId } = req.params;
  const { action, admin_note } = req.body;
  const reportCols = await getPetReportCols();

  const pet = await Pet.findByPk(petId);

  if (action === 'delete') {
    if (!pet) return res.status(404).json({ success: false, message: 'Pet listing not found or already deleted' });
    const payload = filterPayloadByCols({
      status: 'reviewed',
      admin_note: admin_note || 'Listing removed due to policy violation.',
      resolved_at: new Date(),
      action_taken: 'delete',
      pet_name_snapshot: pet.name,
    }, reportCols);
    await PetReport.update(
      payload,
      { where: { pet_id: petId, status: 'pending' } }
    );
    await pet.destroy();
  } else if (action === 'keep_pending') {
    if (!pet) return res.status(404).json({ success: false, message: 'Pet listing not found' });
    await pet.update({ status: 'pending' });
    const payload = filterPayloadByCols({
      status: 'reviewed',
      admin_note: admin_note || 'Listing placed under review.',
      resolved_at: new Date(),
      action_taken: 'keep_pending',
      pet_name_snapshot: pet.name,
    }, reportCols);
    await PetReport.update(
      payload,
      { where: { pet_id: petId, status: 'pending' } }
    );
  } else if (action === 'dismiss') {
    const payload = filterPayloadByCols({
      status: 'dismissed',
      admin_note: admin_note || null,
      resolved_at: new Date(),
      action_taken: 'dismiss',
      pet_name_snapshot: pet?.name || null,
    }, reportCols);
    await PetReport.update(
      payload,
      { where: { pet_id: petId, status: 'pending' } }
    );
  } else {
    return res.status(400).json({ success: false, message: 'Invalid action. Use "delete", "keep_pending", or "dismiss".' });
  }

  res.json({ success: true });
});

// GET /api/pet-reports/history  (admin only)
// Returns resolved/dismissed pet report groups, optionally filtered by action_taken.
// Grouped by resolved_at + pet combo so each admin action is one history entry.
export const listPetReportHistory = asyncHandler(async (req, res) => {
  const petAttrs = await getPetAttrs();
  const reportAttrs = await getPetReportAttrs();
  const reportCols = await getPetReportCols();

  const action = typeof req.query.action === 'string' ? req.query.action : '';

  const where = { status: ['reviewed', 'dismissed'] };
  const validActions = ['delete', 'keep_pending', 'dismiss'];
  const actionFilter = validActions.includes(action) ? action : '';

  if (reportCols.has('action_taken') && actionFilter) {
    where.action_taken = actionFilter;
  }

  let reports = [];
  try {
    reports = await PetReport.findAll({
      attributes: reportAttrs,
      where,
      include: [
        {
          model: Pet, as: 'pet',
          attributes: petAttrs,
          include: [{ model: User, as: 'poster', attributes: USER_ATTRS, required: false }],
          required: false,
        },
        { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
      ],
      order: [['resolved_at', 'DESC'], ['created_at', 'DESC']],
    });
  } catch (err) {
    // Graceful fallback when DB migration for history columns is not applied yet.
    return res.json({ success: true, history: [], total: 0, warning: 'History unavailable until DB migration is applied.' });
  }

  // Group by (resolved_at + pet key) — all reports for one admin action share the same resolved_at
  const map = new Map();
  for (const report of reports) {
    const resolvedAction = inferActionTaken(report);

    // If action_taken column is missing, apply action filter in-memory after inference.
    if (!reportCols.has('action_taken') && actionFilter && resolvedAction !== actionFilter) continue;

    // Key: combine pet identity + exact resolved timestamp → unique per admin action batch
    const petKey = report.pet_id ?? report.pet_name_snapshot ?? `r${report.id}`;
    const resolvedAt = report.resolved_at ? new Date(report.resolved_at).toISOString() : 'unknown';
    const key = `${petKey}_${resolvedAt}`;

    if (!map.has(key)) {
      map.set(key, {
        pet:               report.pet ?? null,
        pet_id:            report.pet_id ?? null,
        pet_name:          report.pet?.name || report.pet_name_snapshot || 'Deleted Listing',
        action_taken:      resolvedAction,
        admin_note:        report.admin_note,
        resolved_at:       report.resolved_at,
        report_count:      0,
        reports:           [],
      });
    }
    const grp = map.get(key);
    grp.report_count += 1;
    grp.reports.push({
      id:              report.id,
      reason:          report.reason,
      affected_fields: report.affected_fields,
      details:         report.details,
      reporter_name:   report.reporter_name,
      reporter_email:  report.reporter_email,
      reporter:        report.reporter ?? null,
      created_at:      report.created_at,
    });
  }

  const history = Array.from(map.values())
    .sort((a, b) => new Date(b.resolved_at ?? 0) - new Date(a.resolved_at ?? 0));

  res.json({ success: true, history, total: history.length });
});
