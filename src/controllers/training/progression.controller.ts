import {NextFunction, Response} from 'express';
import {AuthenticatedRequest} from "../../middleware/auth.middleware";
import ProgressionService from "../../services/training/progression.service";



export async function getProgression(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
        const { exerciseId } = req.params;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!exerciseId) return res.status(400).json({ message: "exerciseId is not valid" });

        const logs = await ProgressionService.getProgression(userId, exerciseId);

        return res.status(200).json(logs);
    } catch (error) {
        next(error)
    }
}

