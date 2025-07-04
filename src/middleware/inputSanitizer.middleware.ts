import { Request, Response, NextFunction } from 'express';
import {isArray, isNumber, isString} from "../utility/checkType";

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize strings to prevent basic XSS
    const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };

    req.body = sanitize(req.body);
    Object.assign(req.query, sanitize(req.query));
    next();
};

export const validateInput = (req: Request, res: Response, next: NextFunction): any => {
    if (req.method === "GET" || req.method === "DELETE") return next();
    
    let body = req.body;

    if (req.body.custom) body = req.body.custom;  

    // Notes
    if (body?.notes != null) {
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
    if (body?.exercises != null) {
        const exercises = body.exercises;
        if (!isArray(exercises)) return res.status(400).send("Exercises must be an array");
        for (const exercise of exercises) {
            req.body.custom = exercise;
            validateInput(req, res, next);
        }
    }

    // Average Heart Rate
    if (body?.avgHeartRate != null) {
        const avgHeartRate = body.avgHeartRate;
        if (!isNumber(avgHeartRate)) return res.status(400).send("Average heart rate must be a number");
        if (avgHeartRate < 0 || avgHeartRate > 300) return res.status(400).send("Average heart rate must be between 0 and 300");
    }

    // Reps
    if (body?.reps != null) {
        const reps = body.reps;
        if (!isNumber(reps)) return res.status(400).send("Reps must be a number");
        if (reps < 1 || reps > 1000) return res.status(400).send("Reps must be between 1 and 1000");
    }

    // Weight
    if (body?.weight != null) {
        const weight = body.weight;
        if (!isNumber(weight)) return res.status(400).send("Weight must be a number");
        if (weight < 0 || weight > 1000) return res.status(400).send("Weight must be between 0 and 1000 kg");
    }

    // Pauses
    if (body?.pauses != null) {
        const pauses = body.pauses;
        if (!isNumber(pauses)) return res.status(400).send("Pauses must be a number");
        if (pauses < 0 || pauses > 1000) return res.status(400).send("Pauses must be between 0 and 1000");
    }

    // Pause Length
    if (body?.pauseLength != null) {
        const pauseLength = body.pauseLength;
        if (!isNumber(pauseLength)) return res.status(400).send("Pause length must be a number");
        if (pauseLength < 0 || pauseLength > 3600) return res.status(400).send("Pause length must be between 0 and 3600 seconds");
    }

    // Rep Unit
    if (body?.repUnit != null) {
        const repUnit = body.repUnit;
        if (!isString(repUnit)) return res.status(400).send("Rep unit must be a string");
        if (repUnit.length < 1 || repUnit.length > 10) return res.status(400).send("Rep unit must be between 1 and 10 characters");
        body.repUnit = repUnit.trim();
    }

    // Sets (recursive)
    if (body?.sets != null) {
        const sets = body.sets;
        if (!isArray(sets)) return res.status(400).send("Sets must be an array");
        for (const set of sets) {
            req.body.custom = set;
            validateInput(req, res, next);
        }
    }

    // Order
    if (body?.order != null) {
        const order = body.order;
        if (!isNumber(order)) return res.status(400).send("Order must be a number");
        if (order < 0) return res.status(400).send("Order must be a positive number");
    }

    // Name
    if (body?.name != null) {
        const name = body.name;
        if (!isString(name)) return res.status(400).send("Name must be a string");
        if (name.length < 1) return res.status(400).send("Name must be at least 1 character long");
        if (name.length > 100) return res.status(400).send("Name must be at most 100 characters long");
        body.name = name.trim();
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
    if (body?.email != null) {
        const email = body.email;
        if (!isString(email)) return res.status(400).send("Email must be a string");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send("Invalid email format");
    }
    if (body?.password != null) {
        const password = body.password;
        if (!isString(password)) return res.status(400).send("Password must be a string");
        if (password.length < 6 || password.length > 100) return res.status(400).send("Password must be between 6 and 100 characters");
    }
    if (body?.birthYear != null) {
        const birthYear = body.birthYear;
        if (!isNumber(birthYear)) return res.status(400).send("Birth year must be a number");
        const currentYear = new Date().getFullYear();
        if (birthYear < 1900 || birthYear > currentYear) return res.status(400).send("Birth year must be valid");
    }

    // If no errors, continue
    if (req.body.custom) {
        req.body.custom = null;
        return
    }

    next();
}