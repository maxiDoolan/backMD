import { Router } from "express";
import { getAll, getAllById, purchaseTicket } from "../controllers/ticket.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { ticketPermission } from "../middlewares/ownership.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

const router = Router();

router.use(auth);

// Pendientes
router.get("/", getAll);
router.get("/:tid", getAllById);

// Comprar: todos los roles, pero no en un evento propio
router.post("/:uid/:eid", authorize(PERMISSIONS.BUY_TICKET), ticketPermission, purchaseTicket);

export default router;
