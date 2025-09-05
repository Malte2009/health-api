import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import fs from 'fs';

import userRoutes from './routes/user.routes';
import trainingRoutes from "./routes/training/training.routes";
import traingsPlanRoutes from "./routes/trainingsPlan/traingsPlan.routes";
import dayRoutes from "./routes/trainingsPlan/day.routes";
import cookieParser from 'cookie-parser';
import exerciseRoutes from "./routes/training/exercise.routes";
import setRoutes from "./routes/training/set.routes";
import bodyRoutes from "./routes/body.routes";
import { requestLogger } from './middleware/logger.middleware';
import { sanitizeInput, validateInput } from './middleware/inputSanitizer.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { isAuthenticated } from './controllers/user.controller';
import { authenticateToken } from './middleware/auth.middleware';

dotenv.config();

const app = express();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
});

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
});

const isAuthenticatedLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
});

app.use(cookieParser());
app.use(express.json());
app.use(helmet())

const allowedOrigins = [
	'http://localhost:3000',
	"https://node00.tailf7c6ee.ts.net",
	process.env.FRONTEND_URL,
	process.env.FRONTEND_URL2
];

app.use(cors({
	origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
	credentials: true
}));

if (!process.env.JWT_SECRET) {
	console.error("JWT_SECRET is not defined in the environment variables.");
	process.exit(1);
}

app.use("/health-api", sanitizeInput);
app.use("/health-api", validateInput);
app.use("/health-api", limiter);
app.use("/health-api", requestLogger);

app.use("/health-api/users/isAuthenticated", isAuthenticatedLimiter, authenticateToken , isAuthenticated);
app.use('/health-api/users', authLimiter, userRoutes);
app.use("/health-api/training", trainingRoutes);

app.use("/health-api/exercise", exerciseRoutes)
app.use("/health-api/set", setRoutes)
app.use("/health-api/body", bodyRoutes)
app.use("/health-api/trainingPlan", traingsPlanRoutes)
app.use("/health-api/days", authenticateToken, dayRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
