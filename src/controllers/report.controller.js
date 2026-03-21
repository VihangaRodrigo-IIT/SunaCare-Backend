import { Op } from 'sequelize';
import { Report, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sequelize } from '../config/database.js';

const REPORTER_ATTRS = ['id', 'name', 'role', 'avatar'];
const ASSIGNEE_ATTRS = ['id', 'name', 'role', 'avatar'];

let cachedReportCols = null;

async function getReportColumns() {
  if (cachedReportCols) return cachedReportCols;
  const [rows] = await sequelize.query('SHOW COLUMNS FROM reports');
  cachedReportCols = new Set(rows.map((row) => row.Field));
  return cachedReportCols;
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function buildReportPayload(body, user, file) {
  const imageUrl = file ? `/uploads/reports/${file.filename}` : body.media_url || null;

  return {
    category: body.category || 'other',
    issue: body.issue,
    description: body.description,
    tags: parseTags(body.tags),
    urgency: body.urgency || 'medium',
    animal_count: body.animal_count || 1,
    lat: body.lat,
    lng: body.lng,
    address: body.address,
    landmark: body.landmark,
    media_url: imageUrl,
    contact_name: body.contact_name,
    contact_phone: body.contact_phone,
    contact_method: body.contact_method,
    contact_value: body.contact_value,
    wants_follow_up: parseBoolean(body.wants_follow_up, false),
    share_with_ngo: parseBoolean(body.share_with_ngo, true),
    consent: parseBoolean(body.consent, false),
    created_by: user?.id || null,
  };
}

export const createGuestReport = asyncHandler(async (req, res) => {
  const report = await Report.create(buildReportPayload(req.body, null, req.file));

  const padded = String(report.id).padStart(5, '0');
  await report.update({ report_number: `RPT-${padded}` });

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully',
    report: { id: report.id, report_number: report.report_number, status: report.status },
  });
});

export const createReport = asyncHandler(async (req, res) => {
  const report = await Report.create(buildReportPayload(req.body, req.user, req.file));

  const padded = String(report.id).padStart(5, '0');
  await report.update({ report_number: `RPT-${padded}` });

  res.status(201).json({ success: true, report: report.toJSON() });
});

export const listReports = asyncHandler(async (req, res) => {
  const where = {};

  if (req.query.flagged === '1') where.is_flagged = true;
  if (req.query.status) where.status = req.query.status;
  if (req.query.urgency) where.urgency = req.query.urgency;
  if (req.query.category) where.category = req.query.category;

  if (req.user.role === 'responder') {
    where[Op.or] = [{ assigned_to: req.user.id }, { assigned_to: null }];
  } else if (req.user.role === 'user') {
    where.created_by = req.user.id;
  }

  const reports = await Report.findAll({
    where,
    include: [
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
      { model: User, as: 'assignee', attributes: ASSIGNEE_ATTRS, required: false },
    ],
    order: [['created_at', 'DESC']],
  });

  res.json({ success: true, reports });
});

export const listMapReports = asyncHandler(async (req, res) => {
  const cols = await getReportColumns();
  const where = {};

  if (req.user.role === 'responder') {
    where[Op.or] = [{ assigned_to: req.user.id }, { assigned_to: null }];
  }

  const attributes = [
    'id',
    'report_number',
    'issue',
    'description',
    'urgency',
    'status',
    'lat',
    'lng',
    'address',
    'landmark',
    'createdAt',
  ];
  if (cols.has('show_on_user_map')) attributes.push('show_on_user_map');

  const reports = await Report.findAll({
    where,
    attributes,
    order: [['created_at', 'DESC']],
  });

  const mapped = reports
    .filter((report) => report.lat !== null && report.lng !== null)
    .map((report) => ({
      id: report.id,
      case_number: report.report_number || `RPT-${String(report.id).padStart(5, '0')}`,
      title: report.issue || 'Rescue Report',
      description: report.description,
      urgency: report.urgency,
      status: report.status,
      latitude: Number(report.lat),
      longitude: Number(report.lng),
      location_text: report.address || report.landmark || '',
      show_on_user_map: cols.has('show_on_user_map') ? Boolean(report.show_on_user_map) : false,
      created_at: report.createdAt || report.created_at,
    }));

  res.json({ success: true, data: { reports: mapped } });
});

