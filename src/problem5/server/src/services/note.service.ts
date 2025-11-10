import { Repository } from "typeorm";
import { AppDataSource } from "../libs/data-source";
import { Note } from "../models/note.model";
import {
    CreateNoteInput,
    ShareNoteInput,
    UpdateNoteInput,
} from "../types/note.types";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { NoteShare } from "../models/noteShare.model";
import { User } from "../models/user.model";

export class NoteService {
    private readonly noteRepository: Repository<Note>;
    private readonly noteShareRepository: Repository<NoteShare>;
    private readonly userRepository: Repository<User>;

    constructor() {
        this.noteRepository = AppDataSource.getRepository(Note);
        this.noteShareRepository = AppDataSource.getRepository(NoteShare);
        this.userRepository = AppDataSource.getRepository(User);
    }

    async createNote(userId: string, data: CreateNoteInput) {
        const note = this.noteRepository.create({
            ...data,
            ownerId: userId,
        });

        await this.noteRepository.save(note);
        return note;
    }

    async getNoteById(noteId: string, userId: string) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId },
        });

        if (!note) {
            throw new NotFoundError("Note not found");
        }

        if (note.ownerId !== userId) {
            const share = await this.noteShareRepository.findOne({
                where: { noteId, userId },
            });

            if (!share) {
                throw new ForbiddenError("You do not have access to this note");
            }
        }

        return note;
    }

    async getNotes(userId: string) {
        const notes = await this.noteRepository.find({
            where: { ownerId: userId },
        });
        return notes;
    }

    async updateNote(noteId: string, userId: string, data: UpdateNoteInput) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId },
        });

        if (!note) {
            throw new NotFoundError("Note not found");
        }

        if (note.ownerId !== userId) {
            const share = await this.noteShareRepository.findOne({
                where: { noteId, userId, role: "edit" },
            });

            if (!share) {
                throw new ForbiddenError(
                    "You do not have permission to edit this note",
                );
            }
        }

        Object.assign(note, data);
        await this.noteRepository.save(note);
        return note;
    }

    async deleteNote(noteId: string, userId: string) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId, ownerId: userId },
        });

        if (!note) {
            throw new NotFoundError("Note not found or you are not the owner");
        }

        await this.noteRepository.remove(note);
        return { message: "Note deleted successfully" };
    }

    async shareNote(noteId: string, ownerId: string, data: ShareNoteInput) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId, ownerId },
        });

        if (!note) {
            throw new NotFoundError("Note not found or you are not the owner");
        }

        const userToShareWith = await this.userRepository.findOne({
            where: { id: data.userId },
        });

        if (!userToShareWith) {
            throw new NotFoundError("User to share with not found");
        }

        const existingShare = await this.noteShareRepository.findOne({
            where: { noteId, userId: data.userId },
        });

        if (existingShare) {
            existingShare.role = data.role;
            await this.noteShareRepository.save(existingShare);
            return existingShare;
        }

        const noteShare = this.noteShareRepository.create({
            noteId,
            userId: data.userId,
            role: data.role,
        });

        await this.noteShareRepository.save(noteShare);
        return noteShare;
    }

    async unshareNote(
        noteId: string,
        ownerId: string,
        userIdToUnshare: string,
    ) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId, ownerId },
        });

        if (!note) {
            throw new NotFoundError("Note not found or you are not the owner");
        }

        const share = await this.noteShareRepository.findOne({
            where: { noteId, userId: userIdToUnshare },
        });

        if (!share) {
            throw new NotFoundError("Note is not shared with this user");
        }

        await this.noteShareRepository.remove(share);
        return { message: "Note unshared successfully" };
    }
}
