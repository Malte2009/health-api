import { NextFunction, Response } from 'express';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";
import { calculateBurnedCalories } from '../../utility/calculateBurnedCalories';
import WorkoutService from "../../services/training/workout.service";

class WorkoutController {
    getWorkouts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        const includeSets: boolean = req.query.includeSets === 'true';
        const includeWorkoutExercises: boolean = req.query.includeWorkoutExercises === 'true';

        try {
            const workouts = await WorkoutService.getWorkouts(userId, includeWorkoutExercises, includeSets);

            return res.status(200).json(workouts);
        } catch (error) {
            return next(error);
        }
    }
    getWorkoutById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const workoutId: string = (req.params.workoutId ?? req.params.id) as string;

        const includeSets: boolean = req.query.includeSets === 'true';
        const includeWorkoutExercises: boolean = req.query.includeWorkoutExercises === 'true';

        if (!workoutId) return res.status(400).send("Bad Request");

        try {
            const workout = await WorkoutService.getWorkoutById(userId, workoutId, includeWorkoutExercises, includeSets);

            if (!workout) return res.status(404).send("Workout not found");

            return res.status(200).json(workout);
        } catch (error) {
            return next(error);
        }
    }
    getWorkoutNames = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;

        try {
            const workoutNames = await WorkoutService.getWorkoutNames(userId);

            return res.status(200).json(workoutNames);
        } catch (error) {
            return next(error);
        }
    }
    createWorkout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const { name, type, notes, duration, avgHeartRate, pauses, pauseLength } = req.body;

        if (!name) return res.status(400).send("Bad Request");

        try {
            let caloriesBurned = await calculateBurnedCalories(userId, avgHeartRate, type, duration, pauses, pauseLength);

            const newWorkout = await WorkoutService.createWorkout(userId, name, type, notes, avgHeartRate, duration, pauses, pauseLength, caloriesBurned);

            return res.status(201).json(newWorkout);
        } catch (error) {
            return next(error);
        }
    }
    updateWorkout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const workoutId: string = (req.params.workoutId ?? req.params.id) as string;
        let { name, type, notes, duration, avgHeartRate, pauses, pauseLength } = req.body;

        if (!workoutId) return res.status(400).send("Bad Request");

        if (name == null && type == null && notes == null && duration == null && avgHeartRate == null && pauses == null && pauseLength == null) return res.status(400).send("Bad Request");

        try {
            const workout = await WorkoutService.getWorkoutById(userId, workoutId);
            if (!workout) return res.status(404).send("Workout not found");

            if (name == null && workout.name != null) name = workout.name;
            if (type == null && workout.type != null) type = workout.type;
            if (notes == null && workout.notes != null) notes = workout.notes;
            if (duration == null && workout.duration != null) duration = workout.duration;
            if (avgHeartRate == null && workout.avgHeartRate != null) avgHeartRate = workout.avgHeartRate;
            if (pauses == null && workout.pauses != null) pauses = workout.pauses;
            if (pauseLength == null && workout.pauseLength != null) pauseLength = workout.pauseLength;

            let caloriesBurned = await calculateBurnedCalories(userId, avgHeartRate, type, duration, pauses, pauseLength);

            const updatedWorkout = await WorkoutService.changeWorkout(userId, workoutId, name, type, notes, avgHeartRate, duration, pauses, pauseLength, caloriesBurned);

            return res.status(200).json(updatedWorkout);
        } catch (error) {
            return next(error);
        }
    }
    deleteWorkout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userId = req.userId;
        const workoutId: string = (req.params.workoutId ?? req.params.id) as string;

        if (!workoutId) return res.status(400).send("Bad Request");

        try {
            await WorkoutService.deleteWorkout(userId, workoutId);

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }
}

export default new WorkoutController();
