import { Router } from "express";
import userRoutes from "./user.route";

const router = Router();

router.get("/", (req, res) => {
    res.send("Hello World!");
});

router.use("/users", userRoutes);

export default router;
