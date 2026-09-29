import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { HeroPalette, HeroPaletteService } from '../../core/services/hero-palette.service';
import {
  NhlTeamPlayer,
  NhlTeamRoster,
  SeasonApiService,
} from '../../core/services/season-api.service';

type TeamPlayerFilter = 'ALL' | 'DRAFTED' | 'FREE_AGENT';

@Component({
  selector: 'app-nhl-team-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './nhl-team-page.html',
  styleUrl: './nhl-team-page.css',
})
export class NhlTeamPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(SeasonApiService);
  private cdr = inject(ChangeDetectorRef);

  private routeSub?: Subscription;

  seasonLabel = '';
  teamCode = '';

  data: NhlTeamRoster | null = null;
  loading = true;
  error = '';

  filter: TeamPlayerFilter = 'ALL';

  private heroPaletteService = inject(HeroPaletteService);

  heroBackground = this.defaultHeroBackground;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.seasonLabel = params.get('seasonLabel') ?? '';
      this.teamCode = params.get('teamCode') ?? '';

      this.loadTeam();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  loadTeam(): void {
    this.loading = true;
    this.error = '';
    this.data = null;
    this.heroBackground = this.defaultHeroBackground;

    this.api.getNhlTeamRoster(this.seasonLabel, this.teamCode).subscribe({
      next: (data: NhlTeamRoster) => {
        this.data = data;
        this.updateHeroBackground();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('error loading NHL team roster', err);
        this.error = 'Impossible de charger cette équipe.';
        this.loading = false;
        this.heroBackground = this.defaultHeroBackground;
        this.cdr.detectChanges();
      },
    });
  }

  setFilter(filter: TeamPlayerFilter): void {
    this.filter = filter;
  }

  get filteredPlayers(): NhlTeamPlayer[] {
    const players = this.data?.players ?? [];

    const filtered = players.filter((player) => {
      if (this.filter === 'DRAFTED') {
        return player.drafted;
      }

      if (this.filter === 'FREE_AGENT') {
        return !player.drafted;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const pointsDiff = Number(b.poolPoints ?? 0) - Number(a.poolPoints ?? 0);

      if (pointsDiff !== 0) {
        return pointsDiff;
      }

      return (a.fullName ?? '').localeCompare(b.fullName ?? '', 'fr', {
        sensitivity: 'base',
      });
    });
  }

  goToPlayer(playerId: number | null | undefined): void {
    if (!playerId) {
      return;
    }

    this.router.navigate(['/players', playerId]);
  }

  goToMember(username: string | null | undefined): void {
    if (!username) {
      return;
    }

    this.router.navigate(['/seasons', this.seasonLabel, 'members', username]);
  }

  onTeamLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  formatNumber(value: number | null | undefined): string {
    const safe = Number(value ?? 0);

    if (Number.isInteger(safe)) {
      return `${safe}`;
    }

    return safe.toFixed(1);
  }

  getOwnerLabel(player: NhlTeamPlayer): string {
    if (!player.drafted) {
      return 'Libre';
    }

    const owner =
      player.draftedByTeamName || player.draftedByDisplayName || player.draftedByUsername;

    if (!owner && !player.slotCode) {
      return 'Sélectionné';
    }

    if (!player.slotCode) {
      return owner ?? 'Sélectionné';
    }

    return `${owner ?? 'Sélectionné'} · ${player.slotCode}`;
  }

  getTeamTitle(): string {
    if (!this.data) {
      return this.teamCode;
    }

    return this.data.teamName && this.data.teamName !== this.data.teamCode
      ? this.data.teamName
      : this.data.teamCode;
  }

  get hasDraftedTeam(): boolean {
    return !!this.data?.draftedTeam?.drafted;
  }

  private get defaultHeroBackground(): string {
    return `
    radial-gradient(circle at 10% 8%, rgba(73, 112, 190, 0.26) 0%, rgba(255,255,255,0) 34%),
    radial-gradient(circle at 86% 16%, rgba(73, 112, 190, 0.22) 0%, rgba(255,255,255,0) 30%),
    linear-gradient(135deg, #081326 0%, #13203a 52%, #1d2d45 100%)
  `.trim();
  }

  private updateHeroBackground(): void {
    const fallback = this.getTeamFallbackPalette(this.data?.teamCode);

    this.heroPaletteService
      .buildLogoHeroBackground(this.data?.logoUrl, fallback)
      .then((background) => {
        if (!this.data) {
          return;
        }

        this.heroBackground = background;
        this.cdr.detectChanges();
      });
  }

  private getTeamFallbackPalette(teamCode: string | null | undefined): HeroPalette {
    const normalized = (teamCode ?? '').trim().toUpperCase();

    const palettes: Record<string, HeroPalette> = {
      ANA: {
        primary: 'hsl(28 84% 32% / 0.94)',
        secondary: 'hsl(23 18% 14% / 0.96)',
        glow: 'hsl(30 92% 56% / 0.28)',
      },
      BOS: {
        primary: 'hsl(45 78% 34% / 0.94)',
        secondary: 'hsl(222 18% 12% / 0.96)',
        glow: 'hsl(45 95% 58% / 0.28)',
      },
      BUF: {
        primary: 'hsl(220 68% 34% / 0.94)',
        secondary: 'hsl(46 72% 22% / 0.96)',
        glow: 'hsl(215 82% 58% / 0.28)',
      },
      CAR: {
        primary: 'hsl(352 66% 34% / 0.94)',
        secondary: 'hsl(220 16% 12% / 0.96)',
        glow: 'hsl(352 82% 58% / 0.28)',
      },
      CBJ: {
        primary: 'hsl(220 52% 28% / 0.94)',
        secondary: 'hsl(0 42% 30% / 0.96)',
        glow: 'hsl(220 74% 56% / 0.28)',
      },
      CGY: {
        primary: 'hsl(4 62% 34% / 0.94)',
        secondary: 'hsl(38 72% 22% / 0.96)',
        glow: 'hsl(8 82% 58% / 0.28)',
      },
      CHI: {
        primary: 'hsl(2 64% 34% / 0.94)',
        secondary: 'hsl(220 14% 10% / 0.96)',
        glow: 'hsl(2 84% 58% / 0.28)',
      },
      COL: {
        primary: 'hsl(344 44% 28% / 0.94)',
        secondary: 'hsl(214 34% 20% / 0.96)',
        glow: 'hsl(344 62% 56% / 0.28)',
      },
      DAL: {
        primary: 'hsl(151 54% 24% / 0.94)',
        secondary: 'hsl(220 16% 10% / 0.96)',
        glow: 'hsl(151 64% 48% / 0.28)',
      },
      DET: {
        primary: 'hsl(355 68% 34% / 0.94)',
        secondary: 'hsl(220 16% 12% / 0.96)',
        glow: 'hsl(355 84% 58% / 0.28)',
      },
      EDM: {
        primary: 'hsl(24 82% 42% / 0.94)',
        secondary: 'hsl(217 55% 20% / 0.96)',
        glow: 'hsl(24 90% 60% / 0.28)',
      },
      FLA: {
        primary: 'hsl(355 58% 34% / 0.94)',
        secondary: 'hsl(34 48% 18% / 0.96)',
        glow: 'hsl(355 74% 58% / 0.28)',
      },
      LAK: {
        primary: 'hsl(220 12% 18% / 0.94)',
        secondary: 'hsl(220 10% 10% / 0.96)',
        glow: 'hsl(220 16% 58% / 0.18)',
      },
      MIN: {
        primary: 'hsl(150 42% 24% / 0.94)',
        secondary: 'hsl(8 38% 22% / 0.96)',
        glow: 'hsl(150 58% 44% / 0.28)',
      },
      MTL: {
        primary: 'hsl(355 63% 38% / 0.94)',
        secondary: 'hsl(220 48% 20% / 0.96)',
        glow: 'hsl(355 75% 60% / 0.28)',
      },
      NJD: {
        primary: 'hsl(355 66% 34% / 0.94)',
        secondary: 'hsl(220 14% 10% / 0.96)',
        glow: 'hsl(355 82% 58% / 0.28)',
      },
      NSH: {
        primary: 'hsl(45 72% 34% / 0.94)',
        secondary: 'hsl(220 28% 18% / 0.96)',
        glow: 'hsl(48 90% 58% / 0.28)',
      },
      NYI: {
        primary: 'hsl(28 82% 40% / 0.94)',
        secondary: 'hsl(216 54% 22% / 0.96)',
        glow: 'hsl(30 92% 60% / 0.28)',
      },
      NYR: {
        primary: 'hsl(216 60% 28% / 0.94)',
        secondary: 'hsl(2 50% 28% / 0.96)',
        glow: 'hsl(216 82% 56% / 0.28)',
      },
      OTT: {
        primary: 'hsl(355 58% 32% / 0.94)',
        secondary: 'hsl(220 14% 12% / 0.96)',
        glow: 'hsl(355 74% 56% / 0.28)',
      },
      PHI: {
        primary: 'hsl(23 86% 42% / 0.94)',
        secondary: 'hsl(223 28% 12% / 0.96)',
        glow: 'hsl(24 92% 60% / 0.28)',
      },
      PIT: {
        primary: 'hsl(48 76% 34% / 0.94)',
        secondary: 'hsl(222 30% 14% / 0.96)',
        glow: 'hsl(48 90% 58% / 0.28)',
      },
      SEA: {
        primary: 'hsl(195 44% 24% / 0.94)',
        secondary: 'hsl(220 26% 12% / 0.96)',
        glow: 'hsl(190 62% 46% / 0.28)',
      },
      SJS: {
        primary: 'hsl(184 58% 24% / 0.94)',
        secondary: 'hsl(220 18% 12% / 0.96)',
        glow: 'hsl(184 74% 46% / 0.28)',
      },
      STL: {
        primary: 'hsl(220 52% 28% / 0.94)',
        secondary: 'hsl(45 72% 22% / 0.96)',
        glow: 'hsl(220 72% 56% / 0.28)',
      },
      TBL: {
        primary: 'hsl(216 60% 30% / 0.94)',
        secondary: 'hsl(220 16% 12% / 0.96)',
        glow: 'hsl(216 80% 58% / 0.28)',
      },
      TOR: {
        primary: 'hsl(216 58% 30% / 0.94)',
        secondary: 'hsl(220 18% 12% / 0.96)',
        glow: 'hsl(216 76% 58% / 0.28)',
      },
      UTA: {
        primary: 'hsl(221 34% 24% / 0.94)',
        secondary: 'hsl(220 16% 12% / 0.96)',
        glow: 'hsl(221 52% 50% / 0.28)',
      },
      VAN: {
        primary: 'hsl(154 44% 24% / 0.94)',
        secondary: 'hsl(220 18% 12% / 0.96)',
        glow: 'hsl(154 62% 46% / 0.28)',
      },
      VGK: {
        primary: 'hsl(38 42% 34% / 0.94)',
        secondary: 'hsl(220 14% 12% / 0.96)',
        glow: 'hsl(38 58% 56% / 0.28)',
      },
      WPG: {
        primary: 'hsl(216 56% 28% / 0.94)',
        secondary: 'hsl(220 16% 12% / 0.96)',
        glow: 'hsl(216 76% 56% / 0.28)',
      },
      WSH: {
        primary: 'hsl(355 58% 32% / 0.94)',
        secondary: 'hsl(220 18% 12% / 0.96)',
        glow: 'hsl(355 76% 56% / 0.28)',
      },
    };

    return (
      palettes[normalized] ?? {
        primary: 'rgba(8, 19, 38, 0.94)',
        secondary: 'rgba(17, 37, 77, 0.96)',
        glow: 'rgba(73, 112, 190, 0.26)',
      }
    );
  }

}
