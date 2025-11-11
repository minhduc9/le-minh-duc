import { NextFunction, Response } from "express";
import { NoteService } from "../services/note.service";
import {
    createNoteSchema,
    updateNoteSchema,
    shareNoteSchema,
    listNotesSchema,
} from "../types/note.types";
import { AuthenticatedRequest } from "../types/express";

export class NoteController {
    private readonly noteService: NoteService;

    constructor() {
        this.noteService = new NoteService();
    }

    createNote = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const validatedData = createNoteSchema.parse(req.body);
            const userId = req.userId!;
            const note = await this.noteService.createNote(
                userId,
                validatedData,
            );
            res.status(201).json(note);
        } catch (error) {
            next(error);
        }
    };

    getNoteById = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { id } = req.params;
            const userId = req.userId!;
            const note = await this.noteService.getNoteById(id, userId);
            res.status(200).json(note);
        } catch (error) {
            next(error);
        }
    };

    getNotes = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const userId = req.userId!;
            const query = listNotesSchema.parse(req.query);
            const notes = await this.noteService.getNotes(userId, query);
            res.status(200).json(notes);
        } catch (error) {
            next(error);
        }
    };

    updateNote = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { id } = req.params;
            const userId = req.userId!;
            const validatedData = updateNoteSchema.parse(req.body);
            const note = await this.noteService.updateNote(
                id,
                userId,
                validatedData,
            );
            res.status(200).json(note);
        } catch (error) {
            next(error);
        }
    };

    deleteNote = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { id } = req.params;
            const userId = req.userId!;
            const result = await this.noteService.deleteNote(id, userId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    shareNote = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { id } = req.params;
            const ownerId = req.userId!;
            const validatedData = shareNoteSchema.parse(req.body);
            const noteShare = await this.noteService.shareNote(
                id,
                ownerId,
                validatedData,
            );
            res.status(201).json(noteShare);
        } catch (error) {
            next(error);
        }
    };

    unshareNote = async (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { id, email } = req.params;
            const ownerId = req.userId!;
            const result = await this.noteService.unshareNote(
                id,
                ownerId,
                email,
            );
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