export const listPublicMapReports = asyncHandler(async (_req, res) => {
  const cols = await getReportColumns();
  if (!cols.has('show_on_user_map')) {
    return res.json({ success: true, data: { reports: [] } });
  }

  const reports = await Report.findAll({
    where: {
      show_on_user_map: true,
      status: { [Op.notIn]: ['rescued', 'closed'] },
      lat: { [Op.ne]: null },
      lng: { [Op.ne]: null },
    },
    order: [['map_published_at', 'DESC']],
    limit: 300,
  });

  const mapped = reports.map((report) => ({
    id: report.id,
    case_number: report.report_number || `RPT-${String(report.id).padStart(5, '0')}`,
    title: report.issue || 'Rescue Report',
    description: report.description,
    urgency: report.urgency,
    status: report.status,
    lat: Number(report.lat),
    lng: Number(report.lng),
    address: report.address,
    landmark: report.landmark,
    media_url: cols.has('hide_media_from_public') && report.hide_media_from_public ? null : report.media_url,
    hide_media_from_public: cols.has('hide_media_from_public') ? Boolean(report.hide_media_from_public) : false,
    published_at: report.map_published_at,
  }));

  res.json({ success: true, data: { reports: mapped } });
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findByPk(req.params.id, {
    include: [
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
      { model: User, as: 'assignee', attributes: ASSIGNEE_ATTRS, required: false },
    ],
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  res.json({ success: true, report });
});

export const updateReportMapVisibility = asyncHandler(async (req, res) => {
  const cols = await getReportColumns();
  if (!cols.has('show_on_user_map')) {
    return res.status(400).json({
      success: false,
      message: 'Database migration required for map visibility. Apply migrations/006_add_map_visibility_fields.sql and restart backend.',
    });
  }

  const report = await Report.findByPk(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  if (req.user.role === 'responder' && report.assigned_to && report.assigned_to !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only publish reports assigned to your organization',
    });
  }

  const shouldShow = req.body.show_on_user_map === true;
  await report.update({
    show_on_user_map: shouldShow,
    map_published_by: shouldShow ? req.user.id : null,
    map_published_at: shouldShow ? new Date() : null,
  });

  res.json({
    success: true,
    message: shouldShow ? 'Report is now visible on the public live map' : 'Report was removed from public live map',
    data: {
      id: report.id,
      show_on_user_map: Boolean(report.show_on_user_map),
      map_published_at: report.map_published_at,
    },
  });
});

export const updateReportMediaVisibility = asyncHandler(async (req, res) => {
  const cols = await getReportColumns();
  if (!cols.has('hide_media_from_public')) {
    return res.status(400).json({
      success: false,
      message: 'Database migration required for media visibility controls. Apply migrations/012_add_report_media_visibility.sql and restart backend.',
    });
  }

  const report = await Report.findByPk(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  if (req.user.role === 'responder' && report.assigned_to && report.assigned_to !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only update media visibility for reports assigned to your organization',
    });
  }

  const hideMedia = req.body.hide_media_from_public === true;
  await report.update({ hide_media_from_public: hideMedia });

  res.json({
    success: true,
    message: hideMedia ? 'Report image is now hidden from public live map' : 'Report image is now visible on public live map',
    data: {
      id: report.id,
      hide_media_from_public: Boolean(report.hide_media_from_public),
    },
  });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const inputStatus = String(req.body?.status || '').trim().toLowerCase();
  const statusAliases = {
    pending: 'pending',
    new: 'pending',
    assigned: 'pending',
    proceed: 'in-treatment',
    processing: 'in-treatment',
    'in-progress': 'in-treatment',
    in_progress: 'in-treatment',
    'in-treatment': 'in-treatment',
    resolved: 'rescued',
    rescued: 'rescued',
    closed: 'closed',
  };
  const status = statusAliases[inputStatus];

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Allowed values: pending, proceed/in-treatment, rescued/resolved, closed.',
    });
  }

  const report = await Report.findByPk(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await report.update({ status });
  res.json({ success: true, report });
});

export const assignReport = asyncHandler(async (req, res) => {
  const report = await Report.findByPk(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await report.update({ assigned_to: req.user.id });
  res.json({ success: true, report });
});

export const flagReport = asyncHandler(async (req, res) => {
  const report = await Report.findByPk(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await report.update({ is_flagged: true, flag_count: (report.flag_count || 0) + 1 });
  res.json({ success: true, message: 'Report flagged' });
});

export const unflagReport = asyncHandler(async (req, res) => {
  const report = await Report.findByPk(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await report.update({ is_flagged: false, flag_count: 0 });
  res.json({ success: true, message: 'Report unflagged' });
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findByPk(req.params.id);

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await report.destroy();
  res.json({ success: true, message: 'Report deleted' });
});
