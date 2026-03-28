import { Op } from 'sequelize';
import { NgoApplication, NgoVerification, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sequelize } from '../config/database.js';

let cachedNgoCols = null;

async function getNgoColumns() {
  if (cachedNgoCols) return cachedNgoCols;
  const [rows] = await sequelize.query('SHOW COLUMNS FROM ngo_applications');
  cachedNgoCols = new Set(rows.map((r) => r.Field));
  return cachedNgoCols;
}

const ORG_TYPE_TO_DB = {
  ngo: 'ngo',
  'animal welfare': 'ngo',
  vet: 'vet',
  'vet clinic': 'vet',
  shelter: 'shelter',
  'animal shelter': 'shelter',
  rescue: 'rescue',
  'rescue organization': 'rescue',
  'wildlife conservation': 'rescue',
  other: 'ngo',
};

const ORG_TYPE_TO_LABEL = {
  ngo: 'Animal Welfare',
  vet: 'Vet Clinic',
  shelter: 'Animal Shelter',
  rescue: 'Rescue Organization',
};

function normalizeOrgTypeForDb(value) {
  if (!value) return 'ngo';
  const key = String(value).trim().toLowerCase();
  return ORG_TYPE_TO_DB[key] || 'ngo';
}

function orgTypeLabel(value) {
  const key = String(value || '').toLowerCase();
  return ORG_TYPE_TO_LABEL[key] || 'Animal Welfare';
}

function parseCoverageRadius(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 1) return 1;
  if (parsed > 500) return 500;
  return parsed;
}

function mapNgoForMapResponse(app) {
  const data = app.toJSON ? app.toJSON() : app;
  return {
    id: data.id,
    org_name: data.org_name,
    org_type: orgTypeLabel(data.org_type),
    org_type_key: data.org_type,
    org_address: data.org_address,
    org_description: data.org_description,
    website: data.website,
    phone: data.phone,
    email: data.email,
    coverage_radius_km: data.coverage_radius_km,
    approval_status: data.approval_status,
    map_pinned: !!data.map_pinned,
    show_on_user_map: data.show_on_user_map !== false,
    latitude: data.latitude,
    longitude: data.longitude,
    created_at: data.created_at || data.createdAt,
  };
}

async function findResponderApplication(user) {
  if (!user) return null;

  if (user.ngo_application_id) {
    const byId = await NgoApplication.findByPk(user.ngo_application_id);
    if (byId) return byId;
  }

  if (!user.email) return null;
  return NgoApplication.findOne({
    where: { email: String(user.email).toLowerCase() },
    order: [['created_at', 'DESC']],
  });
}

// POST /api/ngos/applications  (public — orgs apply for access)
export const submitApplication = asyncHandler(async (req, res) => {
  const {
    contactName, orgName, email, phone, orgType,
    registrationNo, documentUrl, orgAddress, coverageRadiusKm, orgDescription,
  } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const uploadedDocumentUrl = req.file?.filename ? `/uploads/ngo-docs/${req.file.filename}` : '';
  const finalDocumentUrl = String(documentUrl || '').trim() || uploadedDocumentUrl;

  if (!contactName || !orgName || !normalizedEmail || !registrationNo || !finalDocumentUrl) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
  }

  // Prevent duplicate applications from same email
  const existing = await NgoApplication.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(400).json({ success: false, message: 'An application with this email already exists' });
  }

  const application = await NgoApplication.create({
    contact_name: contactName,
    org_name: orgName,
    email: normalizedEmail,
    phone,
    org_type: orgType || 'ngo',
    registration_no: registrationNo,
    document_url: finalDocumentUrl,
    org_address: orgAddress,
    coverage_radius_km: parseCoverageRadius(coverageRadiusKm),
    org_description: orgDescription,
  });

  res.status(201).json({
    success: true,
    message: 'Application submitted. After admin approval, credentials will be shared with your organization manually.',
    application: { id: application.id, org_name: application.org_name, approval_status: application.approval_status },
  });
});

