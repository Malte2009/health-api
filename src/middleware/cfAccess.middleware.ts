import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN
const AUD_TAGS = (process.env.CF_AUD_TAGS || "").split(",") as [string, ...string[]];

const CERTS_URL = `https://${TEAM_DOMAIN}/cdn-cgi/access/certs`;


const client = jwksClient({
    jwksUri: CERTS_URL,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10,
});

// Extend Express Request to include cfUser
declare global {
    namespace Express {
        interface Request {
            cfUser?: {
                email: string;
                sub: string;
            };
        }
    }
}

export default async function validateCFAccess(req: Request, res: Response, next: NextFunction) {
    // Skip validation in development mode
    if (process.env.NODE_ENV === "development") {
        // In dev, set a mock user or skip entirely
        req.cfUser = {
            email: "dev@localhost",
            sub: "dev-user",
        };
        return next();
    }

    // 1. Extract token from cookie or header
    const token =
        req.cookies?.["CF_Authorization"] ||
        req.headers?.["cf-access-jwt-assertion"];

    if (!token) {
        return res.status(401).json({ error: "No Access token" });
    }

    try {
        // 2. Get kid from token header
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || !decoded.header?.kid) {
            return res.status(401).json({ error: "Invalid token format" });
        }
        const kid = decoded.header.kid;

        // 3. Fetch matching public key
        let key;
        try {
            key = await client.getSigningKey(kid);
        } catch (jwksError: any) {
            console.error(`Failed to fetch signing key from ${CERTS_URL}:`, jwksError.message);
            return res.status(401).json({ error: "Failed to fetch signing keys" });
        }
        const publicKey = key.getPublicKey();

        // 4. Verify token (validates signature, audience, issuer, and expiration)
        const payload = jwt.verify(token, publicKey, {
            algorithms: ["RS256"],
            audience: AUD_TAGS,
            issuer: `https://${TEAM_DOMAIN}`,
        }) as jwt.JwtPayload;

        // 5. Attach user to request
        req.cfUser = {
            email: payload.email as string,
            sub: payload.sub as string,
        };

        next();
    } catch (err: any) {
        console.error("CF Access validation error:", err.message || err);
        return res.status(401).json({ error: "Invalid token" });
    }
}

