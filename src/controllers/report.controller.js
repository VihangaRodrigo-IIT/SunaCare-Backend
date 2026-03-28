import { Op } from 'sequelize';
import { Post, Report, User } from '../models/index.js';
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

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function isLostPetIssue(issue) {
  const normalized = normalizeLower(issue);
  return normalized.includes('lost') || normalized.includes('missing');
}

function getReportTrackingNumber(report) {
  const explicit = normalizeString(report?.report_number);
  if (explicit) return explicit;
  const id = Number(report?.id || 0);
  return id > 0 ? `RPT-${String(id).padStart(5, '0')}` : 'RPT-UNKNOWN';
}

function buildAutoCommunityPostBody(report, postType) {
  const tracking = getReportTrackingNumber(report);
  const issue = normalizeString(report?.issue) || 'Animal case update';
  const description = normalizeString(report?.description);
  const address = normalizeString(report?.address || report?.landmark || 'Location unavailable');
  const urgency = normalizeLower(report?.urgency || 'medium');

  const headline = postType === 'lost_pet'
    ? `Lost pet alert (${tracking})`
    : `Urgent rescue update (${tracking})`;

  const lines = [
    headline,
    `Issue: ${issue}`,
    `Location: ${address}`,
    `Urgency: ${urgency}`,
  ];

  if (description) lines.push('', description);
  return lines.join('\n');
}

async function createAutoCommunityPostFromReport({ report, authorId, postType }) {
  if (!authorId) return;

  const tracking = getReportTrackingNumber(report);
  const title = postType === 'lost_pet'
    ? `Lost Pet Alert • ${tracking}`
    : `Urgent Rescue Update • ${tracking}`;

  const existing = await Post.findOne({ where: { title, post_type: postType } });
  if (existing) return;

  const body = buildAutoCommunityPostBody(report, postType);
  const imageUrl = normalizeString(report?.media_url);
  const explicitImageUrls = Array.isArray(report?.media_urls)
    ? report.media_urls.map((value) => normalizeString(value)).filter(Boolean)
    : [];
  const mergedImageUrls = Array.from(new Set([imageUrl, ...explicitImageUrls].filter(Boolean)));

  await Post.create({
    title,
    body,
    image_url: mergedImageUrls[0] || null,
    image_urls: mergedImageUrls.length ? JSON.stringify(mergedImageUrls) : null,
    post_type: postType,
    author_id: authorId,
  });
}

function getUploadedReportMediaUrls(req, body) {
  const uploadedFromFiles = Array.isArray(req.files)
    ? req.files
        .map((file) => (file?.filename ? `/uploads/reports/${file.filename}` : ''))
        .filter(Boolean)
    : [];

  const bodyMediaUrls = Array.isArray(body?.media_urls)
    ? body.media_urls.map((value) => normalizeString(value)).filter(Boolean)
    : [];

  const singleBodyMediaUrl = normalizeString(body?.media_url);
  if (singleBodyMediaUrl) bodyMediaUrls.push(singleBodyMediaUrl);

  return Array.from(new Set([...uploadedFromFiles, ...bodyMediaUrls]));
}

function buildReportPayload(body, user, req) {
  const mediaUrls = getUploadedReportMediaUrls(req, body);
  const imageUrl = mediaUrls[0] || null;

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
    media_urls: mediaUrls,
  };
}

function isWithinSriLankaBounds(lat, lng) {
  return lat >= 5.75 && lat <= 10.05 && lng >= 79.45 && lng <= 82.15;
}

function validateReportCreatePayload(payload) {
  if (!Array.isArray(payload.media_urls) || payload.media_urls.length < 1) {
    return 'Please upload at least one image before submitting the report.';
  }

  const lat = Number(payload.lat);
  const lng = Number(payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'A valid location is required.';
  }
  if (!isWithinSriLankaBounds(lat, lng)) {
    return 'Location must be inside Sri Lanka.';
  }

  return null;
}

export const createGuestReport = asyncHandler(async (req, res) => {
  const payload = buildReportPayload(req.body, null, req);
  const validationError = validateReportCreatePayload(payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const reportPayload = { ...payload };
  delete reportPayload.media_urls;
  if (isLostPetIssue(payload.issue)) {
    reportPayload.show_on_user_map = true;
    reportPayload.map_published_at = new Date();
    reportPayload.map_published_by = null;
  }

  const report = await Report.create(reportPayload);

  const padded = String(report.id).padStart(5, '0');
  await report.update({ report_number: `RPT-${padded}` });

  res.status(201).json({
    success: true,
    message: 'Report submitted successfully',
    report: { id: report.id, report_number: report.report_number, status: report.status },
  });
});

export const createReport = asyncHandler(async (req, res) => {
  const payload = buildReportPayload(req.body, req.user, req);
  const validationError = validateReportCreatePayload(payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const { media_urls: mediaUrls, ...reportPayload } = payload;
  const lostPetFlow = isLostPetIssue(payload.issue);

  if (lostPetFlow) {
    reportPayload.show_on_user_map = true;
    reportPayload.map_published_at = new Date();
    reportPayload.map_published_by = req.user?.id || null;
  }

  const report = await Report.create(reportPayload);

  const padded = String(report.id).padStart(5, '0');
  await report.update({ report_number: `RPT-${padded}` });

  if (lostPetFlow) {
    await createAutoCommunityPostFromReport({
      report: { ...report.toJSON(), media_urls: mediaUrls },
      authorId: req.user?.id || report.created_by,
      postType: 'lost_pet',
    });
  }

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
    issue: report.issue,
    category: report.category,
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
  const wasShown = Boolean(report.show_on_user_map);
  await report.update({
    show_on_user_map: shouldShow,
    map_published_by: shouldShow ? req.user.id : null,
    map_published_at: shouldShow ? new Date() : null,
  });

  if (shouldShow && !wasShown) {
    const postType = isLostPetIssue(report.issue) ? 'lost_pet' : 'urgent_rescue_update';
    await createAutoCommunityPostFromReport({
      report,
      authorId: req.user.id,
      postType,
    });
  }

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

  if (req.user.role === 'responder' && report.assigned_to && report.assigned_to !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only remove false-report notices for reports assigned to your organization',
    });
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
