import { Request, Response, NextFunction } from 'express';
import {isArray, isNumber, isString} from "../utility/checkType";

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize strings to prevent XSS attacks
    const sanitize = (obj: any, depth: number = 0): any => {
        // Prevent deep recursion attacks
        if (depth > 10) return obj;

        if (typeof obj === 'string') {
            return obj
                // Remove script tags
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                // Remove event handlers (onclick, onerror, onload, etc.)
                .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
                .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
                // Remove javascript: URLs
                .replace(/javascript\s*:/gi, '')
                // Remove data: URLs that could contain scripts
                .replace(/data\s*:\s*text\/html/gi, '')
                // Remove vbscript: URLs
                .replace(/vbscript\s*:/gi, '')
                // Encode potentially dangerous characters
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }
        if (Array.isArray(obj)) {
            // Limit array size to prevent DoS
            if (obj.length > 100) {
                throw new Error('Array size exceeds maximum limit');
            }
            return obj.map(item => sanitize(item, depth + 1));
        }
        if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            // Limit object keys to prevent DoS
            if (keys.length > 50) {
                throw new Error('Object has too many properties');
            }
            for (const key of keys) {
                obj[key] = sanitize(obj[key], depth + 1);
            }
        }
        return obj;
    };

    try {
        req.body = sanitize(req.body);
        Object.assign(req.query, sanitize(req.query));
        next();
    } catch (error) {
        return res.status(400).send('Invalid input: ' + (error as Error).message);
    }
};

