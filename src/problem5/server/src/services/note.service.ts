import { Brackets, Repository } from "typeorm";
import { AppDataSource } from "../libs/data-source";
import { Note } from "../models/note.model";
import {
    CreateNoteInput,
    ShareNoteInput,
    UpdateNoteInput,
    ListNotesInput,
    NoteShareListItem,
    ShareUpdateInput,
} from "../types/note.types";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from "../utils/errors";
import { NoteShare, Role } from "../models/noteShare.model";
import { User } from "../models/user.model";
import { enqueueNoteUpdate, getNoteUpdateQueueEvents } from "./note.process";

type NoteListItem = Pick<
    Note,
    "id" | "title" | "ownerId" | "updatedAt" | "lastVersion" | "isPublic"
> & {
    content?: Note["content"];
    accessRole: Role | "owner";
};

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

    async getNoteById(
        noteId: string,
        userId: string,
    ): Promise<Note & { accessRole: Role | "owner" }> {
        const qb = this.noteRepository
            .createQueryBuilder("note")
            .leftJoin(
                NoteShare,
                "share",
                "share.noteId = note.id AND share.userId = :userId",
                { userId },
            )
            .where("note.id = :noteId", { noteId })
            .addSelect("share.role", "note_share_role");

        const { entities, raw } = await qb.getRawAndEntities();
        const note = entities[0];

        if (!note) {
            throw new NotFoundError("Note not found");
        }

        const accessRole =
            note.ownerId === userId
                ? ("owner" as const)
                : ((raw[0]?.note_share_role ?? null) as Role | null);

        if (!accessRole) {
            throw new ForbiddenError("You do not have access to this note");
        }

        Object.assign(note, { accessRole });
        return note as Note & { accessRole: Role | "owner" };
    }

    async getNotes(
        userId: string,
        params: ListNotesInput,
    ): Promise<NoteListItem[]> {
        const { limit, offset, includeShared, includeContent, search } = params;

        const qb = this.noteRepository
            .createQueryBuilder("note")
            .leftJoin(
                NoteShare,
                "share",
                "share.noteId = note.id AND share.userId = :userId",
                { userId },
            )
            .select([
                "note.id",
                "note.title",
                "note.ownerId",
                "note.updatedAt",
                "note.lastVersion",
                "note.isPublic",
            ])
            .addSelect("share.role", "note_share_role")
            .orderBy("note.updatedAt", "DESC")
            .skip(offset)
            .take(limit);

        if (includeContent) {
            qb.addSelect("note.content");
        }

        qb.where(
            new Brackets((expr) => {
                expr.where("note.ownerId = :userId", { userId });

                if (includeShared) {
                    expr.orWhere("share.id IS NOT NULL");
                }
            }),
        );

        if (search) {
            qb.andWhere("note.title ILIKE :search", {
                search: `%${search}%`,
            });
        }

        const { entities, raw } = await qb.getRawAndEntities();

        return entities.map((note, index) => {
            const shareRole = (raw[index]?.note_share_role ??
                null) as Role | null;
            const accessRole =
                note.ownerId === userId
                    ? ("owner" as const)
                    : (shareRole ?? "view");

            const payload: NoteListItem = {
                id: note.id,
                title: note.title,
                ownerId: note.ownerId,
                updatedAt: note.updatedAt,
                lastVersion: note.lastVersion,
                isPublic: note.isPublic,
                accessRole,
            };

            if (includeContent) {
                payload.content = note.content;
            }

            return payload;
        });
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

        const { clientVersion, ...changes } = data;
        const version = clientVersion ?? note.lastVersion;
        const job = await enqueueNoteUpdate({
            noteId,
            userId,
            changes,
            clientVersion: version,
        });

        await job.waitUntilFinished(getNoteUpdateQueueEvents());

        const updatedNote = await this.noteRepository.findOne({
            where: { id: noteId },
        });

        if (!updatedNote) {
            throw new NotFoundError("Note not found after update");
        }

        return updatedNote;
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

        const userToShareWith = await this.userRepository
            .createQueryBuilder("user")
            .where("LOWER(user.email) = :email", { email: data.email })
            .getOne();

        if (!userToShareWith) {
            throw new NotFoundError("User to share with not found");
        }

        const existingShare = await this.noteShareRepository.findOne({
            where: { noteId, userId: userToShareWith.id },
        });

        if (existingShare) {
            existingShare.role = data.role;
            await this.noteShareRepository.save(existingShare);
            return existingShare;
        }

        const noteShare = this.noteShareRepository.create({
            noteId,
            userId: userToShareWith.id,
            role: data.role,
        });

        await this.noteShareRepository.save(noteShare);
        return noteShare;
    }

    async modifyNoteShare(
        noteId: string,
        ownerId: string,
        userEmail: string,
        data: ShareUpdateInput,
    ) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId, ownerId },
        });

        if (!note) {
            throw new NotFoundError("Note not found or you are not the owner");
        }

        const normalizedEmail = userEmail.trim().toLowerCase();
        const userToShareWith = await this.userRepository
            .createQueryBuilder("user")
            .where("LOWER(user.email) = :email", { email: normalizedEmail })
            .getOne();

        if (!userToShareWith) {
            throw new NotFoundError("User to share with not found");
        }

        const share = await this.noteShareRepository.findOne({
            where: { noteId, userId: userToShareWith.id },
        });

        if (!share) {
            throw new NotFoundError("Note is not shared with this user");
        }

        if (data.remove) {
            await this.noteShareRepository.remove(share);
            return { message: "Member removed successfully" };
        }

        if (!data.role) {
            throw new BadRequestError("Role is required when updating a share");
        }

        share.role = data.role;
        await this.noteShareRepository.save(share);
        return share;
    }

    async listNoteShares(noteId: string, ownerId: string) {
        const note = await this.noteRepository.findOne({
            where: { id: noteId, ownerId },
        });

        if (!note) {
            throw new NotFoundError("Note not found or you are not the owner");
        }

        const shares = await this.noteShareRepository.find({
            where: { noteId },
            relations: ["user"],
        });

        return shares.map<NoteShareListItem>((share) => ({
            id: share.id,
            email: share.user.email,
            name: share.user.name,
            role: share.role,
            createdAt: share.createdAt.toISOString(),
        }));
    }

}
