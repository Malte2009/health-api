import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    userId?: string;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    const authHeader = req.headers['authorization'];

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.cookies?.token) {
        token = req.cookies.token; // Use cookie if available
    }

    if (!token) return res.status(401).send('Authentication required');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};
