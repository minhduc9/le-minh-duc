import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NoteRealtimeService, NoteRealtimeUpdate } from '../services/note-realtime.service';

type ShareRole = 'view' | 'edit';
type AccessRole = ShareRole | 'owner';

interface NoteShareInfo {
    id: string;
    email: string;
    name: string;
    role: ShareRole;
    createdAt: string;
}

interface NoteDetail {
    id: string;
    title: string;
    ownerId: string;
    updatedAt: string;
    lastVersion: number;
    isPublic: boolean;
    accessRole: AccessRole;
    content?: unknown;
}

@Component({
    selector: 'app-note-page',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule],
    templateUrl: './note-page.html',
    styleUrls: ['./note-page.css'],
})
export class NotePage implements OnInit, OnDestroy {
    note?: NoteDetail;
    loading = false;
    errorMessage?: string;
    renderedContent?: SafeHtml;
    editing = false;
    titleInput = '';
    contentInput = '';
    editingPreview?: SafeHtml;
    saving = false;
    saveError?: string;
    collaborationMessage?: string;
    sharePanelOpen = false;
    shareListLoading = false;
    shareListError?: string;
    shareList?: NoteShareInfo[];
    shareEmail = '';
    shareRole: ShareRole = 'view';
    shareSubmitting = false;
    shareMessage?: string;
    shareError?: string;
    shareRoleOptions: ShareRole[] = ['view', 'edit'];
    shareUpdatingId?: string;
    shareRemovingId?: string;
    accessDeniedMessage?: string;
    visibilityMessage?: string;
    visibilityError?: string;
    togglingVisibility = false;

    private readonly currentUserId?: string;
    private noteId?: string;
    private updatesSub?: Subscription;
    private collaborationTimer?: ReturnType<typeof setTimeout>;
    private shareListSub?: Subscription;

    constructor(
        private readonly http: HttpClient,
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly sanitizer: DomSanitizer,
        private readonly realtime: NoteRealtimeService,
        private readonly cdr: ChangeDetectorRef
    ) {
        this.currentUserId = this.extractUserId();
    }

    ngOnInit() {
        this.noteId = this.route.snapshot.paramMap.get('id') ?? undefined;
        if (!this.noteId) {
            this.errorMessage = 'Note not found.';
            this.cdr.markForCheck();
            return;
        }

        this.realtime.join(this.noteId);
        this.updatesSub = this.realtime
            .onNoteUpdated()
            .subscribe((event) => this.handleRealtimeUpdate(event));

        this.loadNote(this.noteId);
    }

    ngOnDestroy() {
        if (this.noteId) {
            this.realtime.leave(this.noteId);
        }
        this.realtime.disconnect();
        this.updatesSub?.unsubscribe();
        this.shareListSub?.unsubscribe();
        if (this.collaborationTimer) {
            clearTimeout(this.collaborationTimer);
        }
    }

    goBack() {
        this.router.navigate(['/home']);
    }

    toggleSharePanel() {
        if (!this.note || this.note.accessRole !== 'owner') {
            return;
        }

        this.sharePanelOpen = !this.sharePanelOpen;
        if (this.sharePanelOpen) {
            this.loadShareList();
            this.shareMessage = undefined;
            this.shareError = undefined;
        }
        this.cdr.markForCheck();
    }

    closeSharePanel() {
        this.sharePanelOpen = false;
        this.cdr.markForCheck();
    }

    changeShareRole(share: NoteShareInfo, newRole: string) {
        if (this.shareUpdatingId || this.shareRemovingId) {
            return;
        }

        const normalizedRole = newRole as ShareRole;
        if (!this.shareRoleOptions.includes(normalizedRole)) {
            return;
        }

        if (share.role === normalizedRole) {
            return;
        }

        this.shareUpdatingId = share.id;
        this.shareError = undefined;
        this.shareMessage = undefined;
        this.modifyShare(share, { role: normalizedRole }, 'Role updated.');
    }

    removeShare(share: NoteShareInfo) {
        if (this.shareRemovingId) {
            return;
        }

        this.shareRemovingId = share.id;
        this.shareError = undefined;
        this.shareMessage = undefined;
        this.modifyShare(share, { remove: true }, 'Member removed.');
    }

    private modifyShare(
        share: NoteShareInfo,
        payload: { role?: ShareRole; remove?: boolean },
        successMessage: string
    ) {
        if (!this.noteId) {
            return;
        }

        if (!this.token) {
            this.shareError = 'Session expired. Please log in again.';
            this.shareMessage = undefined;
            this.shareUpdatingId = undefined;
            this.shareRemovingId = undefined;
            this.cdr.markForCheck();
            return;
        }

        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        const url = `http://localhost:3000/notes/${this.noteId}/share/${encodeURIComponent(
            share.email
        )}`;

        this.http
            .put<NoteShareInfo | { message?: string }>(url, payload, {
                headers,
            })
            .subscribe({
                next: () => {
                    this.shareUpdatingId = undefined;
                    this.shareRemovingId = undefined;
                    this.shareMessage = successMessage;
                    this.loadShareList();
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.shareUpdatingId = undefined;
                    this.shareRemovingId = undefined;
                    const fallback = payload.remove
                        ? 'Unable to remove member.'
                        : 'Unable to update role.';
                    this.shareError = this.parseErrorMessage(error, fallback);
                    this.cdr.markForCheck();
                },
            });
    }

