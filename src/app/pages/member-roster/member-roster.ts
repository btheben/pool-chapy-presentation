import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MemberRoster } from '../../core/models/member-roster.model';
import { RosterPlayer } from '../../core/models/roster-player.model';
import { SeasonApiService, StandingRow } from '../../core/services/season-api.service';
import { HeroPaletteService } from '../../core/services/hero-palette.service';
import { AuthService } from '../../core/services/auth.service';
import { DiscussionPanelComponent } from '../shared/discussion-panel/discussion-panel';

type SectionKey = 'FORWARD' | 'DEFENSE' | 'GOALIE' | 'TEAM';
type SortDirection = 'asc' | 'desc';
type RosterViewMode = 'modern' | 'simple';

type SectionColumn =
  | 'slotCode'
  | 'playerName'
  | 'positionCode'
  | 'nhlTeamCode'
  | 'gamesPlayed'
  | 'goals'
  | 'assists'
  | 'poolPoints'
  | 'goalieWins'
  | 'shutouts'
  | 'teamWins'
  | 'teamOtLosses';

type SortColumn = SectionColumn;

interface SectionColumnDef {
  key: SectionColumn;
  label: string;
  sortable: boolean;
  compact?: boolean;
}

interface SectionSortState {
  column: SortColumn | null;
  direction: SortDirection | null;
}

interface RosterSectionView {
  key: SectionKey;
  title: string;
  shortTitle: string;
  subtitle: string;
  countedLimitLabel: string;
  countedCount: number;
  players: RosterPlayer[];
  columns: SectionColumnDef[];
}

interface HeroSpotlight {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  playerId?: number | null;
  playerName?: string;
  teamCode?: string | null;
}

