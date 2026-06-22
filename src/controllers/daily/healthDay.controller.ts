import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import HealthDayService, { HealthDayIncludeOptions } from "../../services/daily/healthDay.service";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const INCLUDE_ALIASES: Record<string, keyof HealthDayIncludeOptions> = {
    dailyLog: "dailyLog",
    weather: "weather",
    bodyLogs: "bodyLogs",
    workouts: "workouts",
    "workouts.exercises": "workoutExercises",
    workoutExercises: "workoutExercises",
    "workouts.sets": "workoutSets",
    workoutSets: "workoutSets",
    mealLogs: "mealLogs",
    "mealLogs.foodLogs": "foodLogs",
    foodLogs: "foodLogs",
    "mealLogs.food": "food",
    food: "food",
    intakeLogs: "intakeLogs",
    sleepLogs: "sleepLogs",
    bloodPressureLogs: "bloodPressureLogs",
    symptomLogs: "symptomLogs",
    "symptomLogs.pictures": "symptomPictures",
    symptomPictures: "symptomPictures",
    syncopeLogs: "syncopeLogs",
    hrvRecordings: "hrvRecordings",
    "hrvRecordings.windows": "hrvWindows",
    hrvWindows: "hrvWindows",
    "hrvRecordings.metrics": "hrvMetrics",
    hrvMetrics: "hrvMetrics",
};

const BOOLEAN_INCLUDE_PARAMS: Record<string, keyof HealthDayIncludeOptions> = {
    includeDailyLog: "dailyLog",
    includeWeather: "weather",
    includeBodyLogs: "bodyLogs",
    includeWorkouts: "workouts",
    includeWorkoutExercises: "workoutExercises",
    includeWorkoutSets: "workoutSets",
    includeMealLogs: "mealLogs",
    includeFoodLogs: "foodLogs",
    includeFood: "food",
    includeIntakeLogs: "intakeLogs",
    includeSleepLogs: "sleepLogs",
    includeBloodPressureLogs: "bloodPressureLogs",
    includeSymptomLogs: "symptomLogs",
    includeSymptomPictures: "symptomPictures",
    includeSyncopeLogs: "syncopeLogs",
    includeHrvRecordings: "hrvRecordings",
    includeHrvWindows: "hrvWindows",
    includeHrvMetrics: "hrvMetrics",
};

const ALL_INCLUDE_OPTIONS: Array<keyof HealthDayIncludeOptions> = [
    "dailyLog",
    "weather",
    "bodyLogs",
    "workouts",
    "workoutExercises",
    "workoutSets",
    "mealLogs",
    "foodLogs",
    "food",
    "intakeLogs",
    "sleepLogs",
    "bloodPressureLogs",
    "symptomLogs",
    "symptomPictures",
    "syncopeLogs",
    "hrvRecordings",
    "hrvWindows",
    "hrvMetrics",
];

const parseDateOnly = (value: unknown): Date | null => {
    if (typeof value !== "string" || !DATE_ONLY_REGEX.test(value)) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }

    return parsed;
};

const parseIncludeOptions = (req: AuthenticatedRequest): HealthDayIncludeOptions | null => {
    const include: HealthDayIncludeOptions = {};
    const includeParam = req.query.include;

    if (req.query.includeData === "true") {
        for (const option of ALL_INCLUDE_OPTIONS) {
            include[option] = true;
        }
    }

    if (typeof includeParam === "string" && includeParam.trim().length > 0) {
        const tokens = includeParam.split(",").map(token => token.trim()).filter(Boolean);

        for (const token of tokens) {
            const option = INCLUDE_ALIASES[token];
            if (!option) return null;
            include[option] = true;
        }
    }

    for (const [queryParam, option] of Object.entries(BOOLEAN_INCLUDE_PARAMS)) {
        if (req.query[queryParam] === "true") {
            include[option] = true;
        }
    }

    return include;
};

