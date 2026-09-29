import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DiscussionPost {
  id: number;
  seasonLabel: string;
  authorUserId: number;
  authorUsername: string;
  authorDisplayName: string;
  title: string | null;
  content: string;
  postType: string;
  createdAt: string;
  editedAt: string | null;
  edited: boolean;
}

export interface CreateDiscussionPostRequest {
  title?: string | null;
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class DiscussionService {
  private http = inject(HttpClient);
  private readonly apiRoot = 'http://192.168.2.13:8081/api';
  private readonly credentials = { withCredentials: true };

  getPosts(seasonLabel: string): Observable<DiscussionPost[]> {
    return this.http.get<DiscussionPost[]>(
      `${this.apiRoot}/seasons/${encodeURIComponent(seasonLabel)}/discussion`,
      this.credentials,
    );
  }

  createPost(
    seasonLabel: string,
    payload: CreateDiscussionPostRequest,
  ): Observable<DiscussionPost> {
    return this.http.post<DiscussionPost>(
      `${this.apiRoot}/seasons/${encodeURIComponent(seasonLabel)}/discussion`,
      payload,
      this.credentials,
    );
  }

  deletePost(seasonLabel: string, postId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiRoot}/seasons/${encodeURIComponent(seasonLabel)}/discussion/${postId}`,
      this.credentials,
    );
  }
}
