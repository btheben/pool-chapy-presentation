import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  identifier = '';
  password = '';
  loading = false;
  error = '';

  submit(): void {
    this.error = '';

    const identifier = this.identifier.trim();
    const password = this.password;

    if (!identifier || !password) {
      this.error = 'Veuillez entrer votre identifiant et votre mot de passe.';
      return;
    }

    this.loading = true;

    this.authService
      .login(identifier, password)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/standings');
        },
        error: (err) => {
          console.error('Login failed', err);
          this.error = 'Identifiant ou mot de passe invalide.';
        },
      });
  }
}
