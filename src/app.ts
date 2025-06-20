import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

import userRoutes from './routes/user.routes';
import trainingRoutes from "./routes/training.routes";
import cookieParser from 'cookie-parser';
import exerciseRoutes from "./routes/exercise.routes";
import setRoutes from "./routes/set.routes";
import bodyRoutes from "./routes/body.routes";
import { requestLogger } from './middleware/logger.middleware';
import { sanitizeInput } from './middleware/inputSanitizer.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { isAuthenticated } from './controllers/user.controller';

dotenv.config();

const app = express();

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
});

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
});

const isAuthenticatedLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 10 requests per windowMs
});

app.use(cookieParser());
app.use(express.json( { limit: '10mb' }));
app.use(helmet())

const allowedOrigins = [
	'http://localhost:3000',
	process.env.FRONTEND_URL,
];

app.use(cors({
	origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
	credentials: true,
}));

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined in .env file');

app.use("/api", limiter);
app.use("/api", requestLogger)
app.use("/api", sanitizeInput);

app.use("/api/users/isAuthenticated", isAuthenticatedLimiter, isAuthenticated);
app.use('/api/users', authLimiter, userRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/exercise", exerciseRoutes)
app.use("/api/set", setRoutes)
app.use("/api/body", bodyRoutes)

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
