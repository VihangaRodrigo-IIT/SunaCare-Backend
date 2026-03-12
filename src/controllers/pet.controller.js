import { Pet, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const POSTER_ATTRS = ['id', 'name', 'role', 'avatar'];
const MAX_IMAGE_DATA_URL_LENGTH = 900000;

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
  res.json({ success: true, pets });
});

export const getPet = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id, {
    include: [{ model: User, as: 'poster', attributes: POSTER_ATTRS, required: false }],
  });
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  res.json({ success: true, pet });
});

export const createPet = asyncHandler(async (req, res) => {
  const {
    name, species, breed, age_years, age_months, gender, size, color,
    description, health_notes, ideal_home, location,
    vaccinated, neutered, microchipped, dewormed, urgent, image_url,
    contact_name, contact_phone, contact_email,
  } = req.body;
  const pet = await Pet.create({
    name, species, breed, age_years, age_months, gender, size, color,
    description, health_notes, ideal_home, location,
    vaccinated: !!vaccinated, neutered: !!neutered,
    microchipped: !!microchipped, dewormed: !!dewormed,
    urgent: !!urgent, image_url: normalizeImageUrlOrThrow(image_url),
    contact_name, contact_phone, contact_email,
    posted_by: req.user.id,
  });
  res.status(201).json({ success: true, pet });
});

export const updatePet = asyncHandler(async (req, res) => {
  const pet = await Pet.findByPk(req.params.id);
  if (!pet) return res.status(404).json({ success: false, message: 'Pet not found' });
  if (req.user.role !== 'admin' && pet.posted_by !== req.user.id)
    return res.status(403).json({ success: false, message: 'Not authorised' });
  const allowed = ['name','species','breed','age_years','age_months','gender','size','color',
                   'description','health_notes','ideal_home','location','status',
                   'vaccinated','neutered','microchipped','dewormed','urgent','image_url',
                   'contact_name','contact_phone','contact_email'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.image_url !== undefined) {
    updates.image_url = normalizeImageUrlOrThrow(updates.image_url);
  }
  await pet.update(updates);
  res.json({ success: true, pet });
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
  res.json({ success: true, pets });
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
