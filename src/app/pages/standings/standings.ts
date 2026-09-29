import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { SeasonApiService, StandingRow } from '../../core/services/season-api.service';
import { AuthService } from '../../core/services/auth.service';
import { DiscussionPanelComponent } from '../shared/discussion-panel/discussion-panel';

type HubSeasonGroup = 'current' | 'archive';
type HubSeasonKind = 'season' | 'playoffs';

interface HubSeasonItem {
  label: string;
  value: string;
  shortLabel: string;
  description: string;
  group: HubSeasonGroup;
  kind: HubSeasonKind;
  yearLabel: string;
  isFeatured?: boolean;
}

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule, RouterLink, DiscussionPanelComponent],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
})
export class StandingsComponent implements OnInit {
  private api = inject(SeasonApiService);
  protected authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  standings: StandingRow[] = [];
  loading = true;
  error = '';
  seasonLabel = '2026-playoffs';

  seasons: HubSeasonItem[] = [
    {
      label: 'Séries 2026',
      value: '2026-playoffs',
      shortLabel: 'Séries 2026',
      description: 'Pool courant',
      group: 'current',
      kind: 'playoffs',
      yearLabel: '2025-2026',
      isFeatured: true,
    },
    {
      label: 'Saison 2025-2026',
      value: '2025-2026',
      shortLabel: 'Saison 2025-2026',
      description: 'Classement saison régulière',
      group: 'archive',
      kind: 'season',
      yearLabel: '2025-2026',
    },
    {
      label: 'Séries 2025',
      value: '2025-playoffs',
      shortLabel: 'Séries 2025',
      description: 'Archive',
      group: 'archive',
      kind: 'playoffs',
      yearLabel: '2024-2025',
    },
    {
      label: 'Saison 2024-2025',
      value: '2024-2025',
      shortLabel: 'Saison 2024-2025',
      description: 'Archive',
      group: 'archive',
      kind: 'season',
      yearLabel: '2024-2025',
    },
  ];

  ngOnInit(): void {
    this.loadStandings();
  }

  get selectedSeason(): HubSeasonItem | undefined {
    return this.seasons.find((season) => season.value === this.seasonLabel);
  }

  get featuredSeason(): HubSeasonItem | undefined {
    return this.seasons.find((season) => season.group === 'current' && season.isFeatured);
  }

  get archiveSeasons(): HubSeasonItem[] {
    return this.seasons.filter((season) => season.group === 'archive');
  }

  get pageTitle(): string {
    return this.selectedSeason?.label ?? 'PoolChapy';
  }

  get pageSubtitle(): string {
    if (this.selectedSeason?.group === 'current') {
      return 'Pool actif';
    }

    return 'Archives PoolChapy';
  }

  get standingsTitle(): string {
    if (!this.selectedSeason) {
      return 'Classement';
    }

    if (this.selectedSeason.kind === 'playoffs') {
      return 'Classement des séries';
    }

    return 'Classement saison régulière';
  }

  get hasArchiveEntries(): boolean {
    return this.archiveSeasons.length > 0;
  }

  get leaderDisplayName(): string {
    return this.standings[0]?.displayName ?? '—';
  }

  get leaderPoints(): number | string {
    return this.standings[0]?.totalPoints ?? '—';
  }

  changeSeason(seasonLabel: string): void {
    if (this.seasonLabel === seasonLabel) {
      return;
    }

    this.seasonLabel = seasonLabel;
    this.loadStandings();
  }

  loadStandings(): void {
    this.loading = true;
    this.error = '';
    this.standings = [];

    this.api
      .getStandings(this.seasonLabel)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.standings = data;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('error loading standings', err);
          this.error = 'Impossible de charger le classement.';
          this.cdr.detectChanges();
        },
      });
  }

  isCurrentUserRow(row: StandingRow): boolean {
    const currentSeasonMemberId = this.authService.currentUser()?.seasonMemberId;
    return !!currentSeasonMemberId && row.seasonMemberId === currentSeasonMemberId;
  }

  medal(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  seasonKindLabel(season: HubSeasonItem | undefined): string {
    if (!season) {
      return '';
    }

    return season.kind === 'playoffs' ? 'Séries' : 'Saison';
  }
}
