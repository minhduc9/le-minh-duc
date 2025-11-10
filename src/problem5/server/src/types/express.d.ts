import { Request } from "express";

import { Request } from "express";

export interface AuthenticatedRequest extends Request {
    userId?: string;
}
