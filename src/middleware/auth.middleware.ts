import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    userId: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
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

        if (typeof decoded !== 'object' || !decoded || !decoded.userId) return res.status(401).send("Invalid token payload");

        const userId = decoded.userId;

        if (!userId) return res.status(401).send('Invalid User ID in token');

        (req as AuthenticatedRequest).userId = userId;

        return next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).send('Token has expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).send('Invalid token');
        } else {
            return res.status(500).send('Internal server error');
        }
    }
};