    shareWithUser() {
        if (!this.noteId) {
            return;
        }

        const email = this.shareEmail.trim();
        if (!email) {
            this.shareError = 'Email is required to share a note.';
            this.shareMessage = undefined;
            this.cdr.markForCheck();
            return;
        }

        const normalizedEmail = email.toLowerCase();

        if (!this.token) {
            this.shareError = 'Session expired. Please log in again.';
            this.shareMessage = undefined;
            this.cdr.markForCheck();
            return;
        }

        this.shareSubmitting = true;
        this.shareError = undefined;
        this.shareMessage = undefined;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        const payload = { email: normalizedEmail, role: this.shareRole };

        this.http
            .post<NoteShareInfo>(`http://localhost:3000/notes/${this.noteId}/share`, payload, {
                headers,
            })
            .subscribe({
                next: () => {
                    this.shareSubmitting = false;
                    this.shareEmail = '';
                    this.shareRole = 'view';
                    this.shareMessage = 'Share invitation sent.';
                    this.loadShareList();
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.shareSubmitting = false;
                    this.shareError = this.parseErrorMessage(
                        error,
                        'Unable to share at the moment.'
                    );
                    this.cdr.markForCheck();
                },
            });
    }

    toggleVisibility() {
        if (!this.note || this.note.accessRole !== 'owner') {
            return;
        }

        if (!this.token) {
            this.visibilityError = 'Session expired. Please log in again.';
            this.visibilityMessage = undefined;
            this.cdr.markForCheck();
            return;
        }

        this.visibilityMessage = undefined;
        this.visibilityError = undefined;
        this.togglingVisibility = true;
        const headers = new HttpHeaders().set(
            'Authorization',
            `Bearer ${this.token}`,
        );
        const targetVisibility = !this.note.isPublic;

        this.http
            .patch<NoteDetail>(
                `http://localhost:3000/notes/${this.note.id}/public`,
                { isPublic: targetVisibility },
                { headers },
            )
            .subscribe({
                next: (updated) => {
                    this.togglingVisibility = false;
                    const normalized: NoteDetail = {
                        ...updated,
                        accessRole: this.note?.accessRole ?? 'owner',
                    };
                    this.syncNoteView(normalized);
                    this.visibilityMessage = updated.isPublic
                        ? 'Note is now public.'
                        : 'Note is now private.';
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.togglingVisibility = false;
                    if (error instanceof HttpErrorResponse && error.status === 403) {
                        this.visibilityError =
                            'You are not allowed to change visibility.';
                    } else {
                        this.visibilityError = this.parseErrorMessage(
                            error,
                            'Unable to update visibility right now.',
                        );
                    }
                    this.cdr.markForCheck();
                },
            });
    }

    startEditing() {
        if (!this.note) {
            return;
        }
        this.editing = true;
        this.saveError = undefined;
        this.titleInput = this.note.title;
        this.contentInput = this.getMarkdownSource(this.note.content);
        this.updateEditingPreview(this.contentInput);
        this.cdr.markForCheck();
    }

    cancelEditing() {
        this.editing = false;
        this.saveError = undefined;
        if (this.note) {
            this.syncNoteView(this.note);
        }
        this.cdr.markForCheck();
    }

    saveChanges() {
        if (!this.note) {
            return;
        }

        if (!this.titleInput.trim()) {
            this.saveError = 'Title is required.';
            this.cdr.markForCheck();
            return;
        }

        if (!this.token) {
            this.errorMessage = 'Session expired. Please log in again.';
            this.cdr.markForCheck();
            return;
        }

        this.accessDeniedMessage = undefined;
        this.saving = true;
        this.saveError = undefined;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        const payload = {
            title: this.titleInput.trim(),
            content: this.contentInput ?? '',
            clientVersion: this.note.lastVersion,
        };

        this.http
            .put<NoteDetail>(`http://localhost:3000/notes/${this.note.id}`, payload, {
                headers,
            })
            .subscribe({
                next: (updatedNote) => {
                    this.saving = false;
                    this.editing = false;
                    this.syncNoteView(updatedNote);
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.saving = false;
                    if (error instanceof HttpErrorResponse && error.status === 403) {
                        this.accessDeniedMessage = 'You are not allowed to edit this note.';
                        this.saveError = undefined;
                    } else {
                        this.saveError = 'Could not save changes. Please try again.';
                    }
                    this.cdr.markForCheck();
                },
            });
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

    formatRoleLabel(role: AccessRole) {
        switch (role) {
            case 'owner':
                return 'Owner';
            case 'view':
                return 'Viewer';
            case 'edit':
                return 'Editor';
            default:
                return role;
        }
    }

    private get token() {
        return localStorage.getItem('token') ?? '';
    }

    private extractUserId() {
        const token = this.token;
        if (!token) {
            return undefined;
        }

        try {
            const [, payload = ''] = token.split('.');
            const decoded = this.decodeBase64Url(payload);
            const parsed = JSON.parse(decoded) as { sub?: string };
            return parsed.sub;
        } catch {
            return undefined;
        }
    }

    private decodeBase64Url(segment: string) {
        const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (normalized.length % 4 || 4)) % 4;
        return atob(normalized.padEnd(normalized.length + padLength, '='));
    }