@Component({
  selector: 'app-member-roster',
  standalone: true,
  imports: [CommonModule, RouterLink, DiscussionPanelComponent],
  templateUrl: './member-roster.html',
  styleUrl: './member-roster.css',
})
export class MemberRosterComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(SeasonApiService);
  private cdr = inject(ChangeDetectorRef);
  private heroPaletteService = inject(HeroPaletteService);
  private authService = inject(AuthService);

  private routeSub?: Subscription;

  rosterData: MemberRoster | null = null;
  standingsMembers: StandingRow[] = [];

  sideTab: 'discussion' | 'infos' = 'discussion';

  setSideTab(tab: 'discussion' | 'infos'): void {
    this.sideTab = tab;
  }

  loading = true;
  sidebarLoading = true;
  error = '';

  seasonLabel = '2025-2026';
  username = '';
  teamsInActionToday = new Set<string>();

  heroBackground = this.defaultHeroBackground;

  viewMode: RosterViewMode = 'modern';

  setViewMode(mode: RosterViewMode): void {
    this.viewMode = mode;
    localStorage.setItem('poolchapyRosterViewMode', mode);
  }

  private readonly sectionSortStates: Record<SectionKey, SectionSortState> = {
    FORWARD: { column: null, direction: null },
    DEFENSE: { column: null, direction: null },
    GOALIE: { column: null, direction: null },
    TEAM: { column: null, direction: null },
  };

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.seasonLabel = params.get('seasonLabel') ?? '2025-2026';
      this.username = params.get('username') ?? '';

      const preferredDisplayMode = this.authService.currentUser()?.displayMode;

      if (preferredDisplayMode === 'SIMPLE') {
        this.viewMode = 'simple';
      } else if (preferredDisplayMode === 'MODERN') {
        this.viewMode = 'modern';
      }

      this.loadStandingsMembers();
      this.loadRoster();
      this.loadTeamsInActionToday();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private loadRoster(): void {
    this.loading = true;
    this.error = '';
    this.rosterData = null;
    this.heroBackground = this.defaultHeroBackground;

    this.api.getMemberRoster(this.seasonLabel, this.username).subscribe({
      next: (data) => {
        this.rosterData = data;
        this.updateHeroBackground(data.logoUrl);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error loading roster', err);
        this.error = 'Impossible de charger le roster.';
        this.loading = false;
        this.heroBackground = this.defaultHeroBackground;
        this.cdr.detectChanges();
      },
    });
  }

  private loadStandingsMembers(): void {
    this.sidebarLoading = true;

    this.api.getStandings(this.seasonLabel).subscribe({
      next: (rows) => {
        this.standingsMembers = rows;
        this.sidebarLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error loading standings navigation', err);
        this.sidebarLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get sections(): RosterSectionView[] {
    const roster = this.rosterData?.roster ?? [];

    const config: Array<{
      key: SectionKey;
      title: string;
      shortTitle: string;
      subtitle: string;
      countedLimitLabel: string;
      columns: SectionColumnDef[];
    }> = [
      {
        key: 'FORWARD',
        title: 'Attaquants',
        shortTitle: 'ATT',
        subtitle: 'Top 6 comptent',
        countedLimitLabel: 'Top 6',
        columns: [
          { key: 'slotCode', label: 'Slot', sortable: true, compact: true },
          { key: 'playerName', label: 'Joueur', sortable: true },
          { key: 'positionCode', label: 'Pos', sortable: true, compact: true },
          { key: 'gamesPlayed', label: 'M', sortable: true, compact: true },
          { key: 'goals', label: 'B', sortable: true, compact: true },
          { key: 'assists', label: 'A', sortable: true, compact: true },
          { key: 'poolPoints', label: 'Pts', sortable: true, compact: true },
        ],
      },
      {
        key: 'DEFENSE',
        title: 'Défenseurs',
        shortTitle: 'DÉF',
        subtitle: 'Top 2 comptent',
        countedLimitLabel: 'Top 2',
        columns: [
          { key: 'slotCode', label: 'Slot', sortable: true, compact: true },
          { key: 'playerName', label: 'Joueur', sortable: true },
          { key: 'positionCode', label: 'Pos', sortable: true, compact: true },
          { key: 'gamesPlayed', label: 'M', sortable: true, compact: true },
          { key: 'goals', label: 'B', sortable: true, compact: true },
          { key: 'assists', label: 'A', sortable: true, compact: true },
          { key: 'poolPoints', label: 'Pts', sortable: true, compact: true },
        ],
      },
      {
        key: 'GOALIE',
        title: 'Gardiens',
        shortTitle: 'GAR',
        subtitle: 'Top 1 compte',
        countedLimitLabel: 'Top 1',
        columns: [
          { key: 'slotCode', label: 'Slot', sortable: true, compact: true },
          { key: 'playerName', label: 'Joueur', sortable: true },
          { key: 'positionCode', label: 'Pos', sortable: true, compact: true },
          { key: 'gamesPlayed', label: 'M', sortable: true, compact: true },
          { key: 'goalieWins', label: 'V', sortable: true, compact: true },
          { key: 'shutouts', label: 'BL', sortable: true, compact: true },
          { key: 'poolPoints', label: 'Pts', sortable: true, compact: true },
        ],
      },
      {
        key: 'TEAM',
        title: 'Équipes NHL',
        shortTitle: 'ÉQP',
        subtitle: 'Top 1 compte',
        countedLimitLabel: 'Top 1',
        columns: [
          { key: 'slotCode', label: 'Slot', sortable: true, compact: true },
          { key: 'playerName', label: 'Équipe', sortable: true },
          { key: 'positionCode', label: 'Pos', sortable: true, compact: true },
          { key: 'gamesPlayed', label: 'M', sortable: true, compact: true },
          { key: 'teamWins', label: 'V', sortable: true, compact: true },
          { key: 'teamOtLosses', label: 'DOT', sortable: true, compact: true },
          { key: 'poolPoints', label: 'Pts', sortable: true, compact: true },
        ],
      },
    ];

    return config
      .map((sectionConfig) => {
        const rawPlayers = roster.filter((player) => player.category === sectionConfig.key);
        const players = this.applySectionSort(sectionConfig.key, rawPlayers);

        return {
          key: sectionConfig.key,
          title: sectionConfig.title,
          shortTitle: sectionConfig.shortTitle,
          subtitle: sectionConfig.subtitle,
          countedLimitLabel: sectionConfig.countedLimitLabel,
          columns: sectionConfig.columns,
          countedCount: rawPlayers.filter((player) => player.countsForTotals).length,
          players,
        };
      })
      .filter((section) => section.players.length > 0);
  }

  memberLabel(member: StandingRow): string {
    return member.teamName || member.displayName;
  }

  isActiveMember(member: StandingRow): boolean {
    return member.username === this.username;
  }

  goToMember(member: StandingRow): void {
    if (member.username === this.username) {
      return;
    }

    this.router.navigate(['/seasons', this.seasonLabel, 'members', member.username]);
  }

  goToPlayer(playerId: number | null | undefined): void {
    if (!playerId) {
      return;
    }

    this.router.navigate(['/players', playerId]);
  }

  toggleSort(sectionKey: SectionKey, column: SortColumn): void {
    const current = this.sectionSortStates[sectionKey];

    if (current.column !== column) {
      this.sectionSortStates[sectionKey] = { column, direction: 'desc' };
      return;
    }

    if (current.direction === 'desc') {
      this.sectionSortStates[sectionKey] = { column, direction: 'asc' };
      return;
    }

    if (current.direction === 'asc') {
      this.sectionSortStates[sectionKey] = { column: null, direction: null };
      return;
    }

    this.sectionSortStates[sectionKey] = { column, direction: 'desc' };
  }

  getSortIndicator(sectionKey: SectionKey, column: SortColumn): string {
    const state = this.sectionSortStates[sectionKey];

    if (state.column !== column || !state.direction) {
      return '';
    }

    return state.direction === 'desc' ? ' ↓' : ' ↑';
  }

  getStatValue(player: RosterPlayer, key: SectionColumn): string | number {
    switch (key) {
      case 'slotCode':
        return player.slotCode ?? '';
      case 'playerName':
        return player.playerName ?? '';
      case 'positionCode':
        return player.positionCode ?? '';
      case 'nhlTeamCode':
        return player.nhlTeamCode ?? '';
      case 'gamesPlayed':
        return player.gamesPlayed ?? 0;
      case 'goals':
        return player.goals ?? 0;
      case 'assists':
        return player.assists ?? 0;
      case 'poolPoints':
        return player.poolPoints ?? 0;
      case 'goalieWins':
        return player.goalieWins ?? 0;
      case 'shutouts':
        return player.shutouts ?? 0;
      case 'teamWins':
        return player.teamWins ?? 0;
      case 'teamOtLosses':
        return player.teamOtLosses ?? 0;
      default:
        return '';
    }
  }

  getRecentDelta(player: RosterPlayer, key: SectionColumn): number | null {
    switch (key) {
      case 'goals':
        return player.recentGoals ?? 0;
      case 'assists':
        return player.recentAssists ?? 0;
      case 'poolPoints':
        return Number(player.recentPoolPoints ?? 0);
      case 'goalieWins':
        return player.recentGoalieWins ?? 0;
      case 'shutouts':
        return player.recentShutouts ?? 0;
      case 'teamWins':
        return player.recentTeamWins ?? 0;
      case 'teamOtLosses':
        return player.recentTeamOtLosses ?? 0;
      default:
        return null;
    }
  }

  shouldShowRecentBadge(player: RosterPlayer, key: SectionColumn): boolean {
    if (!this.rosterData?.recentStatsDate) {
      return false;
    }

    if (player.category === 'FORWARD' || player.category === 'DEFENSE') {
      return key === 'goals' || key === 'assists' || key === 'poolPoints';
    }

    if (player.category === 'GOALIE') {
      return key === 'goalieWins' || key === 'shutouts' || key === 'poolPoints';
    }

    if (player.category === 'TEAM') {
      return key === 'teamWins' || key === 'teamOtLosses' || key === 'poolPoints';
    }

    return false;
  }

  hasVisibleRecentDelta(player: RosterPlayer, key: SectionColumn): boolean {
    if (!this.shouldShowRecentBadge(player, key)) {
      return false;
    }

    const delta = Number(this.getRecentDelta(player, key) ?? 0);
    return delta > 0;
  }

  getDeltaBadgeClass(value: number | null): string {
    const safe = Number(value ?? 0);

    if (safe <= 1) {
      return 'delta-badge delta-badge--1';
    }

    if (safe === 2) {
      return 'delta-badge delta-badge--2';
    }

    if (safe === 3) {
      return 'delta-badge delta-badge--3';
    }

    return 'delta-badge delta-badge--4';
  }

  formatDelta(value: number | null): string {
    const safe = Number(value ?? 0);

    if (Number.isInteger(safe)) {
      return `+${safe}`;
    }

    return `+${safe.toFixed(1)}`;
  }

  getSectionTotal(section: RosterSectionView, key: SectionColumn): number | string {
    if (
      key === 'slotCode' ||
      key === 'playerName' ||
      key === 'positionCode' ||
      key === 'nhlTeamCode'
    ) {
      return '';
    }

    return section.players
      .filter((player) => player.countsForTotals)
      .reduce((sum, player) => sum + this.toNumber(this.getStatValue(player, key)), 0);
  }

  getSectionPoints(section: RosterSectionView): number {
    return section.players
      .filter((player) => player.countsForTotals)
      .reduce((sum, player) => sum + (player.poolPoints ?? 0), 0);
  }

  get grandTotals() {
    const countedPlayers = (this.rosterData?.roster ?? []).filter(
      (player) => player.countsForTotals,
    );

    return {
      gamesPlayed: countedPlayers.reduce((sum, player) => sum + (player.gamesPlayed ?? 0), 0),
      goals: countedPlayers.reduce((sum, player) => sum + (player.goals ?? 0), 0),
      assists: countedPlayers.reduce((sum, player) => sum + (player.assists ?? 0), 0),
      poolPoints: countedPlayers.reduce((sum, player) => sum + (player.poolPoints ?? 0), 0),
      goalieWins: countedPlayers.reduce((sum, player) => sum + (player.goalieWins ?? 0), 0),
      shutouts: countedPlayers.reduce((sum, player) => sum + (player.shutouts ?? 0), 0),
      teamWins: countedPlayers.reduce((sum, player) => sum + (player.teamWins ?? 0), 0),
      teamOtLosses: countedPlayers.reduce((sum, player) => sum + (player.teamOtLosses ?? 0), 0),
    };
  }

  get rosterCountLabel(): string {
    const total = this.rosterData?.roster?.length ?? 0;
    const counted = this.rosterData?.roster?.filter((player) => player.countsForTotals).length ?? 0;

    return `${counted}/${total} comptent`;
  }

  hasRankChange(member: StandingRow): boolean {
    return Number(member.rankChange ?? 0) !== 0;
  }

  hasYesterdayPoints(member: StandingRow): boolean {
    return Number(member.pointsYesterday ?? 0) > 0;
  }

  formatYesterdayPoints(member: StandingRow): string {
    const value = Number(member.pointsYesterday ?? 0);

    if (Number.isInteger(value)) {
      return `+${value}`;
    }

    return `+${value.toFixed(1)}`;
  }

  getRankChangeDirection(member: StandingRow): 'up' | 'down' | 'same' {
    const change = Number(member.rankChange ?? 0);

    if (change > 0) {
      return 'up';
    }

    if (change < 0) {
      return 'down';
    }

    return 'same';
  }

  getRankChangeArrow(member: StandingRow): string {
    const change = Number(member.rankChange ?? 0);

    if (change > 0) {
      return '▲';
    }

    if (change < 0) {
      return '▼';
    }

    return '';
  }

  getRankChangeTooltip(member: StandingRow): string {
    const change = Number(member.rankChange ?? 0);

    if (change > 0) {
      return `A monté de ${change} position${change > 1 ? 's' : ''}`;
    }

    if (change < 0) {
      const abs = Math.abs(change);
      return `A descendu de ${abs} position${abs > 1 ? 's' : ''}`;
    }

    return 'Aucun changement au classement';
  }

  getStandingTooltip(member: StandingRow): string {
    const parts: string[] = [];

    const pointsYesterday = Number(member.pointsYesterday ?? 0);
    const rankChange = Number(member.rankChange ?? 0);

    if (pointsYesterday > 0) {
      parts.push(`+${pointsYesterday} pt${pointsYesterday > 1 ? 's' : ''} hier`);
    }

    if (rankChange > 0) {
      parts.push(`A monté de ${rankChange} rang${rankChange > 1 ? 's' : ''}`);
    }

    if (rankChange < 0) {
      const abs = Math.abs(rankChange);
      parts.push(`A descendu de ${abs} rang${abs > 1 ? 's' : ''}`);
    }

    return parts.join(' · ');
  }

  shouldShowStandingMeta(member: StandingRow): boolean {
    return this.isActiveMember(member) || this.hasRankChange(member);
  }

  shouldShowYesterdayPoints(member: StandingRow): boolean {
    return this.isActiveMember(member) && Number(member.pointsYesterday ?? 0) > 0;
  }

  get hotPlayer(): HeroSpotlight | null {
    const candidates = (this.rosterData?.roster ?? [])
      .filter((player) => player.category !== 'TEAM')
      .filter((player) => player.countsForTotals)
      .map((player) => ({
        player,
        delta: Number(player.recentPoolPoints ?? 0),
      }))
      .filter((entry) => entry.delta > 0)
      .sort((a, b) => {
        if (b.delta !== a.delta) {
          return b.delta - a.delta;
        }

        return (b.player.poolPoints ?? 0) - (a.player.poolPoints ?? 0);
      });

    if (candidates.length === 0) {
      return null;
    }

    const winner = candidates[0].player;
    const delta = Number(winner.recentPoolPoints ?? 0);

    return {
      title: 'Plus hot',
      value: winner.playerName,
      subtitle: `${this.formatDelta(delta)} pt${delta > 1 ? 's' : ''} pool`,
      icon: '🔥',
      playerId: winner.playerId,
      playerName: winner.playerName,
      teamCode: winner.nhlTeamCode,
    };
  }

  get coldPlayer(): HeroSpotlight | null {
    const candidates = (this.rosterData?.roster ?? [])
      .filter((player) => player.category !== 'TEAM')
      .filter((player) => !player.countsForTotals)
      .sort((a, b) => {
        const aPool = a.poolPoints ?? 0;
        const bPool = b.poolPoints ?? 0;

        if (aPool !== bPool) {
          return aPool - bPool;
        }

        return (a.gamesPlayed ?? 0) - (b.gamesPlayed ?? 0);
      });

    if (candidates.length === 0) {
      return null;
    }

    const loser = candidates[0];

    return {
      title: 'À relancer',
      value: loser.playerName,
      subtitle: `${loser.poolPoints ?? 0} pt${(loser.poolPoints ?? 0) > 1 ? 's' : ''} • hors top`,
      icon: '🥶',
      playerId: loser.playerId,
      playerName: loser.playerName,
      teamCode: loser.nhlTeamCode,
    };
  }

  get bestGoalie(): HeroSpotlight | null {
    const goalies = (this.rosterData?.roster ?? [])
      .filter((player) => player.category === 'GOALIE')
      .sort((a, b) => (b.poolPoints ?? 0) - (a.poolPoints ?? 0));

    if (goalies.length === 0) {
      return null;
    }

    const goalie = goalies[0];

    return {
      title: 'Gardien',
      value: goalie.playerName,
      subtitle: `${goalie.goalieWins ?? 0} V • ${goalie.shutouts ?? 0} BL`,
      icon: '🥅',
      playerId: goalie.playerId,
      playerName: goalie.playerName,
      teamCode: goalie.nhlTeamCode,
    };
  }

  get tonightPlayersCount(): number {
    return (this.rosterData?.roster ?? [])
      .filter((player) => player.category !== 'TEAM')
      .filter((player) => this.isPlayerInActionToday(player)).length;
  }

  get tonightTeamsCount(): number {
    return (this.rosterData?.roster ?? [])
      .filter((player) => player.category === 'TEAM')
      .filter((player) => this.isPlayerInActionToday(player)).length;
  }

  get tonightSpotlight(): HeroSpotlight | null {
    const activePlayer = (this.rosterData?.roster ?? [])
      .filter((player) => player.category !== 'TEAM')
      .find((player) => this.isPlayerInActionToday(player));

    if (!activePlayer && this.tonightPlayersCount === 0 && this.tonightTeamsCount === 0) {
      return null;
    }

    if (activePlayer) {
      return {
        title: 'Ce soir',
        value: activePlayer.playerName,
        subtitle: `${this.tonightPlayersCount} joueur${this.tonightPlayersCount > 1 ? 's' : ''} en action`,
        icon: '🏒',
        playerId: activePlayer.playerId,
        playerName: activePlayer.playerName,
        teamCode: activePlayer.nhlTeamCode,
      };
    }

    return {
      title: 'Ce soir',
      value: `${this.tonightTeamsCount} équipe${this.tonightTeamsCount > 1 ? 's' : ''}`,
      subtitle: `${this.tonightTeamsCount} équipe${this.tonightTeamsCount > 1 ? 's' : ''} en action`,
      icon: '🏒',
    };
  }

  get heroHighlights(): HeroSpotlight[] {
    return [this.hotPlayer, this.coldPlayer, this.bestGoalie, this.tonightSpotlight].filter(
      (item): item is HeroSpotlight => !!item,
    );
  }

  getPointsFromLeader(): number | null {
    if (!this.rosterData?.displayName || this.standingsMembers.length === 0) {
      return null;
    }

    const active = this.standingsMembers.find((member) => member.username === this.username);
    return active?.pointsFromFirst ?? null;
  }

  getTeamLogoUrl(teamCode: string | null | undefined): string | null {
    if (!teamCode) {
      return null;
    }

    const logoCodeMap: Record<string, string> = {
      ANA: 'ANA',
      ARI: 'ARI',
      BOS: 'BOS',
      BUF: 'BUF',
      CAR: 'CAR',
      CBJ: 'CBJ',
      CGY: 'CGY',
      CHI: 'CHI',
      COL: 'COL',
      DAL: 'DAL',
      DET: 'DET',
      EDM: 'EDM',
      FLA: 'FLA',
      LA: 'LAK',
      LAK: 'LAK',
      MIN: 'MIN',
      MTL: 'MTL',
      NJ: 'NJD',
      NJD: 'NJD',
      NSH: 'NSH',
      NYI: 'NYI',
      NYR: 'NYR',
      OTT: 'OTT',
      PHI: 'PHI',
      PIT: 'PIT',
      SEA: 'SEA',
      SJ: 'SJS',
      SJS: 'SJS',
      STL: 'STL',
      TB: 'TBL',
      TBL: 'TBL',
      TOR: 'TOR',
      UTA: 'UTA',
      VAN: 'VAN',
      VGK: 'VGK',
      WPG: 'WPG',
      WSH: 'WSH',
    };

    const normalized = teamCode.toUpperCase().trim();
    const cdnCode = logoCodeMap[normalized] ?? normalized;

    return `https://assets.nhle.com/logos/nhl/svg/${cdnCode}_dark.svg`;
  }

  onTeamLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private applySectionSort(sectionKey: SectionKey, players: RosterPlayer[]): RosterPlayer[] {
    const state = this.sectionSortStates[sectionKey];

    if (!state.column || !state.direction) {
      return [...players];
    }

    return [...players].sort((a, b) => this.comparePlayers(a, b, state.column!, state.direction!));
  }

  private comparePlayers(
    a: RosterPlayer,
    b: RosterPlayer,
    column: SortColumn,
    direction: SortDirection,
  ): number {
    const factor = direction === 'asc' ? 1 : -1;

    let result = 0;

    switch (column) {
      case 'slotCode':
        result = this.compareStrings(a.slotCode, b.slotCode, true);
        break;
      case 'playerName':
        result = this.compareStrings(a.playerName, b.playerName);
        break;
      case 'positionCode':
        result = this.compareStrings(a.positionCode, b.positionCode);
        break;
      case 'nhlTeamCode':
        result = this.compareStrings(a.nhlTeamCode ?? '', b.nhlTeamCode ?? '');
        break;
      case 'gamesPlayed':
        result = this.compareNumbers(a.gamesPlayed, b.gamesPlayed);
        break;
      case 'goals':
        result = this.compareNumbers(a.goals, b.goals);
        break;
      case 'assists':
        result = this.compareNumbers(a.assists, b.assists);
        break;
      case 'poolPoints':
        result = this.compareNumbers(a.poolPoints, b.poolPoints);
        break;
      case 'goalieWins':
        result = this.compareNumbers(a.goalieWins, b.goalieWins);
        break;
      case 'shutouts':
        result = this.compareNumbers(a.shutouts, b.shutouts);
        break;
      case 'teamWins':
        result = this.compareNumbers(a.teamWins, b.teamWins);
        break;
      case 'teamOtLosses':
        result = this.compareNumbers(a.teamOtLosses, b.teamOtLosses);
        break;
    }

    if (result !== 0) {
      return result * factor;
    }

    return this.compareStrings(a.playerName, b.playerName);
  }

  private compareStrings(
    a: string | null | undefined,
    b: string | null | undefined,
    numeric = false,
  ): number {
    return (a ?? '').localeCompare(b ?? '', 'fr', {
      sensitivity: 'base',
      numeric,
    });
  }

  private compareNumbers(a: number | null | undefined, b: number | null | undefined): number {
    return this.toNumber(a) - this.toNumber(b);
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' ? value : 0;
  }

  private loadTeamsInActionToday(): void {
    this.api.getTeamsInActionToday(this.seasonLabel).subscribe({
      next: (teamCodes) => {
        this.teamsInActionToday = new Set(
          (teamCodes ?? []).map((code) => code.toUpperCase().trim()),
        );
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error loading teams in action today', err);
        this.teamsInActionToday = new Set();
        this.cdr.detectChanges();
      },
    });
  }

  isPlayerInActionToday(player: RosterPlayer): boolean {
    const code = player.nhlTeamCode?.toUpperCase()?.trim();

    if (!code) {
      return false;
    }

    return this.teamsInActionToday.has(code);
  }

  private get defaultHeroBackground(): string {
    return `
      radial-gradient(circle at 10% 0%, rgba(73, 112, 190, 0.26), transparent 30%),
      linear-gradient(135deg, #081326 0%, #13203a 52%, #1d2d45 100%)
    `.trim();
  }

  private updateHeroBackground(logoUrl: string | null | undefined): void {
    this.heroPaletteService
      .buildLogoHeroBackground(logoUrl, {
        primary: 'rgba(8, 19, 38, 0.94)',
        secondary: 'rgba(17, 37, 77, 0.96)',
        glow: 'rgba(73, 112, 190, 0.26)',
      })
      .then((background) => {
        if (this.rosterData?.logoUrl !== logoUrl) {
          return;
        }

        this.heroBackground = background;
        this.cdr.detectChanges();
      });
  }

  get simpleRosterRows(): RosterPlayer[] {
    return [...(this.rosterData?.roster ?? [])].sort((a, b) => {
      const categoryDiff = this.getCategoryOrder(a.category) - this.getCategoryOrder(b.category);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return (a.slotCode ?? '').localeCompare(b.slotCode ?? '', 'fr', {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }

  private getCategoryOrder(category: string | null | undefined): number {
    switch (category) {
      case 'FORWARD':
        return 1;
      case 'DEFENSE':
        return 2;
      case 'GOALIE':
        return 3;
      case 'TEAM':
        return 4;
      default:
        return 99;
    }
  }

  getSimpleYesterdayPoints(player: RosterPlayer): number {
    return Number(player.recentPoolPoints ?? 0);
  }

  formatSimpleYesterdayPoints(player: RosterPlayer): string {
    const value = this.getSimpleYesterdayPoints(player);

    if (value <= 0) {
      return '';
    }

    if (Number.isInteger(value)) {
      return `+${value}`;
    }

    return `+${value.toFixed(1)}`;
  }

  goToNhlTeam(teamCode: string | null | undefined, event?: Event): void {
    event?.stopPropagation();

    if (!teamCode) {
      return;
    }

    this.router.navigate(['/seasons', this.seasonLabel, 'teams', teamCode]);
  }

  get mobileRosterRows(): RosterPlayer[] {
    if (!this.rosterData?.roster) {
      return [];
    }

    return [...this.rosterData.roster].sort((a, b) => {
      if (b.poolPoints !== a.poolPoints) {
        return b.poolPoints - a.poolPoints;
      }

      return a.playerName.localeCompare(b.playerName);
    });
  }
}
