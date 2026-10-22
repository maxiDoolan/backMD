import { Router } from "express";
import { getAll } from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

const router = Router();

// Ruta administrativa: solo admin
router.get("/", auth, authorize(PERMISSIONS.VIEW_USERS), getAll);

export default router;