    private handleRealtimeUpdate(event: NoteRealtimeUpdate) {
        if (!this.note || event.noteId !== this.note.id) {
            return;
        }

        const updated: NoteDetail = {
            ...this.note,
            title: event.state?.title ?? event.patch?.title ?? this.note.title,
            content: event.state?.content ?? event.patch?.content ?? this.note.content,
            updatedAt: event.updatedAt ?? this.note.updatedAt,
            lastVersion: event.lastVersion ?? this.note.lastVersion,
        };

        const preserveInputs = this.editing;
        this.syncNoteView(updated, { preserveInputs });

        if (event.actorId !== this.currentUserId) {
            this.collaborationMessage = 'Updated by a collaborator just now.';
            if (this.collaborationTimer) {
                clearTimeout(this.collaborationTimer);
            }
            this.collaborationTimer = setTimeout(() => {
                this.collaborationMessage = undefined;
                this.cdr.markForCheck();
            }, 4000);
        }

        this.cdr.markForCheck();
    }

    private loadNote(noteId: string) {
        if (!this.token) {
            this.errorMessage = 'Session expired. Please log in again.';
            this.cdr.markForCheck();
            return;
        }

        this.loading = true;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);

        this.http.get<NoteDetail>(`http://localhost:3000/notes/${noteId}`, { headers }).subscribe({
            next: (note) => {
                this.syncNoteView(note);
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

    private loadShareList() {
        if (!this.noteId) {
            return;
        }

        if (!this.token) {
            this.shareListError = 'Session expired. Please log in again.';
            this.shareListLoading = false;
            this.cdr.markForCheck();
            return;
        }

        this.shareListSub?.unsubscribe();
        this.shareListLoading = true;
        this.shareListError = undefined;
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);

        this.shareListSub = this.http
            .get<NoteShareInfo[]>(`http://localhost:3000/notes/${this.noteId}/share`, {
                headers,
            })
            .subscribe({
                next: (shares) => {
                    this.shareList = shares;
                    this.shareListLoading = false;
                    this.cdr.markForCheck();
                },
                error: (error) => {
                    this.shareList = undefined;
                    this.shareListLoading = false;
                    this.shareListError = this.parseErrorMessage(
                        error,
                        'Unable to load the sharing list right now.'
                    );
                    this.cdr.markForCheck();
                },
            });
    }

    private syncNoteView(note: NoteDetail, options?: { preserveInputs?: boolean }) {
        this.note = note;
        const markdownSource = this.getMarkdownSource(note.content);

        if (!options?.preserveInputs || !this.editing) {
            this.titleInput = note.title;
            this.contentInput = markdownSource;
            this.updateEditingPreview(this.contentInput);
        }

        this.updateRenderedContent(markdownSource);
    }

    private updateRenderedContent(markdown: string) {
        this.renderedContent = this.sanitizer.bypassSecurityTrustHtml(
            this.convertMarkdown(markdown)
        );
    }

    updateEditingPreview(markdown: string) {
        this.editingPreview = this.sanitizer.bypassSecurityTrustHtml(
            this.convertMarkdown(markdown ?? '')
        );
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

    private parseErrorMessage(error: unknown, fallback: string) {
        if (error instanceof HttpErrorResponse) {
            const message = error.error?.message;
            if (typeof message === 'string') {
                return message;
            }
        }
        return fallback;
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
                htmlParts.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
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
                htmlParts.push(`<h${level}>${this.formatInline(headingMatch[2])}</h${level}>`);
                continue;
            }

            if (trimmed.startsWith('> ')) {
                closeList();
                htmlParts.push(`<blockquote>${this.formatInline(trimmed.slice(2))}</blockquote>`);
                continue;
            }

            if (/^[-*+]\s+/.test(trimmed)) {
                if (!inList) {
                    htmlParts.push('<ul>');
                    inList = true;
                }
                htmlParts.push(`<li>${this.formatInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
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
            '<a target="_blank" rel="noopener noreferrer" href="$2">$1</a>'
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
