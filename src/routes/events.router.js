import { Router } from "express";
import { getAllEvents, getEventById, createEvent, updateEvent, deleteEvent } from "../controllers/event.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { eventOwnership } from "../middlewares/ownership.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

const router = Router();

router.get("/",     auth, authorize(PERMISSIONS.VIEW_EVENTS), getAllEvents);
router.get("/:eid", auth, authorize(PERMISSIONS.VIEW_EVENTS), getEventById);

router.post("/",       auth, authorize(PERMISSIONS.CREATE_EVENT), createEvent);
router.put("/:eid",    auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, updateEvent);
router.delete("/:eid", auth, authorize(PERMISSIONS.MANAGE_EVENT), eventOwnership, deleteEvent);

export default router;
