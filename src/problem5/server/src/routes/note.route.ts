import { Router } from "express";
import { NoteController } from "../controllers/note.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();
const noteController = new NoteController();

router.get("/public/:id", noteController.getPublicNote);
router.post("/", authenticate, noteController.createNote);
router.get("/", authenticate, noteController.getNotes);
router.get("/:id", authenticate, noteController.getNoteById);
router.put("/:id", authenticate, noteController.updateNote);
router.delete("/:id", authenticate, noteController.deleteNote);
router.get("/:id/share", authenticate, noteController.listShares);
router.post("/:id/share", authenticate, noteController.shareNote);
router.put("/:id/share/:email", authenticate, noteController.modifyShare);
router.patch("/:id/public", authenticate, noteController.toggleVisibility);

export default router;
