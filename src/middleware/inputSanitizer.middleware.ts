import { Request, Response, NextFunction } from 'express';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    // Sanitize strings to prevent basic XSS
    const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };
    
    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    next();
};