export const validateInput = (req: Request, res: Response, next: NextFunction): any => {
    if (req.method === "GET" || req.method === "DELETE") return next();
    
    let body = req.body;

    // Training Name
    if (body?.name != null && !req.path.includes('/register')) {
        const name = body.name;
        if (!isString(name)) return res.status(400).send("Name must be a string");
        if (name.length < 1 || name.length > 100) return res.status(400).send("Name must be between 1 and 100 characters");
        body.name = name.trim();
    }

    // Notes
    if (body?.notes != null && body.notes !== "") {
        const notes = body.notes;
        if (!isString(notes)) return res.status(400).send("Notes must be a string");
        if (notes.length > 500) return res.status(400).send("Notes must be less than 500 characters");
        if (notes.length === 0) return res.status(400).send("Notes cannot be empty");
        body.notes = notes.trim();
    }

    // Type
    if (body?.type != null) {
        const type = body.type;
        if (!isString(type)) return res.status(400).send("Type must be a string");
        if (type.length > 50) return res.status(400).send("Type must be less than 50 characters");
        if (type.length === 0) return res.status(400).send("Type cannot be empty");
        body.type = type.trim();
    }

    // Exercises (recursive)
    if (body?.exerciseLogs != null) {
        const exerciseLogs = body.exerciseLogs;
        if (!isArray(exerciseLogs)) return res.status(400).send("Exercise logs must be an array");
        for (const exerciseLog of exerciseLogs) {
            if (exerciseLog.name != null) {
                if (!isString(exerciseLog.name)) return res.status(400).send("Exercise log name must be a string");
                if (exerciseLog.name.length < 1 || exerciseLog.name.length > 100) return res.status(400).send("Exercise log name must be between 1 and 100 characters");
            }
            if (exerciseLog.type != null) {
                if (!isString(exerciseLog.type)) return res.status(400).send("Exercise log type must be a string");
                if (exerciseLog.type.length < 1 || exerciseLog.type.length > 50) return res.status(400).send("Exercise log type must be between 1 and 50 characters");
            }

            if (exerciseLog.notes != null && exerciseLog.notes !== "") {
                if (!isString(exerciseLog.notes)) return res.status(400).send("Exercise log notes must be a string");
                if (exerciseLog.notes.length > 500) return res.status(400).send("Exercise log notes must be less than 500 characters");
                exerciseLog.notes = exerciseLog.notes.trim();
            }

            if (exerciseLog.order != null) {
                if (!isNumber(exerciseLog.order)) return res.status(400).send("Exercise log order must be a number");
                if (exerciseLog.order < 0) return res.status(400).send("Exercise log order must be a positive number");
            }

            if (exerciseLog.sets != null) {
                for (const set of exerciseLog.sets || []) {
                    if (set.reps != null) {
                        if (!isNumber(set.reps)) return res.status(400).send("Set reps must be a number");
                        if (set.reps < 1 || set.reps > 1000) return res.status(400).send("Set reps must be between 1 and 1000");
                    }

                    if (set.repUnit != null) {
                        if (!isString(set.repUnit)) return res.status(400).send("Set rep unit must be a string");
                        if (set.repUnit.length < 1 || set.repUnit.length > 10) return res.status(400).send("Set rep unit must be between 1 and 10 characters");
                        set.repUnit = set.repUnit.trim();
                    }

                    if (set.weight != null) {
                        if (!isNumber(set.weight)) return res.status(400).send("Set weight must be a number");
                        if (set.weight < 0 || set.weight > 1000) return res.status(400).send("Set weight must be between 0 and 1000 kg");
                    }

                    if (set.order != null) {
                        if (!isNumber(set.order)) return res.status(400).send("Set order must be a number");
                        if (set.order < 0) return res.status(400).send("Set order must be a positive number");
                    }

                    if (set.pauseLength != null) {
                        if (!isNumber(set.pauseLength)) return res.status(400).send("Set pause length must be a number");
                        if (set.pauseLength < 0 || set.pauseLength > 3600) return res.status(400).send("Set pause length must be between 0 and 3600 seconds");
                    }

                    if (set.pauses != null) {
                        if (!isNumber(set.pauses)) return res.status(400).send("Set pauses must be a number");
                        if (set.pauses < 0 || set.pauses > 1000) return res.status(400).send("Set pauses must be between 0 and 1000");
                    }
                    
                }
            }
        }
    }

    // Average Heart Rate
    if (body?.avgHeartRate != null) {
        const avgHeartRate = body.avgHeartRate;
        if (!isNumber(avgHeartRate)) return res.status(400).send("Average heart rate must be a number");
        if (avgHeartRate < 20 || avgHeartRate > 300) return res.status(400).send("Average heart rate must be between 20 and 300");
    }

    // Gender
    if (body?.gender != null) {
        const gender = body.gender;
        if (!isString(gender)) return res.status(400).send("Gender must be a string");
        if (gender !== "male" && gender !== "female" && gender !== "other") return res.status(400).send("Gender must be male, female or other");
    }

    // Duration
    if (body?.duration != null) {
        const duration = body.duration;
        if (!isNumber(duration)) return res.status(400).send("Duration must be a number");
        if (duration < 1 || duration > 600) return res.status(400).send("Duration must be between 1 and 600 minutes");
    }

    // Calories Burned
    if (body?.caloriesBurned != null) {
        const caloriesBurned = body.caloriesBurned;
        if (!isNumber(caloriesBurned)) return res.status(400).send("Calories burned must be a number");
        if (caloriesBurned < 0 || caloriesBurned > 10000) return res.status(400).send("Calories burned must be between 0 and 10000");
    }

    // Score
    if (body?.score != null) {
        const score = body.score;
        if (!isNumber(score)) return res.status(400).send("Score must be a number");
        if (score < 0 || score > 10000) return res.status(400).send("Score must be between 0 and 10000");
    }

    // BodyLog fields
    for (const field of ["height", "fatMass", "fatPercentage", "muscleMass", "waterMass", "BMI", "BMR"]) {
        if (body?.[field] != null) {
            const value = body[field];
            if (!isNumber(value)) return res.status(400).send(`${field} must be a number`);
            if (value < 0 || value > 1000) return res.status(400).send(`${field} must be between 0 and 1000`);
        }
    }

    // NutritionLog fields
    if (body?.mealType != null) {
        const mealType = body.mealType;
        if (!isString(mealType)) return res.status(400).send("Meal type must be a string");
        if (mealType.length < 1 || mealType.length > 50) return res.status(400).send("Meal type must be between 1 and 50 characters");
    }
    for (const field of ["kcal", "protein", "carbs", "fat"]) {
        if (body?.[field] != null) {
            const value = body[field];
            if (!isNumber(value)) return res.status(400).send(`${field} must be a number`);
            if (value < 0 || value > 10000) return res.status(400).send(`${field} must be between 0 and 10000`);
        }
    }

    // User registration fields
    if (body?.name != null && req.path.includes('/register')) {
        const name = body.name;
        if (!isString(name)) return res.status(400).send("Name must be a string");
        if (name.length < 2 || name.length > 50) return res.status(400).send("Name must be between 2 and 50 characters");
        // Only allow letters, spaces, hyphens and apostrophes in names
        if (!/^[a-zA-ZäöüÄÖÜß\s'-]+$/.test(name)) return res.status(400).send("Name contains invalid characters");
        body.name = name.trim();
    }
    if (body?.email != null) {
        const email = body.email;
        if (!isString(email)) return res.status(400).send("Email must be a string");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send("Invalid email format");
    }
    if (body?.password != null) {
        const password = body.password;
        if (!isString(password)) return res.status(400).send("Password must be a string");
        if (password.length < 8 || password.length > 100) return res.status(400).send("Password must be between 8 and 100 characters");
        // Require at least one uppercase, one lowercase, one digit, and one special character
        if (!/[A-Z]/.test(password)) return res.status(400).send("Password must contain at least one uppercase letter");
        if (!/[a-z]/.test(password)) return res.status(400).send("Password must contain at least one lowercase letter");
        if (!/[0-9]/.test(password)) return res.status(400).send("Password must contain at least one digit");
    }
    if (body?.birthYear != null) {
        const birthYear = body.birthYear;
        if (!isNumber(birthYear)) return res.status(400).send("Birth year must be a number");
        const currentYear = new Date().getFullYear();
        if (birthYear < 1900 || birthYear > currentYear) return res.status(400).send("Birth year must be valid");
    }

    return next();
}