// GET /api/ngos/applications  (admin)
export const listApplications = asyncHandler(async (req, res) => {
  const applications = await NgoApplication.findAll({
    include: [
      { model: NgoVerification, as: 'verification', attributes: ['username', 'password_plain', 'email_sent', 'created_at'] },
      { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
    ],
    order: [['created_at', 'DESC']],
  });

  // Shape response to match frontend NgoApplication interface
  const data = applications.map(app => ({
    ...app.toJSON(),
    name: app.contact_name,   // frontend uses 'name' for contact person
    credentials: app.verification || null,
  }));

  res.json({ success: true, applications: data });
});

// GET /api/ngos/applications/:id  (admin)
export const getApplication = asyncHandler(async (req, res) => {
  const application = await NgoApplication.findByPk(req.params.id, {
    include: [
      { model: NgoVerification, as: 'verification' },
      { model: User, as: 'reviewer', attributes: ['id', 'name'] },
    ],
  });
  if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

  res.json({ success: true, application: { ...application.toJSON(), name: application.contact_name, credentials: application.verification || null } });
});

// POST /api/ngos/:id/credentials  (admin — approve + create login)
export const createCredentials = asyncHandler(async (req, res) => {
  const { password, send_email = true } = req.body;

  const application = await NgoApplication.findByPk(req.params.id);
  if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

  // Login credential is always email for NGO/responder accounts.
  const loginEmail = String(application.email || '').trim().toLowerCase();
  if (!loginEmail) {
    return res.status(400).json({ success: false, message: 'Application email is required to generate credentials' });
  }

  // Check if credentials already exist (update flow)
  const existing = await NgoVerification.findOne({ where: { application_id: application.id } });

  if (existing) {
    // Update flow: update credentials on existing user
    const user = await User.findByPk(existing.user_id);
    if (user) await user.update({ password });

    await existing.update({
      username: loginEmail,
      password_plain: password,
      email_sent: send_email,
    });

    return res.json({
      success: true,
      message: 'Credentials updated. Share these credentials manually with the NGO. NGO must sign in using the organization email address.',
      login_email: loginEmail,
    });
  }

  // Create new responder user account
  const user = await User.create({
    name: application.contact_name,
    email: application.email,
    password,
    role: 'responder',
    phone: application.phone,
    ngo_application_id: application.id,
  });

  // Store verification record
  await NgoVerification.create({
    application_id: application.id,
    user_id: user.id,
    username: loginEmail,
    password_plain: password,
    email_sent: send_email,
  });

  // Mark application as approved
  await application.update({
    approval_status: 'approved',
    reviewed_by: req.user.id,
    reviewed_at: new Date(),
  });

  // Email provider integration is not configured yet.
  // Credentials are returned in the API response and stored in verification row.

  res.status(201).json({
    success: true,
    message: 'Credentials created and NGO approved. Share these credentials manually with the NGO. NGO must sign in using the organization email address.',
    login_email: loginEmail,
  });
});

// POST /api/ngos/:id/credentials/resend  (admin — resend login email)
export const resendCredentials = asyncHandler(async (req, res) => {
  const application = await NgoApplication.findByPk(req.params.id);
  if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

  const verification = await NgoVerification.findOne({ where: { application_id: application.id } });
  if (!verification) {
    return res.status(404).json({ success: false, message: 'No credentials found for this application. Generate credentials first.' });
  }

  // Email provider integration is not configured yet.
  // For now we only mark this record as resent.
  await verification.update({ email_sent: true });

  res.json({
    success: true,
    message: 'Credentials resent successfully',
    login_email: application.email,
  });
});

// GET /api/ngos (public map feed; admin can request all with includeAll=1)
export const listMapNgos = asyncHandler(async (req, res) => {
  const cols = await getNgoColumns();
  const includeAll = req.query.includeAll === '1' && req.user?.role === 'admin';
  const limit = Number.parseInt(req.query.limit || '100', 10);
  const where = includeAll ? {} : { approval_status: 'approved' };
  if (!includeAll && cols.has('latitude')) where.latitude = { [Op.ne]: null };
  if (!includeAll && cols.has('longitude')) where.longitude = { [Op.ne]: null };

  const attributes = [
    'id', 'org_name', 'org_type', 'org_address', 'org_description',
    'phone', 'email', 'coverage_radius_km', 'approval_status', 'createdAt',
  ];
  if (cols.has('website')) attributes.push('website');
  if (cols.has('map_pinned')) attributes.push('map_pinned');
  if (cols.has('show_on_user_map')) attributes.push('show_on_user_map');
  if (cols.has('latitude')) attributes.push('latitude');
  if (cols.has('longitude')) attributes.push('longitude');

  const ngos = await NgoApplication.findAll({
    where,
    attributes,
    order: [['updated_at', 'DESC']],
    limit: Number.isFinite(limit) ? limit : 100,
  });

  res.json({
    success: true,
    data: {
      ngos: ngos.map(mapNgoForMapResponse),
    },
  });
});

// GET /api/ngos/admin/list (admin map panel)
export const listAdminNgos = asyncHandler(async (req, res) => {
  const cols = await getNgoColumns();
  const attributes = [
    'id', 'org_name', 'org_type', 'org_address', 'org_description',
    'phone', 'email', 'coverage_radius_km', 'approval_status', 'createdAt',
  ];
  if (cols.has('website')) attributes.push('website');
  if (cols.has('map_pinned')) attributes.push('map_pinned');
  if (cols.has('show_on_user_map')) attributes.push('show_on_user_map');
  if (cols.has('latitude')) attributes.push('latitude');
  if (cols.has('longitude')) attributes.push('longitude');

  const ngos = await NgoApplication.findAll({
    attributes,
    order: [['updated_at', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      ngos: ngos.map(mapNgoForMapResponse),
    },
  });
});

// POST /api/ngos (admin create pin)
export const createMapNgo = asyncHandler(async (req, res) => {
  const cols = await getNgoColumns();
  if (!cols.has('latitude') || !cols.has('longitude')) {
    return res.status(400).json({
      success: false,
      message: 'Database migration required for map pins. Apply migrations/006_add_map_visibility_fields.sql and restart backend.',
    });
  }

  const now = Date.now();
  const fallbackEmail = `map-pin-${now}-${Math.floor(Math.random() * 10000)}@sunacare.local`;
  const payload = {
    contact_name: req.body.contact_name || req.body.org_name || 'Map Pin',
    email: (req.body.email || fallbackEmail).toLowerCase(),
    phone: req.body.phone || null,
    org_name: req.body.org_name,
    org_type: normalizeOrgTypeForDb(req.body.org_type),
    org_address: req.body.org_address || null,
    org_description: req.body.org_description || req.body.bio || null,
    coverage_radius_km: parseCoverageRadius(req.body.coverage_radius_km),
    approval_status: 'approved',
    reviewed_by: req.user.id,
    reviewed_at: new Date(),
    latitude: req.body.latitude ?? null,
    longitude: req.body.longitude ?? null,
    pinned_by: req.user.id,
  };
  if (cols.has('map_pinned')) payload.map_pinned = req.body.map_pinned !== false;
  if (cols.has('show_on_user_map')) payload.show_on_user_map = req.body.show_on_user_map !== false;
  if (cols.has('website')) payload.website = req.body.website || null;

  const record = await NgoApplication.create(payload);

  res.status(201).json({
    success: true,
    data: { ngo: mapNgoForMapResponse(record) },
  });
});

// PATCH /api/ngos/:id (admin update pin)
export const updateMapNgo = asyncHandler(async (req, res) => {
  const cols = await getNgoColumns();
  if (!cols.has('latitude') || !cols.has('longitude')) {
    return res.status(400).json({
      success: false,
      message: 'Database migration required for map pins. Apply migrations/006_add_map_visibility_fields.sql and restart backend.',
    });
  }

  const app = await NgoApplication.findByPk(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, message: 'NGO/Vet location not found' });
  }

  const updates = {
    org_name: req.body.org_name,
    org_type: Object.hasOwn(req.body, 'org_type') ? normalizeOrgTypeForDb(req.body.org_type) : undefined,
    org_address: req.body.org_address,
    org_description: req.body.org_description ?? req.body.bio,
    phone: req.body.phone,
    email: req.body.email,
    coverage_radius_km: Object.hasOwn(req.body, 'coverage_radius_km')
      ? parseCoverageRadius(req.body.coverage_radius_km)
      : undefined,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  };
  if (cols.has('map_pinned')) updates.map_pinned = req.body.map_pinned;
  if (cols.has('show_on_user_map')) updates.show_on_user_map = req.body.show_on_user_map;
  if (cols.has('website')) updates.website = req.body.website;

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });

  if (updates.email) {
    updates.email = String(updates.email).toLowerCase();
  }

  await app.update(updates);
  res.json({ success: true, data: { ngo: mapNgoForMapResponse(app) } });
});

