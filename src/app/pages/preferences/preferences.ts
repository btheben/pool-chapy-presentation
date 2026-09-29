import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import {
  MyPreferences,
  PreferenceLogoOption,
  PreferencesService,
} from '../../core/services/preferences.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preferences.html',
  styleUrl: './preferences.css',
})
export class PreferencesComponent implements OnInit {
  private preferencesService = inject(PreferencesService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;
  error = '';
  successMessage = '';

  preferences: MyPreferences | null = null;

  selectedDisplayMode: 'MODERN' | 'SIMPLE' = 'MODERN';
  selectedLogoAssetId: number | null = null;

  selectedTheme = 'ALL';

  ngOnInit(): void {
    this.loadPreferences();
  }

  get availableLogos(): PreferenceLogoOption[] {
    return this.preferences?.availableLogos ?? [];
  }

  get logoThemes(): string[] {
    const themes = this.availableLogos
      .map((logo) => this.resolveLogoTheme(logo))
      .filter((theme): theme is string => !!theme);

    return Array.from(new Set(themes)).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' }),
    );
  }

  get filteredLogos(): PreferenceLogoOption[] {
    if (this.selectedTheme === 'ALL') {
      return this.availableLogos;
    }

    return this.availableLogos.filter((logo) => this.resolveLogoTheme(logo) === this.selectedTheme);
  }

  get selectedThemeLabel(): string {
    return this.selectedTheme === 'ALL' ? 'Tous les thèmes' : this.selectedTheme;
  }

  loadPreferences(): void {
    this.loading = true;
    this.error = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.preferencesService
      .getMyPreferences()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.preferences = data;
          this.selectedDisplayMode = data.displayMode === 'SIMPLE' ? 'SIMPLE' : 'MODERN';
          this.selectedLogoAssetId = data.logoAssetId;
          this.selectedTheme = 'ALL';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed loading preferences', err);
          this.error = 'Impossible de charger vos préférences.';
          this.cdr.detectChanges();
        },
      });
  }

  selectDisplayMode(mode: 'MODERN' | 'SIMPLE'): void {
    this.selectedDisplayMode = mode;
  }

  selectLogo(logoAssetId: number): void {
    this.selectedLogoAssetId = logoAssetId;
  }

  clearLogo(): void {
    this.selectedLogoAssetId = null;
  }

  selectTheme(theme: string): void {
    this.selectedTheme = theme;
  }

  resetLogoFilter(): void {
    this.selectedTheme = 'ALL';
  }

  resolveLogoTheme(logo: PreferenceLogoOption): string {
    return logo.theme?.trim() || logo.sourceType?.trim() || 'Autres';
  }

  save(): void {
    this.saving = true;
    this.error = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.preferencesService
      .updateMyPreferences({
        displayMode: this.selectedDisplayMode,
        logoAssetId: this.selectedLogoAssetId,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.preferences = data;
          this.selectedDisplayMode = data.displayMode === 'SIMPLE' ? 'SIMPLE' : 'MODERN';
          this.selectedLogoAssetId = data.logoAssetId;
          this.successMessage = 'Préférences enregistrées.';
          this.authService.loadMe().subscribe();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed saving preferences', err);
          this.error = 'Impossible d’enregistrer vos préférences.';
          this.cdr.detectChanges();
        },
      });
  }
}
