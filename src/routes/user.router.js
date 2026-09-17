import express from 'express';
import { getAll, getAllByEmail, updateEmail } from '../controllers/user.controller.js';

const router = express.Router();

router.get("/", getAll);
router.get("/:email", getAllByEmail);
router.put("/:email", updateEmail);

export default router;
