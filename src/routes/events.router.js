import { Router } from "express";
import {
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    changeEventStatus,
} from "../controllers/event.controller.js";
import { enroll, getEventTickets } from "../controllers/ticket.controller.js";
import { auth, optionalAuth } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { eventOwnership } from "../middlewares/ownership.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

const router = Router();

// Públicas (si hay sesión, el organizer/admin además ve sus borradores)
router.get("/", optionalAuth, getAllEvents);
router.get("/:id", optionalAuth, getEventById);

// organizer / admin
router.post("/", auth, authorize(PERMISSIONS.CREATE_EVENT), createEvent);

// Dueño del evento o admin
router.put("/:id", auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, updateEvent);
router.patch("/:id/status", auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, changeEventStatus);

// Inscripciones
router.post("/:eid/tickets", auth, authorize(PERMISSIONS.ENROLL), enroll);
router.get("/:eid/tickets", auth, authorize(PERMISSIONS.VIEW_EVENT_TICKETS), eventOwnership, getEventTickets);

export default router;
