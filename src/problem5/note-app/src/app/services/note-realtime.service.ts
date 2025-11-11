import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';

export interface NoteRealtimeUpdate {
    noteId: string;
    actorId: string;
    lastVersion: number;
    updatedAt: string;
    patch?: {
        title?: string;
        content?: unknown;
    };
    state?: {
        title?: string;
        content?: unknown;
    };
}

@Injectable({
    providedIn: 'root',
})
export class NoteRealtimeService implements OnDestroy {
    private socket?: Socket;
    private readonly updates$ = new Subject<NoteRealtimeUpdate>();
    private readonly joinedRooms = new Set<string>();

    join(noteId: string) {
        const socket = this.ensureSocket();
        if (this.joinedRooms.has(noteId)) {
            return;
        }
        socket.emit('join-note', { noteId });
        this.joinedRooms.add(noteId);
    }

    leave(noteId: string) {
        if (!this.socket || !this.joinedRooms.has(noteId)) {
            return;
        }
        this.socket.emit('leave-note', { noteId });
        this.joinedRooms.delete(noteId);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.joinedRooms.clear();
    }

    onNoteUpdated(): Observable<NoteRealtimeUpdate> {
        return this.updates$.asObservable();
    }

    ngOnDestroy() {
        this.disconnect();
        this.updates$.complete();
    }

    private ensureSocket(): Socket {
        if (!this.socket) {
            this.socket = io('http://localhost:3000', {
                transports: ['websocket'],
            });

            this.socket.on('note:updated', (payload: NoteRealtimeUpdate) => {
                this.updates$.next(payload);
            });
        }

        return this.socket;
    }
}
