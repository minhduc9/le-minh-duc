import { Router } from "express";
import { UserController } from "../controllers/user.controller";

const router = Router();
const userController = new UserController();

router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.delete("/:id", userController.delete);
router.put("/:id", userController.update);

export default router;
