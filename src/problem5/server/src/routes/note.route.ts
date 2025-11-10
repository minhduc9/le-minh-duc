import { Router } from "express";
import { NoteController } from "../controllers/note.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const noteController = new NoteController();

router.post("/", authenticate, noteController.createNote);
router.get("/", authenticate, noteController.getNotes);
router.get("/:id", authenticate, noteController.getNoteById);
router.put("/:id", authenticate, noteController.updateNote);
router.delete("/:id", authenticate, noteController.deleteNote);
router.post("/:id/share", authenticate, noteController.shareNote);
router.delete("/:id/share/:userId", authenticate, noteController.unshareNote);

export default router;
