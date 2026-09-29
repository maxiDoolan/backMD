import { Router } from "express";
import {
    registerController,
    loginController,
    currentController,
    logoutController,
} from "../controllers/sessions.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/current", auth, currentController);
router.post("/logout", logoutController);

export default router;
