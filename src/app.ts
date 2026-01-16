import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import cors from "./middleware/cors.middleware";

import userRoutes from './routes/user.routes';
import trainingRoutes from "./routes/training.routes";
import cookieParser from 'cookie-parser';
import exerciseRoutes from "./routes/exercise.routes";
import setRoutes from "./routes/set.routes";
import bodyRoutes from "./routes/bodyLog.routes";
import { requestLogger } from './middleware/logger.middleware';
import { sanitizeInput, validateInput } from './middleware/inputSanitizer.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { isAuthenticated } from './controllers/user.controller';
import { authenticateToken } from './middleware/auth.middleware';
import exerciseLogRoutes from "./routes/exerciseLog.routes";

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
app.use(express.json( { limit: '10mb' }));
app.use(helmet())

if (!process.env.ALLOWED_ORIGINS) {
	console.error("ALLOWED_ORIGINS is not defined in the environment variables.");
	process.exit(1);
}

app.use(cors);

if (!process.env.JWT_SECRET) {
	console.error("JWT_SECRET is not defined in the environment variables.");
	process.exit(1);
}

app.use("/health-api", sanitizeInput);
app.use("/health-api", validateInput);
app.use("/health-api", limiter);
app.use("/health-api", requestLogger);

app.use("/health-api/users/isAuthenticated", isAuthenticatedLimiter, authenticateToken , isAuthenticated);
app.use('/health-api/users', userRoutes);
app.use("/health-api/training", trainingRoutes);

app.use("/health-api/exerciseLog", exerciseLogRoutes)
app.use("/health-api/set", setRoutes)
app.use("/health-api/bodyLog", bodyRoutes)
app.use("/health-api/exercise", exerciseRoutes)

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
