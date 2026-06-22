import { NextFunction, Response } from 'express';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";
import ExerciseService from "../../services/training/exercise.service";

class ExerciseController {
    getExercises = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        try {
            const exercises = await ExerciseService.getAllExercises(userId);

            return res.status(200).json(exercises);
        } catch (error) {
            return next(error);
        }
    }

    getExerciseNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        try {
            const names = await ExerciseService.getExerciseNames(userId);

            return res.status(200).json(names);
        } catch (error) {
            return next(error);
        }
    }

    getExerciseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const exerciseId = req.params.id as string;

        const includeWorkoutExercises: boolean = req.query.includeWorkoutExercises === 'true';

        if (!exerciseId) return res.status(400).send("Bad Request");

        try {
            const exercise = await ExerciseService.getExerciseById(userId, exerciseId, includeWorkoutExercises);

            return res.status(200).json(exercise);
        } catch (error) {
            return next(error);
        }
    }

    createExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const name: string | undefined = req.body.name;

        if (!name) return res.status(400).send("Bad Request");

        try {
            const newExercise = await ExerciseService.createExercise(userId, name);
            return res.status(201).json(newExercise);
        } catch (error) {
            return next(error);
        }
    }

    updateExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const exerciseId: string | undefined = req.params.id;
        const newName = req.body.name;

        if (!exerciseId) return res.status(400).send("Bad Request");
        if (!newName) return res.status(400).send("Bad Request");

        try {
            const existingExercise = await ExerciseService.getExerciseById(userId, exerciseId);
            if (!existingExercise) return res.status(404).send("Exercise not found");

            const exercise = await ExerciseService.changeExercise(userId, exerciseId, newName);

            return res.status(200).json(exercise);
        } catch (error) {
            return next(error);
        }
    }

    deleteExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const exerciseId: string = req.params.id as string;

        if (!exerciseId) return res.status(400).send("Bad Request");

        try {
            await ExerciseService.deleteExercise(userId, exerciseId);

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}

export default new ExerciseController();
