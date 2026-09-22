import express from 'express';
import { config } from 'dotenv';
import rootRouter from './routes/root.router.js';
import userRouter from './routes/user.router.js';
import ticketRouter from './routes/ticket.router.js';
import eventRouter from './routes/event.router.js';
import sessionsRouter from './routes/sessions.router.js';

config();

const app = express();

app.use(express.json());

app.use('/api', rootRouter);
app.use('/api/users', userRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/events', eventRouter);
app.use("/api/sessions",sessionsRouter);

export default app;
