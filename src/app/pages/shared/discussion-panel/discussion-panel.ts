import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { DiscussionPost, DiscussionService } from '../../../core/services/discussion.service';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-discussion-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './discussion-panel.html',
  styleUrl: './discussion-panel.css',
})
export class DiscussionPanelComponent implements OnInit {
  @Input({ required: true }) seasonLabel!: string;
  @Input() title = 'Discussion du pool';
  @Input() emptyMessage = 'Aucun message pour le moment.';
  @Input() maxPosts: number | null = null;
  @Input() showViewAllLink = false;

  private discussionService = inject(DiscussionService);
  protected authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  posts: DiscussionPost[] = [];
  loading = true;
  sending = false;
  error = '';
  draft = '';

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    if (!this.seasonLabel) {
      this.posts = [];
      this.loading = false;
      return;
    }

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
          this.posts = this.maxPosts ? posts.slice(0, this.maxPosts) : posts;
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

    if (!content || !this.seasonLabel || this.sending) {
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
          const updatedPosts = [post, ...this.posts];
          this.posts = this.maxPosts ? updatedPosts.slice(0, this.maxPosts) : updatedPosts;
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

  trackByPostId(_: number, post: DiscussionPost): number {
    return post.id;
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
}
