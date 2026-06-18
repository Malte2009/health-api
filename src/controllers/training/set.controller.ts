import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import SetService from "../../services/training/workoutSet.service";
import WorkoutExerciseService from "../../services/training/workoutExercise.service";

class SetController {
    getSets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const workoutId = req.params.workoutId as string | undefined;
        const workoutExerciseId = req.params.workoutExerciseId as string | undefined;

        try {
            if (workoutExerciseId != null) {
                const workoutExercise = await WorkoutExerciseService.getWorkoutExerciseById(userId, workoutExerciseId, false, workoutId);
                if (!workoutExercise) return res.status(404).send("WorkoutExercise not found");
            }

            const sets = await SetService.getSets(userId, workoutExerciseId, workoutId);

            return res.status(200).json(sets);
        } catch (error) {
            return next(error);
        }
    }

    getSetById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const setId: string = req.params.setId ?? req.params.id;
        const workoutId = req.params.workoutId as string | undefined;
        const workoutExerciseId = req.params.workoutExerciseId as string | undefined;

        if (!setId) return res.status(400).send("Bad Request");

        try {
            const set = await SetService.getSetById(userId, setId, workoutExerciseId, workoutId);

            if (!set) return res.status(404).send("Set not found");

            return res.status(200).json(set);
        } catch (error) {
            return next(error);
        }
    }

    getSetTypes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        try {
            const setTypes = await SetService.getSetTypes(userId);

            return res.status(200).json(setTypes);
        } catch (error) {
            return next(error);
        }
    }

    getSetUnits = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        try {
            const setUnits = await SetService.getSetUnits(userId);

            return res.status(200).json(setUnits);
        } catch (error) {
            return next(error);
        }
    }

    createSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const workoutId = req.params.workoutId as string | undefined;
        const workoutExerciseId: string = (req.params.workoutExerciseId ?? req.body.workoutExerciseId ?? req.body.exerciseLogId) as string;
        const { type, repUnit } = req.body;
        const reps = Number(req.body.reps);
        const weight = Number(req.body.weight);
        const setTime = req.body.setTime == null ? undefined : Number(req.body.setTime);
        const order = req.body.order == null ? undefined : Number(req.body.order);

        if (!workoutExerciseId) return res.status(400).send("WorkoutExercise ID is required");
        if (!Number.isInteger(reps)) return res.status(400).send("Reps must be a number");
        if (!Number.isFinite(weight)) return res.status(400).send("Weight must be a number");
        if (!type || type.length === 0) return res.status(400).send("Type cannot be empty");
        if (!repUnit || repUnit.length === 0) return res.status(400).send("Rep unit cannot be empty");
        if (setTime != null && !Number.isInteger(setTime)) return res.status(400).send("Set time must be a number");
        if (order != null && !Number.isInteger(order)) return res.status(400).send("Order must be a number");

        try {
            const workoutExercise = await WorkoutExerciseService.getWorkoutExerciseById(userId, workoutExerciseId, false, workoutId);
            if (!workoutExercise) return res.status(404).send("WorkoutExercise not found");

            const set = await SetService.createSet(userId, workoutExerciseId, reps, weight, type, repUnit, setTime, order);

            return res.status(201).json(set);
        } catch (error) {
            return next(error);
        }
    }

    changeSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.body) return res.status(400).send("Bad Request");

        const userId = req.userId;
        const setId: string = req.params.setId ?? req.params.id;
        const workoutId = req.params.workoutId as string | undefined;
        const workoutExerciseId = req.params.workoutExerciseId as string | undefined;

        if (!setId) return res.status(400).send("Bad Request");

        const { type, repUnit } = req.body;
        const reps = req.body.reps == null ? undefined : Number(req.body.reps);
        const weight = req.body.weight == null ? undefined : Number(req.body.weight);
        const setTime = req.body.setTime == null ? undefined : Number(req.body.setTime);
        const order = req.body.order == null ? undefined : Number(req.body.order);

        if (req.body.reps != null && !Number.isInteger(reps)) return res.status(400).send("Reps must be a number");
        if (req.body.weight != null && !Number.isFinite(weight)) return res.status(400).send("Weight must be a number");
        if (req.body.setTime != null && !Number.isInteger(setTime)) return res.status(400).send("Set time must be a number");
        if (req.body.order != null && !Number.isInteger(order)) return res.status(400).send("Order must be a number");
        if (reps == null && weight == null && type == null && repUnit == null && setTime == null && order == null) return res.status(400).send("Bad Request");

        try {
            const set = await SetService.getSetById(userId, setId, workoutExerciseId, workoutId);
            if (!set) return res.status(404).send("Set not found");

            const updatedSet = await SetService.changeSet(userId, setId, reps, weight, type, repUnit, setTime, order);

            return res.status(200).json(updatedSet);
        } catch (error) {
            return next(error);
        }
    }

    deleteSet = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const setId: string = req.params.setId ?? req.params.id;
        const workoutId = req.params.workoutId as string | undefined;
        const workoutExerciseId = req.params.workoutExerciseId as string | undefined;

        if (!setId) return res.status(400).send("Bad Request");

        try {
            const set = await SetService.getSetById(userId, setId, workoutExerciseId, workoutId);
            if (!set) return res.status(404).send("Set not found");

            await SetService.deleteSet(userId, setId);

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}

export default new SetController();