const getIncludeOptionsOrRespond = (req: AuthenticatedRequest, res: Response): HealthDayIncludeOptions | null => {
    const include = parseIncludeOptions(req);
    if (!include) {
        res.status(400).send("Invalid include option");
        return null;
    }

    return include;
};

const parseRequiredDate = (value: unknown, res: Response, fieldName = "date"): Date | null => {
    const date = parseDateOnly(value);
    if (!date) {
        res.status(400).send(`Invalid ${fieldName} format. Use YYYY-MM-DD`);
        return null;
    }

    return date;
};

class HealthDayController {
    getHealthDays = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const include = getIncludeOptionsOrRespond(req, res);
        if (!include) return;

        let date: Date | undefined;
        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (req.query.date) {
            const parsedDate = parseRequiredDate(req.query.date, res);
            if (!parsedDate) return;
            date = parsedDate;
        }

        if (req.query.startDate) {
            const parsedStartDate = parseRequiredDate(req.query.startDate, res, "startDate");
            if (!parsedStartDate) return;
            startDate = parsedStartDate;
        }

        if (req.query.endDate) {
            const parsedEndDate = parseRequiredDate(req.query.endDate, res, "endDate");
            if (!parsedEndDate) return;
            endDate = parsedEndDate;
        }

        try {
            const healthDays = await HealthDayService.getHealthDays(userId, {
                date,
                startDate,
                endDate,
                include,
            });

            return res.status(200).json(healthDays);
        } catch (error) {
            return next(error);
        }
    };

    getHealthDayById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const { id } = req.params;
        const include = getIncludeOptionsOrRespond(req, res);
        if (!include) return;

        if (!id) return res.status(400).send("id is required");

        try {
            const healthDay = await HealthDayService.getHealthDayById(userId, id, { include });
            if (!healthDay) return res.status(404).send("HealthDay not found");

            return res.status(200).json(healthDay);
        } catch (error) {
            return next(error);
        }
    };

    getHealthDayByDate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const date = parseRequiredDate(req.params.date, res);
        const include = getIncludeOptionsOrRespond(req, res);

        if (!date || !include) return;

        try {
            const healthDay = await HealthDayService.getHealthDayByDate(userId, date, { include });
            if (!healthDay) return res.status(404).send("HealthDay not found");

            return res.status(200).json(healthDay);
        } catch (error) {
            return next(error);
        }
    };

    createHealthDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const date = parseRequiredDate(req.body?.date, res);
        const include = getIncludeOptionsOrRespond(req, res);

        if (!date || !include) return;

        try {
            const healthDay = await HealthDayService.createHealthDay(userId, { date }, { include });
            return res.status(201).json(healthDay);
        } catch (error) {
            if ((error as any).code === "P2002") {
                return res.status(409).send("HealthDay for this date already exists");
            }

            return next(error);
        }
    };

    updateHealthDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const { id } = req.params;
        const include = getIncludeOptionsOrRespond(req, res);
        if (!include) return;

        if (!id) return res.status(400).send("id is required");
        if (req.body?.date == null) return res.status(400).send("date is required");

        const date = parseRequiredDate(req.body.date, res);
        if (!date) return;

        try {
            const healthDay = await HealthDayService.updateHealthDay(userId, id, { date }, { include });
            return res.status(200).json(healthDay);
        } catch (error) {
            if ((error as Error).message === "HEALTH_DAY_NOT_FOUND") {
                return res.status(404).send("HealthDay not found");
            }

            if ((error as any).code === "P2002") {
                return res.status(409).send("HealthDay for this date already exists");
            }

            return next(error);
        }
    };

    deleteHealthDay = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const { id } = req.params;

        if (!id) return res.status(400).send("id is required");

        try {
            await HealthDayService.deleteHealthDay(userId, id);
            return res.status(204).send();
        } catch (error) {
            if ((error as Error).message === "HEALTH_DAY_NOT_FOUND") {
                return res.status(404).send("HealthDay not found");
            }

            return next(error);
        }
    };
}

export default new HealthDayController();
