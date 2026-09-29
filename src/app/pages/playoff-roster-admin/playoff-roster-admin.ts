import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import {
  AdminAvailableUser,
  AdminSeasonMember,
  LogoAsset,
  PlayerSearchResult,
  SeasonApiService,
  SeasonSlot,
} from '../../core/services/season-api.service';
import { MemberRoster } from '../../core/models/member-roster.model';

type AdminTab = 'sync' | 'roster' | 'member' | 'logo';

@Component({
  selector: 'app-playoff-roster-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './playoff-roster-admin.html',
  styleUrl: './playoff-roster-admin.css',
})
export class PlayoffRosterAdminComponent implements OnInit {
  private api = inject(SeasonApiService);
  private cdr = inject(ChangeDetectorRef);

  seasonLabel = '2026-playoffs';

  activeTab: AdminTab = 'roster';

  members: AdminSeasonMember[] = [];
  selectedUsername = '';

  availableUsers: AdminAvailableUser[] = [];
  newMemberUsername = '';
  newMemberTeamName = '';
  addingMember = false;

  query = '';
  players: PlayerSearchResult[] = [];
  selectedPlayer: PlayerSearchResult | null = null;

  slots: SeasonSlot[] = [];
  roster: MemberRoster | null = null;

  loading = true;
  searching = false;
  saving = false;
  rosterLoading = false;
  removingAssignmentId: number | null = null;

  syncingMode: 'recent' | 'live' | 'full' | null = null;
  recentLookbackDays = 2;

  message = '';
  error = '';
  syncMessage = '';
  syncError = '';

  logoAssets: LogoAsset[] = [];
  selectedLogoAssetId: number | null = null;
  logosLoading = false;
  savingLogo = false;
  logoMessage = '';
  logoError = '';

  ngOnInit(): void {
    this.loadSeasonSlots();
    this.loadMembers();
    this.loadAvailableUsers();
    this.loadLogoAssets();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.message = '';
    this.error = '';
    this.syncMessage = '';
    this.syncError = '';
    this.logoMessage = '';
    this.logoError = '';

    if (tab === 'logo') {
      this.syncSelectedLogoFromMember();
    }
  }

  memberLabel(member: AdminSeasonMember): string {
    if (!member.teamName || member.teamName === member.displayName) {
      return member.displayName;
    }

    return `${member.displayName} — ${member.teamName}`;
  }

  playerLabel(player: PlayerSearchResult): string {
    if (player.alreadyAssigned && player.assignedToTeamName) {
      return `${player.fullName} (${player.assignedToTeamName})`;
    }

    return player.fullName;
  }

  get selectedMember(): AdminSeasonMember | undefined {
    return this.members.find((member) => member.username === this.selectedUsername);
  }

  get filledSlotsCount(): number {
    const filled = new Set((this.roster?.roster ?? []).map((player) => player.slotCode));
    return filled.size;
  }

  get duplicateCount(): number {
    return this.slots.filter((slot) => this.hasDuplicateSlot(slot.slotCode)).length;
  }

  get totalEntries(): number {
    return this.roster?.roster?.length ?? 0;
  }

  get rosterEntriesSorted() {
    return [...(this.roster?.roster ?? [])].sort((a, b) => {
      const slotCompare = this.compareSlotCodes(a.slotCode, b.slotCode);
      if (slotCompare !== 0) {
        return slotCompare;
      }

      return a.playerName.localeCompare(b.playerName, 'fr', { sensitivity: 'base' });
    });
  }

  get isAnySyncing(): boolean {
    return this.syncingMode !== null;
  }

  loadSeasonSlots(): void {
    this.api.getSeasonSlots(this.seasonLabel).subscribe({
      next: (slots: SeasonSlot[]) => {
        this.slots = slots;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Impossible de charger les slots de la saison.';
        this.cdr.markForCheck();
      },
    });
  }

