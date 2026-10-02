import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import { initializePassport } from "./config/passport.config.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import rootRouter from "./routes/root.router.js";
import userRouter from "./routes/user.router.js";
import ticketRouter from "./routes/ticket.router.js";
import eventRouter from "./routes/events.router.js";
import sessionsRouter from "./routes/sessions.router.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

// Passport: las estrategias se registran en config/passport.config.js
initializePassport();
app.use(passport.initialize());

app.use("/api", rootRouter);
app.use("/api/users", userRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/events", eventRouter);
app.use("/api/sessions", sessionsRouter);

app.use(errorHandler);

export default app;
