import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../types/express";
import { UnauthorizedError } from "../utils/errors";
import "dotenv/config";

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new UnauthorizedError("Access denied. No token provided."));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            sub: string;
        };
        req.userId = decoded.sub;
        next();
    } catch (error) {
        return next(new UnauthorizedError("Invalid token."));
    }
};
