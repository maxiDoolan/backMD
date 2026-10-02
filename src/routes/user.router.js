import { Router } from "express";
import { getAll, getAllByEmail, updateEmail } from "../controllers/user.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.middleware.js";
import { PERMISSIONS } from "../config/roles.js";

const router = Router();

// Rutas administrativas: solo admin
router.use(auth, authorize(PERMISSIONS.VIEW_USERS));

router.get("/", getAll);
router.get("/:email", getAllByEmail);
router.put("/:email", updateEmail);

export default router;
