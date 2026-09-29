import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { DiscussionPost, DiscussionService } from '../../core/services/discussion.service';

@Component({
  selector: 'app-discussion-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './discussion-page.html',
  styleUrl: './discussion-page.css',
})
export class DiscussionPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private discussionService = inject(DiscussionService);
  protected authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  seasonLabel = '2026-playoffs';

  posts: DiscussionPost[] = [];
  loading = true;
  sending = false;
  deletingPostId: number | null = null;
  error = '';
  draft = '';

  ngOnInit(): void {
    this.seasonLabel = this.route.snapshot.paramMap.get('seasonLabel') ?? '2026-playoffs';
    this.loadPosts();
  }

  loadPosts(): void {
    this.loading = true;
    this.error = '';

    this.discussionService
      .getPosts(this.seasonLabel)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (posts) => {
          this.posts = posts;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading discussion posts', err);
          this.error = 'Impossible de charger les messages.';
          this.cdr.detectChanges();
        },
      });
  }

  submit(): void {
    const content = this.draft.trim();

    if (!content || this.sending) {
      return;
    }

    this.sending = true;
    this.error = '';

    this.discussionService
      .createPost(this.seasonLabel, { content })
      .pipe(
        finalize(() => {
          this.sending = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (post) => {
          this.posts = [post, ...this.posts];
          this.draft = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error creating discussion post', err);
          this.error = 'Impossible d’envoyer le message.';
          this.cdr.detectChanges();
        },
      });
  }

  canDelete(post: DiscussionPost): boolean {
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      return false;
    }

    if (this.authService.isAdmin()) {
      return true;
    }

    return currentUser.userId === post.authorUserId;
  }

  deletePost(post: DiscussionPost): void {
    if (!this.canDelete(post) || this.deletingPostId === post.id) {
      return;
    }

    const confirmed = window.confirm('Supprimer ce message ?');
    if (!confirmed) {
      return;
    }

    this.deletingPostId = post.id;
    this.error = '';

    this.discussionService
      .deletePost(this.seasonLabel, post.id)
      .pipe(
        finalize(() => {
          this.deletingPostId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.posts = this.posts.filter((item) => item.id !== post.id);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error deleting discussion post', err);
          this.error = 'Impossible de supprimer le message.';
          this.cdr.detectChanges();
        },
      });
  }

  isCurrentUserPost(post: DiscussionPost): boolean {
    return this.authService.currentUser()?.userId === post.authorUserId;
  }

  formatPostDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  trackByPostId(_: number, post: DiscussionPost): number {
    return post.id;
  }
}
