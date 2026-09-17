import express from 'express';
import { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent } from '../controllers/event.controller.js';

const router = express.Router();

router.get("/", getAllEvents);
router.get("/:eid", getEventById);
router.post("/", createEvent);
router.put("/:eid", updateEvent);
router.delete("/:eid", deleteEvent);

export default router;
