import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface NoteDetail {
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
    selector: 'app-note-page',
    standalone: true,
    imports: [CommonModule, HttpClientModule],
    templateUrl: './note-page.html',
    styleUrls: ['./note-page.css'],
})
export class NotePage implements OnInit {
    note?: NoteDetail;
    loading = false;
    errorMessage?: string;
    renderedContent?: SafeHtml;

    constructor(
        private readonly http: HttpClient,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly sanitizer: DomSanitizer,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    ngOnInit() {
        const noteId = this.route.snapshot.paramMap.get('id');
        if (!noteId) {
            this.errorMessage = 'Note not found.';
            this.cdr.markForCheck();
            return;
        }

        this.loadNote(noteId);
    }

    goBack() {
        this.router.navigate(['/home']);
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

    private get token() {
        return localStorage.getItem('token') ?? '';
    }

    private loadNote(noteId: string) {
        if (!this.token) {
            this.errorMessage = 'Session expired. Please log in again.';
            this.cdr.markForCheck();
            return;
        }

        this.loading = true;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);

        this.http
            .get<NoteDetail>(`http://localhost:3000/notes/${noteId}`, { headers })
            .subscribe({
                next: (note) => {
                    this.note = note;
                    const markdownSource = this.getMarkdownSource(note.content);
                    this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(
                        this.convertMarkdown(markdownSource),
                    );
                    this.loading = false;
                    this.errorMessage = undefined;
                    this.cdr.markForCheck();
                },
                error: () => {
                    this.errorMessage = 'Unable to load the note right now.';
                    this.loading = false;
                    this.cdr.markForCheck();
                },
            });
    }

    private getMarkdownSource(content?: unknown): string {
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
            return '';
        }

        return String(content);
    }

    private convertMarkdown(text: string): string {
        if (!text.trim()) {
            return '<p class="empty-state">No written content yet.</p>';
        }

        const normalize = text.replace(/\r\n?/g, '\n');
        const lines = normalize.split('\n');
        const htmlParts: string[] = [];
        let inList = false;
        let inCodeBlock = false;
        const codeLines: string[] = [];

        const closeList = () => {
            if (inList) {
                htmlParts.push('</ul>');
                inList = false;
            }
        };

        const flushCodeBlock = () => {
            if (inCodeBlock) {
                htmlParts.push(
                    `<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`,
                );
                codeLines.length = 0;
                inCodeBlock = false;
            }
        };

        for (const rawLine of lines) {
            if (rawLine.startsWith('```')) {
                if (inCodeBlock) {
                    flushCodeBlock();
                } else {
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeLines.push(rawLine);
                continue;
            }

            const trimmed = rawLine.trim();

            if (!trimmed) {
                closeList();
                htmlParts.push('<br>');
                continue;
            }

            const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
            if (headingMatch) {
                closeList();
                const level = headingMatch[1].length;
                htmlParts.push(
                    `<h${level}>${this.formatInline(headingMatch[2])}</h${level}>`,
                );
                continue;
            }

            if (trimmed.startsWith('> ')) {
                closeList();
                htmlParts.push(
                    `<blockquote>${this.formatInline(trimmed.slice(2))}</blockquote>`,
                );
                continue;
            }

            if (/^[-*+]\s+/.test(trimmed)) {
                if (!inList) {
                    htmlParts.push('<ul>');
                    inList = true;
                }
                htmlParts.push(
                    `<li>${this.formatInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`,
                );
                continue;
            }

            closeList();
            htmlParts.push(`<p>${this.formatInline(trimmed)}</p>`);
        }

        flushCodeBlock();
        closeList();

        return htmlParts.join('');
    }

    private formatInline(value: string): string {
        if (!value) {
            return '';
        }

        let result = this.escapeHtml(value);
        result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
        result = result.replace(/\*(?!\*)(.+?)\*/g, '<em>$1</em>');
        result = result.replace(/_(?!_)(.+?)_/g, '<em>$1</em>');
        result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
        result = result.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a target="_blank" rel="noopener noreferrer" href="$2">$1</a>',
        );
        return result;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
