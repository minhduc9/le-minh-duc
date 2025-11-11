import cors, { CorsOptions } from "cors";
import "dotenv/config";

const envOrigin = process.env.CLIENT_ORIGIN?.trim();
const fallbackOrigin = "http://localhost:4200";
const allowedOrigins = [envOrigin ?? fallbackOrigin].filter(Boolean);

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
};

export const corsMiddleware = cors(corsOptions);
