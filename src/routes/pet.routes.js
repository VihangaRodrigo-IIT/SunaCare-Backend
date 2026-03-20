import { Router } from 'express';
import { listPets, getPet, getMyPets, createPet, updatePet, deletePet, applyAdopt } from '../controllers/pet.controller.js';
import { protect, authorize, optionalProtect } from '../middleware/auth.middleware.js';

const router = Router();

// NOTE: /mine must be before /:id so it is not treated as an ID
router.get('/mine',      protect, authorize('responder', 'user'), getMyPets);
router.get('/',          listPets);
router.get('/:id',       getPet);
router.post('/',         protect, authorize('responder', 'user'), createPet);
router.put('/:id',       protect, updatePet);
router.delete('/:id',    protect, deletePet);
router.post('/:id/apply',protect, applyAdopt);

export default router;