// DELETE /api/ngos/:id (admin remove pin)
export const deleteMapNgo = asyncHandler(async (req, res) => {
  const app = await NgoApplication.findByPk(req.params.id);
  if (!app) {
    return res.status(404).json({ success: false, message: 'NGO/Vet location not found' });
  }
  await app.destroy();
  res.json({ success: true, message: 'Location removed' });
});

// GET /api/ngos/me/pin (responder own map pin)
export const getMyMapNgo = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'responder') {
    return res.status(403).json({ success: false, message: 'Responder account required' });
  }

  const app = await findResponderApplication(req.user);
  if (!app) {
    return res.status(404).json({ success: false, message: 'No linked NGO application found for this responder account' });
  }

  res.json({ success: true, data: { ngo: mapNgoForMapResponse(app) } });
});

// PUT /api/ngos/me/pin (responder upsert own map pin)
export const upsertMyMapNgo = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'responder') {
    return res.status(403).json({ success: false, message: 'Responder account required' });
  }

  const cols = await getNgoColumns();
  if (!cols.has('latitude') || !cols.has('longitude')) {
    return res.status(400).json({
      success: false,
      message: 'Database migration required for map pins. Apply migrations/006_add_map_visibility_fields.sql and restart backend.',
    });
  }

  const app = await findResponderApplication(req.user);
  if (!app) {
    return res.status(404).json({ success: false, message: 'No linked NGO application found for this responder account' });
  }

  const updates = {
    contact_name: req.body.contact_name,
    org_name: req.body.org_name,
    org_type: Object.hasOwn(req.body, 'org_type') ? normalizeOrgTypeForDb(req.body.org_type) : undefined,
    org_address: req.body.org_address,
    org_description: req.body.org_description ?? req.body.bio,
    phone: req.body.phone,
    email: req.body.email,
    coverage_radius_km: Object.hasOwn(req.body, 'coverage_radius_km')
      ? parseCoverageRadius(req.body.coverage_radius_km)
      : undefined,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    pinned_by: req.user.id,
  };
  if (cols.has('map_pinned')) updates.map_pinned = req.body.map_pinned !== false;
  if (cols.has('show_on_user_map')) {
    updates.show_on_user_map = Object.hasOwn(req.body, 'show_on_user_map')
      ? !!req.body.show_on_user_map
      : true;
  }
  if (cols.has('website')) updates.website = req.body.website;

  Object.keys(updates).forEach((key) => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });

  if (updates.email) {
    updates.email = String(updates.email).toLowerCase();
  }

  await app.update(updates);
  res.json({ success: true, data: { ngo: mapNgoForMapResponse(app) } });
});
