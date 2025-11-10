import { Router } from "express";
import userRouter from "./user.route";
import noteRouter from "./note.route";

const router = Router();

router.use("/users", userRouter);
router.use("/notes", noteRouter);

export default router;
