import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';

export interface AuthMe {
  userId: number;
  email: string;
  username: string;
  displayName: string;
  active: boolean;
  role: string;
  seasonMemberId: number | null;
  seasonLabel: string | null;
  teamName: string | null;
  displayMode: string | null;
  logoAssetId: number | null;
  logoUrl: string | null;
}

export interface DevAuthUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiBaseUrl = 'http://192.168.2.13:8081/api';

  currentUser = signal<AuthMe | null>(null);
  authLoaded = signal(false);

  loadMe() {
    return this.http
      .get<AuthMe>(`${this.apiBaseUrl}/auth/me`, {
        withCredentials: true,
      })
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.authLoaded.set(true);
        }),
        catchError((err) => {
          console.error('AUTH /me failed', err);
          this.currentUser.set(null);
          this.authLoaded.set(true);
          return of(null);
        }),
      );
  }

  login(identifier: string, password: string) {
    return this.http
      .post<AuthMe>(
        `${this.apiBaseUrl}/auth/login`,
        { identifier, password },
        { withCredentials: true },
      )
      .pipe(
        tap((user) => {
          this.currentUser.set(user);
          this.authLoaded.set(true);
        }),
      );
  }

  logout() {
    return this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser.set(null);
        this.authLoaded.set(true);
      }),
    );
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'ADMIN';
  }

  isCurrentSeasonMember(seasonMemberId: number | null | undefined): boolean {
    return this.currentUser()?.seasonMemberId === seasonMemberId;
  }

  getDevUsers() {
    return this.http.get<DevAuthUser[]>(`${this.apiBaseUrl}/dev/auth/users`, {
      withCredentials: true,
    });
  }

  switchDevUser(username: string) {
    return this.http.post(
      `${this.apiBaseUrl}/dev/auth/switch/${encodeURIComponent(username)}`,
      {},
      { withCredentials: true },
    );
  }

  resetDevUser() {
    return this.http.post(`${this.apiBaseUrl}/dev/auth/reset`, {}, { withCredentials: true });
  }
}
