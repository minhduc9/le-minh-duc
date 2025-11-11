import type { JobsOptions, Job, Queue, QueueEvents } from "bullmq";
import {
    createQueue,
    createQueueEvents,
    createWorker,
    enqueue,
} from "../config/bullmq";
import { AppDataSource } from "../libs/data-source";
import { Note } from "../models/note.model";
import { UpdateNoteInput } from "../types/note.types";
import { getSocketServer } from "../libs/socket";

const NOTE_UPDATE_QUEUE_NAME = "note-updates";

let noteUpdateQueue: Queue | null = null;
let noteUpdateEvents: QueueEvents | null = null;
let initialized = false;

export type UpdateNotePayload = Omit<UpdateNoteInput, "clientVersion">;

export type UpdateNoteJobData = {
    noteId: string;
    userId: string;
    changes: UpdateNotePayload;
    clientVersion?: number;
};

export type UpdateNoteJobResult = {
    noteId: string;
    lastVersion: number;
    updatedAt: Date;
    title: string;
    content: unknown;
};

export async function initializeNoteProcessing() {
    if (initialized) {
        return;
    }

    noteUpdateQueue = createQueue(NOTE_UPDATE_QUEUE_NAME);
    noteUpdateEvents = createQueueEvents(NOTE_UPDATE_QUEUE_NAME);
    createWorker(NOTE_UPDATE_QUEUE_NAME, handleNoteUpdate, { concurrency: 1 });
    initialized = true;
}

export function getNoteUpdateQueue() {
    if (!noteUpdateQueue) {
        throw new Error("Note update queue is not initialized");
    }
    return noteUpdateQueue;
}

export function getNoteUpdateQueueEvents() {
    if (!noteUpdateEvents) {
        throw new Error("Note update queue events are not initialized");
    }
    return noteUpdateEvents;
}

export async function enqueueNoteUpdate(
    data: UpdateNoteJobData,
    opts?: JobsOptions,
) {
    return enqueue(getNoteUpdateQueue(), NOTE_UPDATE_QUEUE_NAME, data, opts);
}

async function handleNoteUpdate(job: Job<UpdateNoteJobData>) {
    const { noteId, userId, changes, clientVersion } = job.data;
    const noteRepository = AppDataSource.getRepository(Note);
    const note = await noteRepository.findOneBy({ id: noteId });

    if (!note) {
        throw new Error(`Cannot process update for missing note ${noteId}`);
    }

    if (Object.prototype.hasOwnProperty.call(changes, "title")) {
        note.title = changes.title ?? note.title;
    }

    if (Object.prototype.hasOwnProperty.call(changes, "content")) {
        note.content = mergeContent(note.content, changes.content);
    }

    const serverVersion = note.lastVersion ?? 0;
    note.lastVersion =
        Math.max(serverVersion, clientVersion ?? serverVersion) + 1;

    const savedNote = await noteRepository.save(note);

    const io = getSocketServer();
    if (io) {
        io.to(noteId).emit("note:updated", {
            noteId: savedNote.id,
            actorId: userId,
            lastVersion: savedNote.lastVersion,
            updatedAt: savedNote.updatedAt,
            patch: {
                title: changes.title,
                content: changes.content,
            },
            state: {
                title: savedNote.title,
                content: savedNote.content,
            },
        });
    }

    return {
        noteId: savedNote.id,
        lastVersion: savedNote.lastVersion,
        updatedAt: savedNote.updatedAt,
        title: savedNote.title,
        content: savedNote.content,
    };
}

function mergeContent(current: unknown, incoming: unknown): unknown {
    if (incoming === undefined) {
        return current;
    }

    if (isPlainObject(current) && isPlainObject(incoming)) {
        const merged: Record<string, unknown> = {
            ...current,
        };

        for (const [key, value] of Object.entries(incoming)) {
            merged[key] = mergeContent(
                (current as Record<string, unknown>)[key],
                value,
            );
        }

        return merged;
    }

    return incoming;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}
