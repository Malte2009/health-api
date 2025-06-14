import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
    status?: number;
    code?: string;
}

export const errorHandler = (
    error: CustomError, 
    req: Request, 
    res: Response, 
    next: NextFunction
) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log error details (for monitoring)
    console.error(`[${new Date().toISOString()}] ERROR:`, {
        message: error.message,
        stack: isDevelopment ? error.stack : 'Hidden in production',
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    // Determine error status
    let status = error.status || 500;
    let message = error.message;
    
    // Handle specific error types
    switch (error.name) {
        case 'ValidationError':
            status = 400;
            message = 'Invalid input data';
            break;
        case 'UnauthorizedError':
            status = 401;
            message = 'Authentication required';
            break;
        case 'JsonWebTokenError':
            status = 401;
            message = 'Invalid token';
            break;
        case 'TokenExpiredError':
            status = 401;
            message = 'Token expired';
            break;
        case 'PrismaClientKnownRequestError':
            status = 400;
            message = 'Database operation failed';
            break;
        default:
            if (!isDevelopment) {
                message = 'Internal Server Error';
            }
    }
    
    // Send error response
    res.status(status).json({
        error: {
            message,
            status,
            timestamp: new Date().toISOString(),
            path: req.url,
            ...(isDevelopment && { stack: error.stack })
        }
    });
};

// 404 Handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            status: 404,
            path: req.url,
            method: req.method
        }
    });
};