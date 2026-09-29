import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { AuthService } from './core/services/auth.service';

function initializeAuth() {
  return () => {
    const authService = inject(AuthService);
    return firstValueFrom(authService.loadMe());
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};
