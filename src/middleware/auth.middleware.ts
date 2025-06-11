import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    userId?: number;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    const authHeader = req.headers['authorization'];

    if (!authHeader && !req.cookies?.token) return res.status(401).send('Unauthorized');

    const token: string = authHeader?.split(' ')[1] || req.cookies?.token;

    if (!token) return res.status(401).send('Token missing');

    console.log(token);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
