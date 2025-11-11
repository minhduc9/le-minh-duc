import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';

interface NoteListItem {
    id: string;
    title: string;
    ownerId: string;
    updatedAt: string;
    lastVersion: number;
    isPublic: boolean;
    accessRole: string;
    content?: unknown;
}

@Component({
    selector: 'app-home-page',
    standalone: true,
    imports: [CommonModule, HttpClientModule],
    templateUrl: './home-page.html',
    styleUrls: ['./home-page.css'],
})
export class HomePage implements OnInit {
    notes: NoteListItem[] = [];
    selectedNote?: NoteListItem;
    loading = false;
    errorMessage?: string;
    limit = 8;
    offset = 0;
    hasMore = true;

    constructor(
        private http: HttpClient,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        this.loadNotes();
    }

    private get token() {
        return localStorage.getItem('token') ?? '';
    }

    loadNotes() {
        if (!this.token) {
            this.errorMessage = 'Session expired. Please log in again.';
            this.cdr.markForCheck();
            return;
        }

        if (this.loading || !this.hasMore) {
            return;
        }

        this.loading = true;
        const params = new HttpParams()
            .set('limit', this.limit.toString())
            .set('offset', this.offset.toString())
            .set('includeContent', 'true');
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);

        this.http
            .get<NoteListItem[]>('http://localhost:3000/notes', {
                headers,
                params,
            })
            .subscribe({
                next: (batch) => {
                    this.notes = [...this.notes, ...batch];
                    this.selectedNote ??= batch[0];
                    this.hasMore = batch.length === this.limit;
                    this.offset += batch.length;
                    this.loading = false;
                    this.errorMessage = undefined;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.errorMessage = 'Unable to load notes right now.';
                    this.loading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    selectNote(note: NoteListItem) {
        this.selectedNote = note;
        this.router.navigate(['/note', note.id]);
    }

    formatDate(value: string) {
        const date = new Date(value);
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(date);
    }

    notePreview(note: NoteListItem) {
        const text = this.extractPlainText(note.content);
        if (!text) {
            return 'No written content yet.';
        }

        return text.length > 140 ? `${text.slice(0, 140)}…` : text;
    }

    private extractPlainText(content?: unknown): string {
        if (!content) {
            return '';
        }

        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content.join(' ');
        }

        if (typeof content === 'object') {
            const ops = (content as { ops?: Array<{ insert?: string }> }).ops ?? [];
            if (Array.isArray(ops) && ops.length) {
                return ops
                    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
                    .join(' ')
                    .trim();
            }
            return JSON.stringify(content);
        }

        return String(content);
    }
}
