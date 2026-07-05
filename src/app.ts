import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import cors from "./middleware/cors.middleware";
import fs from "fs"

import userRoutes from './routes/user.routes';
import cookieParser from 'cookie-parser';
import exerciseRoutes from "./routes/training/exercise.routes";
import setRoutes from "./routes/training/workoutSet.routes";
import bodyRoutes from "./routes/bodyLog.routes";
import { requestLogger } from './middleware/logger.middleware';
import { sanitizeInput, validateInput } from './middleware/inputSanitizer.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { isAuthenticated } from './controllers/user.controller';
import { authenticateToken } from './middleware/auth.middleware';
import foodRoutes from "./routes/food/food.routes";
import mealLogRoutes from "./routes/food/mealLog.routes";
import dashboardRoutes from "./routes/food/dashboard.routes";
import goalsRoutes from "./routes/food/goals.routes";
import nrvRoutes from "./routes/food/nrv.routes";
import mealRecipeRoutes from "./routes/food/meal.routes";
import hrvRoutes from "./routes/hrv/hrv.routes";
import bloodPressureRoutes from "./routes/vitals/bloodPressure.routes";
import sleepRoutes from "./routes/vitals/sleep.routes";
import symptomRoutes from "./routes/symptoms/symptom.routes";
import syncopeRoutes from "./routes/symptoms/syncope.routes";
import dailyLogRoutes from "./routes/symptoms/dailyLog.routes";
import healthDayRoutes from "./routes/daily/healthDay.routes";
import progressionRoutes from "./routes/training/progression.routes";
import calenderRoutes from "./routes/analysis/calender.routes";
import microRoutes from "./routes/analysis/micro.routes";
import validateCFAccess from './middleware/cfAccess.middleware';
import workoutRoutes from "./routes/training/workout.routes";
import workoutExerciseRoutes from "./routes/training/workoutExercise.routes";
import chartRoutes from "./routes/chart/chart.routes";

dotenv.config();

const app = express() as any;

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
});

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
});

const isAuthenticatedLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
});

if (!fs.existsSync("rrdata")) {
    fs.mkdirSync("rrdata");
}

if (!process.env.ALLOWED_ORIGINS) {
	console.error("ALLOWED_ORIGINS is not defined in the environment variables");
	process.exit(1);
}

app.use(cors);

app.use(cookieParser());
app.use(express.json( { limit: '10mb' }));
app.use(express.raw( { limit: '10mb' }));
app.use(express.text( { limit: '10mb' }));
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
}))

if (!process.env.JWT_SECRET) {
	console.error("JWT_SECRET is not defined in the environment variables.");
	process.exit(1);
}

if (process.env.NODE_ENV === "production") {
    if (!process.env.CF_TEAM_DOMAIN) {
        console.error("CF_TEAM_DOMAIN is not defined in the environment variables.");
        process.exit(1);
    }

    const cfAudTags = process.env.CF_AUD_TAGS?.split(",").map(tag => tag.trim()).filter(Boolean) || [];
    if (cfAudTags.length === 0) {
        console.error("CF_AUD_TAGS is not defined in the environment variables.");
        process.exit(1);
    }
}

app.use(validateCFAccess);
app.use(sanitizeInput);
app.use(validateInput);
app.use(limiter);
app.use(requestLogger);

app.use("/health-api/users/isAuthenticated", isAuthenticatedLimiter, authenticateToken , isAuthenticated);
app.use('/health-api/users', authLimiter, userRoutes);
app.use("/health-api/workouts", workoutRoutes);
app.use("/health-api/workouts/:workoutId/exercises/:workoutExerciseId/sets", setRoutes);
app.use("/health-api/workouts/:workoutId/exercises", workoutExerciseRoutes);

app.use("/health-api/sets", setRoutes)
app.use("/health-api/bodyLog", bodyRoutes)
app.use("/health-api/exercise", exerciseRoutes)

app.use("/health-api/foods", foodRoutes);
app.use("/health-api/meal-logs", mealLogRoutes);
app.use("/health-api/dashboard", dashboardRoutes);
app.use("/health-api/goals", goalsRoutes);
app.use("/health-api/nrv", nrvRoutes);
app.use("/health-api/meal-recipes", mealRecipeRoutes);

app.use("/health-api/hrv", hrvRoutes);
app.use("/health-api/blood-pressure", bloodPressureRoutes);
app.use("/health-api/sleep", sleepRoutes);

app.use("/health-api/symptoms", symptomRoutes);
app.use("/health-api/syncopes", syncopeRoutes)
app.use("/health-api/daily-logs", dailyLogRoutes);
app.use("/health-api/health-days", healthDayRoutes);
app.use("/health-api/workouts", progressionRoutes);
app.use("/health-api/analysis/calender", calenderRoutes);
app.use("/health-api/analysis/micro", microRoutes);
app.use("/health-api/chart", chartRoutes);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
