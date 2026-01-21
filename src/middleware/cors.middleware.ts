import { Request, Response, NextFunction} from "express";

export default function cors(req: Request, res: Response, next: NextFunction) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || [];
    const origin = req.headers.origin;

    // In development mode, still check allowed origins but allow localhost variants
    if (process.env.NODE_ENV === "development") {
        const devAllowedOrigins = [
            ...allowedOrigins,
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173'
        ];

        if (origin && devAllowedOrigins.includes(origin)) {
            setHeaders(req, res);
        } else if (!origin) {
            // Allow requests without origin (e.g., Postman, curl) only in dev
            setHeaders(req, res);
        } else {
            return res.status(403).send("Forbidden: Origin not allowed");
        }

        if (req.method === "OPTIONS") return res.sendStatus(204);

        return next();
    }

    if (!origin) {
        return res.status(403).send("Forbidden");
    }

    if (allowedOrigins.includes(origin)) {
        setHeaders(req, res);

        if (req.method === "OPTIONS") return res.sendStatus(204);


        return next();
    }

    return res.status(403).send("Forbidden");
}


function setHeaders(req: Request, res: Response) {
    const origin = req.headers.origin || "";

    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
}