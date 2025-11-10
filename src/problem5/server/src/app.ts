import express from "express";
import indexRouter from "./routes/index.route";
import { AppDataSource } from "./libs/data-source";

const app = express();

AppDataSource.initialize()
    .then(() => {
        console.log("PostgreSQL connected via TypeORM");
        app.use("/", indexRouter);

        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
    });