  loadMembers(): void {
    this.loading = true;
    this.error = '';
    this.message = '';

    this.api.getAdminSeasonMembers(this.seasonLabel).subscribe({
      next: (members: AdminSeasonMember[]) => {
        this.members = members;
        this.selectedUsername = members[0]?.username ?? '';
        this.loading = false;

        if (this.selectedUsername) {
          this.loadRoster();
        }

        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Impossible de charger les membres.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadAvailableUsers(): void {
    this.api.getAvailableUsersForSeason(this.seasonLabel).subscribe({
      next: (users: AdminAvailableUser[]) => {
        this.availableUsers = users;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Impossible de charger les utilisateurs disponibles.';
        this.cdr.detectChanges();
      },
    });
  }

  onMemberChange(): void {
    this.clearTransientState();
    this.syncSelectedLogoFromMember();
    this.loadRoster();
  }

  loadRoster(): void {
    if (!this.selectedUsername) {
      this.roster = null;
      return;
    }

    this.rosterLoading = true;
    this.error = '';
    this.message = '';

    this.api.getMemberRoster(this.seasonLabel, this.selectedUsername).subscribe({
      next: (roster: MemberRoster) => {
        this.roster = roster;
        this.rosterLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Impossible de charger le roster actuel.';
        this.rosterLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  searchPlayers(): void {
    if (this.query.trim().length < 2) {
      this.players = [];
      return;
    }

    this.searching = true;
    this.error = '';
    this.message = '';

    this.api.searchPlayers(this.seasonLabel, this.query).subscribe({
      next: (players: PlayerSearchResult[]) => {
        this.players = players;
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Recherche joueur impossible.';
        this.searching = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectPlayer(player: PlayerSearchResult): void {
    if (player.alreadyAssigned) {
      return;
    }

    this.selectedPlayer = player;
    this.query = player.fullName;
    this.players = [];
  }

  clearSelectedPlayer(): void {
    this.selectedPlayer = null;
    this.query = '';
    this.players = [];
  }

  addPlayer(): void {
    if (!this.selectedUsername || !this.selectedPlayer) {
      this.error = 'Choisis un membre et un joueur.';
      return;
    }

    this.saving = true;
    this.error = '';
    this.message = '';

    const addedPlayerName = this.selectedPlayer.fullName;

    this.api
      .addRosterPlayer(this.seasonLabel, this.selectedUsername, this.selectedPlayer.id, '')
      .pipe(switchMap(() => this.api.rebuildSeasonStandings(this.seasonLabel)))
      .subscribe({
        next: () => {
          this.message = `${addedPlayerName} ajouté au prochain slot disponible. Classement mis à jour.`;
          this.clearSelectedPlayer();
          this.saving = false;
          this.loadSeasonSlots();
          this.loadRoster();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.error = err?.error?.message || 'Impossible d’ajouter le joueur.';
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  removeRosterPlayer(rosterAssignmentId: number, playerName: string): void {
    if (!this.selectedUsername) {
      return;
    }

    const confirmed = window.confirm(`Supprimer ${playerName} du roster ?`);
    if (!confirmed) {
      return;
    }

    this.removingAssignmentId = rosterAssignmentId;
    this.error = '';
    this.message = '';

    this.api
      .removeRosterPlayer(this.seasonLabel, rosterAssignmentId)
      .pipe(switchMap(() => this.api.rebuildSeasonStandings(this.seasonLabel)))
      .subscribe({
        next: () => {
          this.message = 'Entrée supprimée du roster. Classement mis à jour.';
          this.removingAssignmentId = null;
          this.loadSeasonSlots();
          this.loadRoster();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.error = err?.error?.message || 'Impossible de supprimer l’entrée.';
          this.removingAssignmentId = null;
          this.cdr.detectChanges();
        },
      });
  }

  addMemberToSeason(): void {
    if (!this.newMemberUsername) {
      this.error = 'Choisis un utilisateur à ajouter.';
      return;
    }

    this.addingMember = true;
    this.error = '';
    this.message = '';

    this.api
      .addSeasonMember(this.seasonLabel, this.newMemberUsername, this.newMemberTeamName.trim())
      .subscribe({
        next: () => {
          this.message = 'Membre ajouté au pool.';
          this.newMemberUsername = '';
          this.newMemberTeamName = '';
          this.addingMember = false;
          this.loadMembers();
          this.loadAvailableUsers();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.error = err?.error?.message || 'Impossible d’ajouter le membre.';
          this.addingMember = false;
          this.cdr.detectChanges();
        },
      });
  }

  syncRecent(): void {
    this.runSync(
      'recent',
      () => this.api.syncPlayoffsRecent(this.recentLookbackDays, this.seasonLabel),
      `Sync quotidien complétée (${this.recentLookbackDays} jours).`,
    );
  }

  syncLiveNow(): void {
    this.runSync('live', () => this.api.syncLiveNow(this.seasonLabel), 'Sync live complétée.');
  }

  syncFull(): void {
    const confirmed = window.confirm(
      'Rebuild complet des séries ? C’est plus long et utile surtout pour réparation/dev.',
    );

    if (!confirmed) {
      return;
    }

    this.runSync('full', () => this.api.syncPlayoffsAll(), 'Rebuild complet terminé.');
  }

  hasDuplicateSlot(slotCode: string): boolean {
    const matches = this.roster?.roster?.filter((player) => player.slotCode === slotCode) ?? [];
    return matches.length > 1;
  }

  trackByRosterAssignment(_: number, player: { rosterAssignmentId: number }): number {
    return player.rosterAssignmentId;
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

  private runSync(
    type: 'recent' | 'live' | 'full',
    requestFactory: () => any,
    successMessage: string,
  ): void {
    this.syncMessage = '';
    this.syncError = '';
    this.syncingMode = type;

    requestFactory()
      .pipe(
        finalize(() => {
          this.syncingMode = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (result: unknown) => {
          console.log('sync result', result);
          this.syncMessage = successMessage;
          this.loadSeasonSlots();
          this.loadRoster();
          this.loadMembers();
        },
        error: (err: unknown) => {
          console.error(err);
          this.syncError = 'La synchronisation a échoué.';
        },
      });
  }

  private clearTransientState(): void {
    this.message = '';
    this.error = '';
    this.selectedPlayer = null;
    this.query = '';
    this.players = [];
  }

  private compareSlotCodes(a: string, b: string): number {
    const parsedA = this.parseSlotCode(a);
    const parsedB = this.parseSlotCode(b);

    if (parsedA.rank !== parsedB.rank) {
      return parsedA.rank - parsedB.rank;
    }

    if (parsedA.index !== parsedB.index) {
      return parsedA.index - parsedB.index;
    }

    return a.localeCompare(b, 'fr', { sensitivity: 'base' });
  }

  private parseSlotCode(slotCode: string): { rank: number; index: number } {
    const match = slotCode.match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
      return { rank: 99, index: 999 };
    }

    const prefix = match[1].toUpperCase();
    const index = Number(match[2]);

    const rankMap: Record<string, number> = {
      F: 1,
      D: 2,
      G: 3,
      T: 4,
    };

    return {
      rank: rankMap[prefix] ?? 99,
      index,
    };
  }

  loadLogoAssets(): void {
    this.logosLoading = true;
    this.logoError = '';

    this.api.getLogoAssets(this.seasonLabel).subscribe({
      next: (logos: LogoAsset[]) => {
        this.logoAssets = logos;
        this.logosLoading = false;
        this.syncSelectedLogoFromMember();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.logoError = 'Impossible de charger les logos.';
        this.logosLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  syncSelectedLogoFromMember(): void {
    const member = this.selectedMember;
    if (!member?.logoUrl) {
      this.selectedLogoAssetId = null;
      return;
    }

    const matchingLogo = this.logoAssets.find((logo) => logo.logoUrl === member.logoUrl);
    this.selectedLogoAssetId = matchingLogo?.id ?? null;
  }

  selectLogo(logo: LogoAsset): void {
    this.selectedLogoAssetId = logo.id;
    this.logoMessage = '';
    this.logoError = '';
  }

  clearLogo(): void {
    this.selectedLogoAssetId = null;
  }

  saveSelectedLogo(): void {
    if (!this.selectedUsername) {
      this.logoError = 'Choisis un membre.';
      return;
    }

    this.savingLogo = true;
    this.logoError = '';
    this.logoMessage = '';

    this.api
      .updateMemberLogo(this.seasonLabel, this.selectedUsername, this.selectedLogoAssetId)
      .subscribe({
        next: () => {
          this.logoMessage = 'Logo assigné au membre.';
          this.savingLogo = false;
          this.loadMembers();
          this.loadRoster();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error(err);
          this.logoError = err?.error?.message || 'Impossible d’assigner le logo.';
          this.savingLogo = false;
          this.cdr.detectChanges();
        },
      });
  }

  get selectedLogoAsset(): LogoAsset | undefined {
    return this.logoAssets.find((logo) => logo.id === this.selectedLogoAssetId);
  }
}
