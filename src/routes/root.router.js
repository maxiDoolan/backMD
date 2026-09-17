import { Router } from 'express';
import { healtstatus } from '../controllers/root.controllers.js';

const router = Router();

router.get('/health', healtstatus);

export default router;
