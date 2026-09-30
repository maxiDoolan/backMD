import { Router } from "express";
import {
    registerController,
    loginController,
    currentController,
    logoutController,
} from "../controllers/sessions.controller.js";
import { passportCall } from "../middlewares/passport.middleware.js";

const router = Router();

router.post("/register", passportCall("register"), registerController);
router.post("/login", passportCall("login"), loginController);
router.get("/current", passportCall("current"), currentController);
router.post("/logout", logoutController);

export default router;
