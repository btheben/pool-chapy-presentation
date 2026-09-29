import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, DevAuthUser } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected authService = inject(AuthService);

  protected devUsers = signal<DevAuthUser[]>([]);
  protected userMenuOpen = false;

  ngOnInit(): void {
    this.authService.getDevUsers().subscribe({
      next: (users) => this.devUsers.set(users),
      error: (err) => console.error('Failed loading dev users', err),
    });
  }

  protected toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  protected closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  protected onSwitchDevUser(username: string): void {
    if (!username) {
      return;
    }

    this.authService.switchDevUser(username).subscribe({
      next: () => {
        this.authService.loadMe().subscribe();
        this.closeUserMenu();
      },
      error: (err) => console.error('Failed switching dev user', err),
    });
  }

  protected onResetDevUser(): void {
    this.authService.resetDevUser().subscribe({
      next: () => {
        this.authService.loadMe().subscribe();
        this.closeUserMenu();
      },
      error: (err) => console.error('Failed resetting dev user', err),
    });
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeUserMenu();
  }

  protected onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.closeUserMenu();
        window.location.href = '/login';
      },
      error: (err) => console.error('Failed logout', err),
    });
  }
}
