import http from "node:http";
import { Server, type ServerOptions } from "socket.io";

let io: Server | null = null;

const DEFAULT_SOCKET_OPTIONS: Partial<ServerOptions> = {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
};

export function initializeSocketServer(
    server: http.Server,
    options?: ServerOptions,
) {
    if (io) {
        return io;
    }

    io = new Server(server, {
        ...DEFAULT_SOCKET_OPTIONS,
        ...(options ?? {}),
    });

    io.on("connection", (socket) => {
        socket.on("join-note", ({ noteId }: { noteId?: string }) => {
            if (!noteId) {
                return;
            }
            socket.join(noteId);
        });

        socket.on("leave-note", ({ noteId }: { noteId?: string }) => {
            if (!noteId) {
                return;
            }
            socket.leave(noteId);
        });

        socket.on("disconnect", () => {
            socket.rooms.clear();
        });
    });

    return io;
}

export function getSocketServer() {
    return io;
}
