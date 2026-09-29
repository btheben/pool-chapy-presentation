import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  PlayerPlayoffSummary,
  PlayerSeasonSummary,
  SeasonApiService,
} from '../../core/services/season-api.service';

type PlayerTab = 'season-history' | 'playoff-history' | 'game-log';

@Component({
  selector: 'app-player-stats',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './player-stats.html',
  styleUrl: './player-stats.css',
})
export class PlayerStatsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(SeasonApiService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  player: PlayerPlayoffSummary | null = null;
  loading = true;
  error = '';
  activeTab: PlayerTab = 'season-history';

  private headshotCandidates: string[] = [];
  private headshotIndex = 0;
  headshotVisible = false;

  ngOnInit(): void {
    const rawPlayerId = this.route.snapshot.paramMap.get('playerId');
    const playerId = Number(rawPlayerId);

    if (!rawPlayerId || Number.isNaN(playerId)) {
      this.error = 'Identifiant joueur invalide.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.api.getPlayerPlayoffSummary(playerId).subscribe({
      next: (data: PlayerPlayoffSummary) => {
        this.player = data;
        this.prepareHeadshotCandidates();
        this.initializeActiveTab();
        this.loading = false;
        this.error = '';
        this.cdr.detectChanges();
      },
      error: (err: unknown) => {
        console.error('player summary error =', err);
        this.error = 'Impossible de charger les stats du joueur.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  setActiveTab(tab: PlayerTab): void {
    this.activeTab = tab;
  }

  get hasSeasonHistory(): boolean {
    return this.regularSeasonHistory.length > 0;
  }

  get hasPlayoffHistory(): boolean {
    return this.playoffHistory.length > 0;
  }

  get regularSeasonHistory(): PlayerSeasonSummary[] {
    return (this.player?.previousSeasons ?? [])
      .filter((season) => season.seasonType === 'REGULAR')
      .slice(0, 20);
  }

  get playoffHistory(): PlayerSeasonSummary[] {
    return (this.player?.previousSeasons ?? [])
      .filter((season) => season.seasonType === 'PLAYOFFS')
      .slice(0, 20);
  }

  get activeTabLabel(): string {
    switch (this.activeTab) {
      case 'season-history':
        return 'Historique saisons';
      case 'playoff-history':
        return 'Historique séries';
      case 'game-log':
        return 'Game log';
      default:
        return '';
    }
  }

  get headshotUrl(): string | null {
    if (!this.headshotVisible || this.headshotCandidates.length === 0) {
      return null;
    }

    return this.headshotCandidates[this.headshotIndex] ?? null;
  }

  onHeadshotError(): void {
    if (this.headshotIndex < this.headshotCandidates.length - 1) {
      this.headshotIndex++;
    } else {
      this.headshotVisible = false;
    }

    this.cdr.detectChanges();
  }

  getHeroStyle(teamCode: string | null | undefined): string {
    const palette = this.getTeamPalette(teamCode);
    return `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 58%, ${palette[2]} 100%)`;
  }

  formatMatchup(teamCode: string | null, opponentCode: string | null): string {
    if (!teamCode && !opponentCode) {
      return '—';
    }

    if (teamCode && opponentCode) {
      return `${teamCode} vs ${opponentCode}`;
    }

    return teamCode ?? opponentCode ?? '—';
  }

  hasMatchupTeams(teamCode: string | null, opponentCode: string | null): boolean {
    return !!teamCode || !!opponentCode;
  }

  formatHeight(heightInInches: number | null | undefined): string {
    if (!heightInInches || heightInInches <= 0) {
      return '—';
    }

    const feet = Math.floor(heightInInches / 12);
    const inches = heightInInches % 12;
    return `${feet}'${inches}"`;
  }

  getAge(): number | null {
    if (!this.player?.birthDate) {
      return null;
    }

    const birthDate = new Date(this.player.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  pointsPerGame(): number {
    if (!this.player || !this.player.gamesPlayed) {
      return 0;
    }

    return this.player.points / this.player.gamesPlayed;
  }

  poolPointsPerGame(): number {
    if (!this.player || !this.player.gamesPlayed) {
      return 0;
    }

    return this.player.fantasyPoints / this.player.gamesPlayed;
  }

  bestPoolGame(): number {
    if (!this.player?.games?.length) {
      return 0;
    }

    return Math.max(...this.player.games.map((game) => Number(game.fantasyPoints ?? 0)));
  }

  latestGamePoints(): number {
    if (!this.player?.games?.length) {
      return 0;
    }

    const latest = this.player.games[0];
    return (latest.goals ?? 0) + (latest.assists ?? 0);
  }

  latestGamePoolPoints(): number {
    if (!this.player?.games?.length) {
      return 0;
    }

    return Number(this.player.games[0].fantasyPoints ?? 0);
  }

  getPlayerInitials(): string {
    if (!this.player?.fullName) {
      return '?';
    }

    return this.player.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  formatBirthPlace(): string {
    if (!this.player) {
      return '—';
    }

    const parts = [this.player.birthCity, this.player.birthCountry].filter(
      (value) => value && value.trim().length > 0,
    );

    return parts.length > 0 ? parts.join(', ') : '—';
  }

  getPoolOwnerLabel(): string | null {
    if (!this.player?.poolOwnerDisplayName) {
      return null;
    }

    if (
      this.player.poolOwnerTeamName &&
      this.player.poolOwnerTeamName !== this.player.poolOwnerDisplayName
    ) {
      return `${this.player.poolOwnerDisplayName} • ${this.player.poolOwnerTeamName}`;
    }

    return this.player.poolOwnerDisplayName;
  }

  getTrendClass(): string {
    const status = this.player?.trend?.status ?? 'NEUTRAL';
    return `trend-pill--${status.toLowerCase()}`;
  }

  getTrendIcon(): string {
    const status = this.player?.trend?.status ?? 'NEUTRAL';

    if (status === 'HOT') return '🔥';
    if (status === 'COLD') return '🥶';
    return '📈';
  }

  formatSeasonType(value: string | null | undefined): string {
    if (value === 'PLAYOFFS') {
      return 'Séries';
    }

    if (value === 'REGULAR') {
      return 'Saison';
    }

    return value || '—';
  }

  trackSeason(_: number, season: PlayerSeasonSummary): string {
    return `${season.seasonLabel}-${season.seasonType}`;
  }

  private initializeActiveTab(): void {
    if (this.regularSeasonHistory.length > 0) {
      this.activeTab = 'season-history';
      return;
    }

    if (this.playoffHistory.length > 0) {
      this.activeTab = 'playoff-history';
      return;
    }

    this.activeTab = 'game-log';
  }

  private prepareHeadshotCandidates(): void {
    this.headshotCandidates = [];
    this.headshotIndex = 0;
    this.headshotVisible = false;

    if (!this.player?.nhlApiPlayerId) {
      return;
    }

    const playerId = this.player.nhlApiPlayerId;
    const teamCode = this.normalizeLogoCode(this.player.teamCode);

    const urls = [
      `https://cms.nhl.bamgrid.com/images/headshots/current/168x168/${playerId}.jpg`,
      teamCode ? `https://assets.nhle.com/mugs/nhl/20252026/${teamCode}/${playerId}.png` : null,
    ].filter((value): value is string => !!value);

    this.headshotCandidates = [...new Set(urls)];
    this.headshotVisible = this.headshotCandidates.length > 0;
  }

  private normalizeLogoCode(teamCode: string | null | undefined): string | null {
    if (!teamCode) {
      return null;
    }

    const mapping: Record<string, string> = {
      LA: 'LAK',
      NJ: 'NJD',
      SJ: 'SJS',
      TB: 'TBL',
    };

    const normalized = teamCode.toUpperCase().trim();
    return mapping[normalized] ?? normalized;
  }

  private getTeamPalette(teamCode: string | null | undefined): [string, string, string] {
    const map: Record<string, [string, string, string]> = {
      ANA: ['#7c4a20', '#b46a2a', '#111827'],
      ARI: ['#7a1d2d', '#a12f45', '#111827'],
      BOS: ['#111827', '#fbbf24', '#3f3f46'],
      BUF: ['#0a2f73', '#1d4ed8', '#fbbf24'],
      CAR: ['#0f172a', '#b91c1c', '#ef4444'],
      CBJ: ['#0f172a', '#1d4ed8', '#7f1d1d'],
      CGY: ['#991b1b', '#dc2626', '#f59e0b'],
      CHI: ['#991b1b', '#dc2626', '#111827'],
      COL: ['#5b1020', '#7c1630', '#1e3a8a'],
      DAL: ['#0f5132', '#15803d', '#111827'],
      DET: ['#991b1b', '#dc2626', '#111827'],
      EDM: ['#0f172a', '#1d4ed8', '#f97316'],
      FLA: ['#7f1d1d', '#b91c1c', '#c59d5f'],
      LA: ['#111827', '#374151', '#6b7280'],
      LAK: ['#111827', '#374151', '#6b7280'],
      MIN: ['#14532d', '#15803d', '#b45309'],
      MTL: ['#0b2a6f', '#1d4ed8', '#c1121f'],
      NJ: ['#991b1b', '#dc2626', '#111827'],
      NJD: ['#991b1b', '#dc2626', '#111827'],
      NSH: ['#1f2937', '#eab308', '#fbbf24'],
      NYI: ['#1e3a8a', '#2563eb', '#f97316'],
      NYR: ['#1d4ed8', '#2563eb', '#b91c1c'],
      OTT: ['#7f1d1d', '#b91c1c', '#111827'],
      PHI: ['#9a3412', '#ea580c', '#111827'],
      PIT: ['#111827', '#facc15', '#374151'],
      SEA: ['#0f3d56', '#0f766e', '#7c3aed'],
      SJ: ['#115e59', '#0f766e', '#111827'],
      SJS: ['#115e59', '#0f766e', '#111827'],
      STL: ['#1d4ed8', '#2563eb', '#fbbf24'],
      TB: ['#0f172a', '#1d4ed8', '#2563eb'],
      TBL: ['#0f172a', '#1d4ed8', '#2563eb'],
      TOR: ['#0f172a', '#1d4ed8', '#2563eb'],
      UTA: ['#312e81', '#4338ca', '#60a5fa'],
      VAN: ['#0f172a', '#15803d', '#1d4ed8'],
      VGK: ['#8b6b2e', '#c19a49', '#111827'],
      WPG: ['#0f172a', '#1d4ed8', '#60a5fa'],
      WSH: ['#7f1d1d', '#b91c1c', '#1d4ed8'],
    };

    if (!teamCode) {
      return ['#0f172a', '#1e3a8a', '#334155'];
    }

    return map[teamCode.toUpperCase()] ?? ['#0f172a', '#1e3a8a', '#334155'];
  }

  private normalizeTeamKey(value?: string | null): string {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  getTeamLogoUrl(teamValue?: string | null): string | null {
    const key = this.normalizeTeamKey(teamValue);

    if (!key) {
      return null;
    }

    // Mapping CDN NHL pour les équipes "normales"
    const logoCodeMap: Record<string, string> = {
      ana: 'ANA',
      ducks: 'ANA',
      'anaheim ducks': 'ANA',

      bos: 'BOS',
      bruins: 'BOS',
      'boston bruins': 'BOS',

      buf: 'BUF',
      sabres: 'BUF',
      'buffalo sabres': 'BUF',

      car: 'CAR',
      hurricanes: 'CAR',
      'carolina hurricanes': 'CAR',

      cbj: 'CBJ',
      'blue jackets': 'CBJ',
      'columbus blue jackets': 'CBJ',

      cgy: 'CGY',
      flames: 'CGY',
      'calgary flames': 'CGY',

      chi: 'CHI',
      blackhawks: 'CHI',
      'chicago blackhawks': 'CHI',

      col: 'COL',
      avalanche: 'COL',
      'colorado avalanche': 'COL',

      dal: 'DAL',
      stars: 'DAL',
      'dallas stars': 'DAL',

      det: 'DET',
      'red wings': 'DET',
      'detroit red wings': 'DET',

      edm: 'EDM',
      oilers: 'EDM',
      'edmonton oilers': 'EDM',

      fla: 'FLA',
      panthers: 'FLA',
      'florida panthers': 'FLA',

      la: 'LAK',
      lak: 'LAK',
      kings: 'LAK',
      'los angeles kings': 'LAK',

      min: 'MIN',
      wild: 'MIN',
      'minnesota wild': 'MIN',

      mtl: 'MTL',
      canadiens: 'MTL',
      'montreal canadiens': 'MTL',
      'montréal canadiens': 'MTL',

      nj: 'NJD',
      njd: 'NJD',
      devils: 'NJD',
      'new jersey devils': 'NJD',

      nsh: 'NSH',
      predators: 'NSH',
      'nashville predators': 'NSH',

      nyi: 'NYI',
      islanders: 'NYI',
      'new york islanders': 'NYI',

      nyr: 'NYR',
      rangers: 'NYR',
      'new york rangers': 'NYR',

      ott: 'OTT',
      senators: 'OTT',
      'ottawa senators': 'OTT',

      phi: 'PHI',
      flyers: 'PHI',
      'philadelphia flyers': 'PHI',

      pit: 'PIT',
      penguins: 'PIT',
      'pittsburgh penguins': 'PIT',

      sea: 'SEA',
      kraken: 'SEA',
      'seattle kraken': 'SEA',

      sj: 'SJS',
      sjs: 'SJS',
      sharks: 'SJS',
      'san jose sharks': 'SJS',

      stl: 'STL',
      blues: 'STL',
      'st. louis blues': 'STL',
      'st louis blues': 'STL',

      tb: 'TBL',
      tbl: 'TBL',
      lightning: 'TBL',
      'tampa bay lightning': 'TBL',

      tor: 'TOR',
      'maple leafs': 'TOR',
      'toronto maple leafs': 'TOR',

      van: 'VAN',
      canucks: 'VAN',
      'vancouver canucks': 'VAN',

      vgk: 'VGK',
      'golden knights': 'VGK',
      'vegas golden knights': 'VGK',

      wpg: 'WPG',
      jets: 'WPG',
      'winnipeg jets': 'WPG',

      wsh: 'WSH',
      capitals: 'WSH',
      'washington capitals': 'WSH',

      uta: 'UTA',
      mammoth: 'UTA',
      'utah mammoth': 'UTA',
      'utah hockey club': 'UTA',

      ari: 'ARI',
      coyotes: 'ARI',
      'arizona coyotes': 'ARI',
    };

    const assetCode = logoCodeMap[key];
    if (!assetCode) {
      return null;
    }

    return `https://assets.nhle.com/logos/nhl/svg/${assetCode}_dark.svg`;
  }

  onHistoricalLogoError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }

    img.style.display = 'none';
  }
}
