import { Router } from "express";
import { getMyTickets, cancelTicket } from "../controllers/ticket.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { ticketOwnership } from "../middlewares/ownership.middleware.js";

const router = Router();

// Todas requieren sesión
router.use(auth);

// Mis tickets (solo los del usuario logueado)
router.get("/my-tickets", getMyTickets);

// Cancelar: dueño del ticket o admin
router.patch("/:tid/cancel", ticketOwnership, cancelTicket);

export default router;
