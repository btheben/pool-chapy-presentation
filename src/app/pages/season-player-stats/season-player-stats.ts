import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  PlayerStatsPositionFilter,
  SeasonApiService,
  SeasonPlayerStats,
} from '../../core/services/season-api.service';

type StatsViewMode = 'DRAFTED' | 'ALL_PLAYERS' | 'FREE_AGENTS';

interface PositionTab {
  value: PlayerStatsPositionFilter;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-season-player-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './season-player-stats.html',
  styleUrl: './season-player-stats.css',
})
export class SeasonPlayerStatsComponent implements OnInit {
  private seasonApiService = inject(SeasonApiService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  // Pour l’instant hardcodé, comme ton /stats n’a pas de paramètre.
  // Plus tard, on pourra le sortir d’un SeasonContextService.
  seasonLabel = '2026-playoffs';

  loading = true;
  error = '';

  players: SeasonPlayerStats[] = [];

  selectedPosition: PlayerStatsPositionFilter = 'ALL';
  selectedViewMode: StatsViewMode = 'DRAFTED';

  positionTabs: PositionTab[] = [
    { value: 'ALL', label: 'Tous les joueurs', shortLabel: 'Tous' },
    { value: 'FORWARD', label: 'Attaquants', shortLabel: 'Att.' },
    { value: 'DEFENSE', label: 'Défenseurs', shortLabel: 'Déf.' },
    { value: 'GOALIE', label: 'Gardiens', shortLabel: 'Gard.' },
    { value: 'TEAM', label: 'Équipes', shortLabel: 'Éq.' },
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  get freeAgentsOnly(): boolean {
    return this.selectedViewMode === 'FREE_AGENTS';
  }

  get pageTitle(): string {
    switch (this.selectedViewMode) {
      case 'DRAFTED':
        return 'Joueurs repêchés';
      case 'FREE_AGENTS':
        return 'Agents libres';
      case 'ALL_PLAYERS':
      default:
        return 'Stats de la saison';
    }
  }

  get pageSubtitle(): string {
    switch (this.selectedViewMode) {
      case 'DRAFTED':
        return 'Consultez le classement des joueurs sélectionnés dans le pool.';
      case 'FREE_AGENTS':
        return 'Repérez les meilleurs joueurs encore disponibles pour préparer les transactions.';
      case 'ALL_PLAYERS':
      default:
        return 'Consultez le classement complet des joueurs pour la saison en cours.';
    }
  }

  loadStats(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.seasonApiService
      .getSeasonPlayerStats(this.seasonLabel, this.selectedPosition, this.freeAgentsOnly)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (players) => {
          this.players = players ?? [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed loading season player stats', err);
          this.error = 'Impossible de charger les stats de la saison.';
          this.players = [];
          this.cdr.detectChanges();
        },
      });
  }

  selectPosition(position: PlayerStatsPositionFilter): void {
    if (this.selectedPosition === position) {
      return;
    }

    this.selectedPosition = position;
    this.loadStats();
  }

  selectViewMode(mode: StatsViewMode): void {
    if (this.selectedViewMode === mode) {
      return;
    }

    this.selectedViewMode = mode;
    this.loadStats();
  }

  trackByPlayerId(index: number, player: SeasonPlayerStats): number {
    return player.playerId ?? index;
  }

  formatNumber(value: number | null | undefined): string {
    return `${value ?? 0}`;
  }

  formatPoolPoints(value: number | null | undefined): string {
    const points = value ?? 0;

    if (Number.isInteger(points)) {
      return `${points}`;
    }

    return points.toFixed(1);
  }

  getPositionLabel(player: SeasonPlayerStats): string {
    switch (player.positionGroup) {
      case 'FORWARD':
        return 'Attaquant';
      case 'DEFENSE':
        return 'Défenseur';
      case 'GOALIE':
        return 'Gardien';
      case 'TEAM':
        return 'Équipe';
      default:
        return player.positionCode || '—';
    }
  }

  getStatusLabel(player: SeasonPlayerStats): string {
    switch (player.currentStatusType) {
      case 'ACTIVE':
        return 'Actif';
      case 'DAY_TO_DAY':
        return 'Au jour le jour';
      case 'QUESTIONABLE':
        return 'Incertain';
      case 'DOUBTFUL':
        return 'Très incertain';
      case 'OUT':
        return 'Absent';
      case 'INJURED_RESERVE':
        return 'Blessé';
      case 'SUSPENDED':
        return 'Suspendu';
      case 'NON_ROSTER':
        return 'Hors alignement';
      case 'UNKNOWN':
        return 'Inconnu';
      default:
        return '—';
    }
  }

  getStatusClass(player: SeasonPlayerStats): string {
    switch (player.currentStatusType) {
      case 'ACTIVE':
        return 'status-active';
      case 'DAY_TO_DAY':
      case 'QUESTIONABLE':
        return 'status-warning';
      case 'DOUBTFUL':
      case 'OUT':
      case 'INJURED_RESERVE':
        return 'status-danger';
      case 'SUSPENDED':
        return 'status-suspended';
      default:
        return 'status-empty';
    }
  }

  getDraftLabel(player: SeasonPlayerStats): string {
    if (!player.drafted) {
      return 'Libre';
    }

    return player.draftedByTeamName || player.draftedByDisplayName || 'Pris';
  }

  getDraftClass(player: SeasonPlayerStats): string {
    return player.drafted ? 'drafted' : 'free-agent';
  }

  showSkaterStats(player: SeasonPlayerStats): boolean {
    return player.positionGroup !== 'GOALIE' && player.positionGroup !== 'TEAM';
  }

  showGoalieStats(player: SeasonPlayerStats): boolean {
    return player.positionGroup === 'GOALIE';
  }

  showTeamStats(player: SeasonPlayerStats): boolean {
    return player.positionGroup === 'TEAM';
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

  goToNhlTeam(teamCode: string | null | undefined, event?: MouseEvent): void {
    event?.stopPropagation();

    if (!teamCode) {
      return;
    }

    this.router.navigate(['/seasons', this.seasonLabel, 'teams', teamCode]);
  }

  onTeamLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;

    if (img) {
      img.style.display = 'none';
    }
  }

  isCurrentUserPlayer(player: SeasonPlayerStats): boolean {
    const currentUser = this.authService.currentUser();

    if (!currentUser || !player.draftedByUsername) {
      return false;
    }

    return player.draftedByUsername === currentUser.username;
  }

  getDraftTitle(player: SeasonPlayerStats): string {
    if (!player.drafted) {
      return 'Agent libre';
    }

    if (this.isCurrentUserPlayer(player)) {
      return 'Ce joueur est dans votre équipe';
    }

    return `Pris par ${this.getDraftLabel(player)}`;
  }

  get visiblePlayers(): SeasonPlayerStats[] {
    if (this.selectedViewMode === 'DRAFTED') {
      return this.players.filter((player) => player.drafted);
    }

    return this.players;
  }

  get totalPlayers(): number {
    return this.visiblePlayers.length;
  }

  get draftedCount(): number {
    return this.players.filter((player) => player.drafted).length;
  }

  get freeAgentCount(): number {
    return this.players.filter((player) => !player.drafted).length;
  }

  get topPlayer(): SeasonPlayerStats | null {
    return this.visiblePlayers.length > 0 ? this.visiblePlayers[0] : null;
  }
}
