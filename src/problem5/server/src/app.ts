import http from "node:http";
import express, { NextFunction, Request, Response } from "express";
import indexRouter from "./routes/index.route";
import { AppDataSource } from "./libs/data-source";
import { HttpError } from "./utils/errors";
import { initializeSocketServer } from "./libs/socket";
import { initializeNoteProcessing } from "./services/note.process";

const app = express();
const server = http.createServer(app);

app.use(express.json());

AppDataSource.initialize()
    .then(() => {
        console.log("PostgreSQL connected via TypeORM");
        initializeSocketServer(server);
        initializeNoteProcessing();
        app.use("/", indexRouter);

        app.use(
            (err: Error, req: Request, res: Response, next: NextFunction) => {
                if (err instanceof HttpError) {
                    return res
                        .status(err.statusCode)
                        .json({ message: err.message });
                }
                res.status(500).json({ message: "Something went wrong" });
            },
        );

        server.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
    });
