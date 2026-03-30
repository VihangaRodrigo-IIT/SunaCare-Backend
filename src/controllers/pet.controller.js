import { Pet, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const POSTER_ATTRS = ['id', 'name', 'role', 'avatar'];
const MAX_IMAGE_DATA_URL_LENGTH = 900000;

// Phone validation: Sri Lanka format (+94 or 0 prefix, 10-11 digits total)
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return { valid: false, error: 'Phone number is required' };
  const trimmed = phone.trim();
  const srPhoneRegex = /^(\+94|0)\d{9,10}$/;
  if (!srPhoneRegex.test(trimmed)) {
    return { valid: false, error: 'Phone must start with +94 or 0 and contain 10-11 digits total' };
  }
  return { valid: true };
}

// Email validation: basic RFC 5322 pattern
function validateEmailFormat(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: 'Email is required' };
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 255) {
    return { valid: false, error: 'Email format is invalid' };
  }
  return { valid: true };
}

// Validate contact name: required, length limits
function validateContactNameField(name) {
  if (!name || typeof name !== 'string') return { valid: false, error: 'Contact name is required' };
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, error: 'Contact name must be 2-100 characters' };
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Contact name must contain at least one letter' };
  }
  return { valid: true };
}

function parseImageUrls(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((url) => typeof url === 'string' && url.trim());
  if (typeof value !== 'string') return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((url) => typeof url === 'string' && url.trim());
    }
  } catch {
    // Ignore parse failures and treat as a single URL.
  }
  return [trimmed];
}

function normalizePetImages(payload) {
  const imageUrls = Array.from(new Set([
    ...parseImageUrls(payload?.image_urls),
    ...parseImageUrls(payload?.image_url),
  ].map((url) => normalizeImageUrlOrThrow(url))));
  return {
    image_url: imageUrls[0] || null,
    image_urls: imageUrls.length ? JSON.stringify(imageUrls) : null,
  };
}

function serializePet(pet) {
  const plain = pet?.toJSON ? pet.toJSON() : pet;
  const imageUrls = Array.from(new Set([
    ...parseImageUrls(plain?.image_urls),
    ...parseImageUrls(plain?.image_url),
  ]));
  return {
    ...plain,
    image_url: imageUrls[0] || null,
    image_urls: imageUrls,
  };
}

function normalizeImageUrlOrThrow(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
  const value = imageUrl.trim();
  if (!value.startsWith('data:image/')) return value;
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    const err = new Error('Image is too large. Please upload a smaller image.');
    err.statusCode = 413;
    throw err;
  }
  return value;
}

export const listPets = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status)  where.status  = req.query.status;
  if (req.query.species) where.species = req.query.species;
  const pets = await Pet.findAll({
    where,
    include: [{ model: User, as: 'poster', attributes: POSTER_ATTRS, required: false }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, pets: pets.map(serializePet) });
});

export const getPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id, {
    include: [{ model: User, as: 'poster', attributes: POSTER_ATTRS, required: false }],
  });
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  res.json({ success: true, pet: serializePet(pet) });
});

export const createPet = asyncHandler(async (req, res) => {
  const {
    name, species, breed, age_years, age_months, gender, size, color,
    description, health_notes, personality, ideal_home, location,
    vaccinated, neutered, microchipped, dewormed, urgent, image_url,
    image_urls,
    contact_name, contact_phone, contact_email,
  } = req.body;

  // Validate contact fields with specific error messages
  const cnameVal = validateContactNameField(contact_name);
  if (!cnameVal.valid) {
    return res.status(400).json({ success: false, message: cnameVal.error, field: 'contact_name' });
  }

  const cphoneVal = validatePhoneNumber(contact_phone);
  if (!cphoneVal.valid) {
    return res.status(400).json({ success: false, message: cphoneVal.error, field: 'contact_phone' });
  }

  const cemailVal = validateEmailFormat(contact_email);
  if (!cemailVal.valid) {
    return res.status(400).json({ success: false, message: cemailVal.error, field: 'contact_email' });
  }

  const normalizedContactName = contact_name.trim();
  const normalizedContactPhone = contact_phone.trim();
  const normalizedImages = normalizePetImages({ image_url, image_urls });
  const pet = await Pet.create({
    name, species, breed, age_years, age_months, gender, size, color,
    description, health_notes, personality, ideal_home, location,
    vaccinated: !!vaccinated, neutered: !!neutered,
    microchipped: !!microchipped, dewormed: !!dewormed,
    urgent: !!urgent,
    ...normalizedImages,
    contact_name: normalizedContactName,
    contact_phone: normalizedContactPhone,
    contact_email,
    posted_by: req.user.id,
  });
  res.status(201).json({ success: true, pet: serializePet(pet) });
});

export const updatePet = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id);
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  if (req.user.role !== 'admin' && pet.posted_by !== req.user.id)
    return res.status(403).json({ success: false, message: 'Not authorised' });
  const allowed = ['name','species','breed','age_years','age_months','gender','size','color',
                   'description','health_notes','personality','ideal_home','location','status',
                   'vaccinated','neutered','microchipped','dewormed','urgent','image_url','image_urls',
                   'contact_name','contact_phone','contact_email'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  // Validate contact fields if being updated
  if (updates.contact_name) {
    const cnameVal = validateContactNameField(updates.contact_name);
    if (!cnameVal.valid) {
      return res.status(400).json({ success: false, message: cnameVal.error, field: 'contact_name' });
    }
  }

  if (updates.contact_phone) {
    const cphoneVal = validatePhoneNumber(updates.contact_phone);
    if (!cphoneVal.valid) {
      return res.status(400).json({ success: false, message: cphoneVal.error, field: 'contact_phone' });
    }
  }

  if (updates.contact_email !== undefined) {
    const cemailVal = validateEmailFormat(updates.contact_email);
    if (!cemailVal.valid) {
      return res.status(400).json({ success: false, message: cemailVal.error, field: 'contact_email' });
    }
  }

  if (updates.image_url !== undefined || updates.image_urls !== undefined) {
    Object.assign(updates, normalizePetImages({ image_url: updates.image_url, image_urls: updates.image_urls }));
  }
  await pet.update(updates);
  res.json({ success: true, pet: serializePet(pet) });
});

export const deletePet = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id);
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  if (req.user.role !== 'admin' && pet.posted_by !== req.user.id)
    return res.status(403).json({ success: false, message: 'Not authorised' });
  await pet.destroy();
  res.json({ success: true, message: 'Pet deleted' });
});

// GET /api/pets/mine  (responder — own listings)
export const getMyPets = asyncHandler(async (req, res) => {
  const pets = await Pet.findAll({
    where: { posted_by: req.user.id },
    include: [{ model: User, as: 'poster', attributes: POSTER_ATTRS, required: false }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, pets: pets.map(serializePet) });
});

// Marks pet as pending — no separate adoption_applications table
export const applyAdopt = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id);
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  if (pet.status !== 'available')
    return res.status(400).json({ success: false, message: 'This pet is not available for adoption' });
  await pet.update({ status: 'pending' });
  res.json({ success: true, message: 'Adoption request submitted. A responder will be in touch.' });
});
