import { NextFunction, Response } from 'express';
import prisma from '../../prisma/client';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";
import WorkoutExerciseService from "../../services/training/workoutExercise.service";

class WorkoutExerciseController {
    getWorkoutExercises = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const workoutId: string = req.params.workoutId as string;

        const includeSets: boolean = req.query.includeSets === 'true';

        if (!workoutId) return res.status(400).send("Workout ID is required");

        try {
            const workoutExercises = await WorkoutExerciseService.getWorkoutExercises(userId, workoutId, includeSets);
            return res.status(200).json(workoutExercises);
        } catch (error) {
            next(error);
        }
    }
    getWorkoutExerciseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const workoutId: string | undefined = req.params.workoutId as string | undefined;
        const workoutExerciseId: string = (req.params.workoutExerciseId ?? req.params.id) as string;

        const includeSets: boolean = req.query.includeSets === 'true';

        if (!workoutExerciseId) return res.status(400).send("Exercise log ID is required");

        try {
            const workoutExercise = await WorkoutExerciseService.getWorkoutExerciseById(userId, workoutExerciseId, includeSets, workoutId);

            if (!workoutExercise) return res.status(404).send("Exercise log not found");

            return res.status(200).json(workoutExercise);
        } catch (error) {
            next(error);
        }
    }
    createWorkoutExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const workoutId: string = req.params.workoutId as string;

        if (!workoutId) return res.status(400).send("Workout ID is required");

        let { name, notes, order } = req.body;

        try {
            const workoutExercise = await WorkoutExerciseService.createWorkoutExercise(userId, workoutId, name, notes, order);

            return res.status(201).json(workoutExercise);
        } catch (error) {
            next(error);
        }
    }

    updateWorkoutExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const workoutExerciseId: string = (req.params.workoutExerciseId ?? req.params.id) as string;
        const pathWorkoutId: string | undefined = req.params.workoutId as string | undefined;

        if (!workoutExerciseId) return res.status(400).send("WorkoutExercise ID is required");

        let { name, notes, order, workoutId } = req.body;

        try {
            const workoutExercise = await WorkoutExerciseService.getWorkoutExerciseById(userId, workoutExerciseId, true, pathWorkoutId);

            if (!workoutExercise) return res.status(404).send("WorkoutExercise not found");

            if (name == null && workoutExercise.exercise.name != null) name = workoutExercise.exercise.name;
            if (notes == null && workoutExercise.notes != null) notes = workoutExercise.notes;
            if (order == null && workoutExercise.order != null) order = workoutExercise.order;
            if (workoutId == null) workoutId = pathWorkoutId ?? workoutExercise.workoutId;

            const updatedWorkoutExercise = await WorkoutExerciseService.updateWorkoutExercise(userId, workoutExerciseId, workoutId, name, notes, order);

            return res.status(200).json(updatedWorkoutExercise);
        } catch (error) {
            next(error);
        }
    }
    deleteWorkoutExercise = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const workoutId: string | undefined = req.params.workoutId as string | undefined;
        const workoutExerciseId: string = (req.params.workoutExerciseId ?? req.params.id) as string;

        if (!workoutExerciseId) return res.status(400).send("Bad Request");

        const workoutExercise = await prisma.workoutExercise.findFirst({where: { id: workoutExerciseId, userId, ...(workoutId != null ? { workoutId } : {}) }});

        if (!workoutExercise) return res.status(404).send("WorkoutExercise not found");

        try {
            await prisma.workoutExercise.delete({where: { id: workoutExerciseId }});
            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new WorkoutExerciseController();
