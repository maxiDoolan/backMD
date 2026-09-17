import express from 'express';
import { getAll, getAllById, purchaseTicket } from '../controllers/ticket.controller.js';

const router = express.Router();

router.get("/", getAll);
router.get("/:tid", getAllById);
router.post("/:uid/:eid", purchaseTicket);

export default router;
