import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import ChartService, {
    ChartAggregation,
    ChartBucket,
    ChartRequestError,
} from "../../services/chart/chart.service";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const CHART_BUCKETS: ChartBucket[] = ["raw", "hour", "day", "week", "month"];
const CHART_AGGREGATIONS: ChartAggregation[] = ["avg", "sum", "min", "max", "count", "latest"];

const parseDateBoundary = (value: unknown, boundary: "start" | "end"): Date | null => {
    if (typeof value !== "string" || value.trim().length === 0) return null;

    if (DATE_ONLY_REGEX.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        const parsed = boundary === "start"
            ? new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
            : new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

        if (
            parsed.getUTCFullYear() !== year ||
            parsed.getUTCMonth() !== month - 1 ||
            parsed.getUTCDate() !== day
        ) {
            return null;
        }

        return parsed;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isChartBucket = (value: unknown): value is ChartBucket => {
    return typeof value === "string" && CHART_BUCKETS.includes(value as ChartBucket);
};

const isChartAggregation = (value: unknown): value is ChartAggregation => {
    return typeof value === "string" && CHART_AGGREGATIONS.includes(value as ChartAggregation);
};

class ChartController {
    getDataPoints = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        try {
            return res.status(200).json(ChartService.getDataPoints());
        } catch (error) {
            return next(error);
        }
    };

    getSeries = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
        const userId = req.userId;
        const startDate = parseDateBoundary(req.body?.startDate, "start");
        const endDate = parseDateBoundary(req.body?.endDate, "end");

        if (!startDate) return res.status(400).send("Invalid startDate format");
        if (!endDate) return res.status(400).send("Invalid endDate format");
        if (!isChartBucket(req.body?.bucket)) return res.status(400).send("Invalid bucket");
        if (!Array.isArray(req.body?.series) || req.body.series.length === 0) {
            return res.status(400).send("series must contain at least one data point");
        }

        const series = [];

        for (const seriesRequest of req.body.series) {
            if (!seriesRequest || typeof seriesRequest !== "object") {
                return res.status(400).send("Invalid series entry");
            }

            const dataPointId = seriesRequest.dataPointId;
            const aggregation = seriesRequest.aggregation;

            if (typeof dataPointId !== "string" || dataPointId.trim().length === 0) {
                return res.status(400).send("series.dataPointId is required");
            }

            if (aggregation !== undefined && !isChartAggregation(aggregation)) {
                return res.status(400).send("Invalid series aggregation");
            }

            series.push({
                dataPointId,
                ...(aggregation ? { aggregation } : {}),
            });
        }

        try {
            const response = await ChartService.getSeries(userId, {
                startDate,
                endDate,
                bucket: req.body.bucket,
                series,
            });

            return res.status(200).json(response);
        } catch (error) {
            if (error instanceof ChartRequestError) {
                return res.status(400).send(error.message);
            }

            return next(error);
        }
    };
}

export default new ChartController();
