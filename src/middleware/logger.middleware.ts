import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
	const timestamp = new Date().toISOString();
	const method = req.method;
	const url = req.url;
	const ip = req.ip || req.socket.remoteAddress;

	console.log(`[${timestamp}] ${method} request to ${url} from ${ip}`);
	next();
};
