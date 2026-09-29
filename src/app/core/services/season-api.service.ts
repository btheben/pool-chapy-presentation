import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MemberRoster } from '../models/member-roster.model';

export interface StandingRow {
  rank: number;
  username: string;
  displayName: string;
  teamName: string;
  logoUrl: string | null;
  totalPoints: number;
  pointsFromFirst: number;
  seasonMemberId: number;
  pointsYesterday?: number | null;
  rankChange?: number | null;
}

export interface PlayoffScorer {
  playerName: string;
  positionCode: string;
  teamCode: string;
  gamesTracked: number;
  goals: number;
  assists: number;
  points: number;
  poolPoints: number;
}

export interface AdminSeasonMember {
  username: string;
  displayName: string;
  teamName: string;
  logoUrl?: string | null;
}

export interface PlayerSearchResult {
  id: number;
  nhlApiPlayerId: number | null;
  fullName: string;
  positionCode: string;
  teamCode: string | null;
  alreadyAssigned: boolean;
  assignedToTeamName: string | null;
}

export interface PlayerTrend {
  status: 'HOT' | 'COLD' | 'NEUTRAL';
  label: string;
  detail: string;
  recentGames: number;
  recentPoints: number;
  recentPoolPoints: number;
}

export interface PlayerSeasonSummary {
  seasonLabel: string;
  seasonType: 'REGULAR' | 'PLAYOFFS' | string;
  teamCode: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

export interface PlayerGameLog {
  gameDate: string;
  teamCode: string | null;
  opponentCode: string | null;
  gameState: string | null;
  goals: number;
  assists: number;
  goalieWin: boolean | null;
  shutout: boolean | null;
  fantasyPoints: number;
}

export interface PlayerPlayoffSummary {
  playerId: number;
  nhlApiPlayerId: number | null;
  fullName: string;
  positionCode: string;
  teamCode: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  fantasyPoints: number;
  shootsCatches: string | null;
  sweaterNumber: number | null;
  heightInInches: number | null;
  weightInPounds: number | null;
  birthDate: string | null;
  birthCity: string | null;
  birthCountry: string | null;
  poolOwnerDisplayName: string | null;
  poolOwnerTeamName: string | null;
  trend: PlayerTrend | null;
  previousSeasons: PlayerSeasonSummary[];
  games: PlayerGameLog[];
}

export interface SeasonSlot {
  id: number;
  slotCode: string;
  slotType: string;
  slotNumber: number;
  label: string | null;
}

export interface AdminAvailableUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
}

export interface LogoAsset {
  id: number;
  code: string;
  displayName: string;
  logoUrl: string;
  sourceType: string;
  theme: string | null;
}

export interface NhlTeamDraftedTeam {
  drafted: boolean;
  draftedByUsername: string | null;
  draftedByDisplayName: string | null;
  draftedByTeamName: string | null;
  slotCode: string | null;
}

export interface NhlTeamPlayer {
  playerId: number;
  nhlApiPlayerId: number | null;
  fullName: string;
  positionCode: string;
  teamCode: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  poolPoints: number;
  goalieWins: number;
  shutouts: number;
  drafted: boolean;
  draftedByUsername: string | null;
  draftedByDisplayName: string | null;
  draftedByTeamName: string | null;
  slotCode: string | null;
}

export interface NhlTeamRoster {
  seasonLabel: string;
  teamCode: string;
  teamName: string;
  logoUrl: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  totalPoolPoints: number;
  draftedPlayerCount: number;
  freeAgentCount: number;
  draftedTeam: NhlTeamDraftedTeam;
  players: NhlTeamPlayer[];
}

export type PlayerStatsPositionFilter = 'ALL' | 'FORWARD' | 'DEFENSE' | 'GOALIE' | 'TEAM';

export interface SeasonPlayerStats {
  playerId: number;
  nhlApiPlayerId: number | null;
  playerName: string;
  positionCode: string;
  positionGroup: PlayerStatsPositionFilter | 'OTHER';
  nhlTeamCode: string | null;
  nhlTeamLogoUrl: string | null;

  gamesPlayed: number;
  goals: number;
  assists: number;
  poolPoints: number;

  goalieWins: number;
  shutouts: number;

  drafted: boolean;
  draftedByUsername: string | null;
  draftedByDisplayName: string | null;
  draftedByTeamName: string | null;
  draftedSlotCode: string | null;

  currentStatusType: string | null;
  currentStatusLabel: string | null;
  currentStatusReason: string | null;
  currentStatusExpectedReturn: string | null;
  currentStatusUpdatedAt: string | null;
}
@Injectable({
  providedIn: 'root',
})
export class SeasonApiService {
  private http = inject(HttpClient);

  private baseApiUrl = 'http://192.168.2.13:8081/api';
  private adminNhlBaseUrl = 'http://192.168.2.13:8081/api/admin/nhl';
  private adminBaseUrl = 'http://192.168.2.13:8081/api/admin';

  private readonly apiRoot = 'http://192.168.2.13:8081/api';
  private readonly baseUrl = `${this.apiRoot}/seasons`;

  private readonly credentials = { withCredentials: true };

  getStandings(season: string): Observable<StandingRow[]> {
    return this.http.get<StandingRow[]>(`${this.baseUrl}/${season}/standings`, this.credentials);
  }

  getMemberRoster(season: string, username: string): Observable<MemberRoster> {
    return this.http.get<MemberRoster>(
      `${this.baseUrl}/${season}/members/${username}/roster`,
      this.credentials,
    );
  }

  syncGamesFrom(startDate: string): Observable<any> {
    return this.http.post<any>(
      `${this.adminNhlBaseUrl}/sync/from/${startDate}`,
      {},
      this.credentials,
    );
  }

  syncPlayersFrom(startDate: string): Observable<any> {
    return this.http.post<any>(
      `${this.adminNhlBaseUrl}/sync/from/${startDate}/players`,
      {},
      this.credentials,
    );
  }

  syncPlayoffsRecent(lookbackDays: number, seasonLabel: string) {
    return this.http.post<any>(
      `${this.adminNhlBaseUrl}/sync/playoffs/recent?lookbackDays=${lookbackDays}&seasonLabel=${encodeURIComponent(seasonLabel)}`,
      {},
      this.credentials,
    );
  }

  syncLiveNow(seasonLabel?: string) {
    const suffix = seasonLabel ? `?seasonLabel=${encodeURIComponent(seasonLabel)}` : '';
    return this.http.post<any>(
      `${this.adminNhlBaseUrl}/sync/live-now${suffix}`,
      {},
      this.credentials,
    );
  }

  syncPlayoffsAll() {
    return this.http.post<any>(`${this.adminNhlBaseUrl}/sync/playoffs/all`, {}, this.credentials);
  }

  getPlayoffScorers(): Observable<PlayoffScorer[]> {
    return this.http.get<PlayoffScorer[]>(
      `${this.baseApiUrl}/stats/playoffs/scorers`,
      this.credentials,
    );
  }

  getPlayoffPoolPoints(): Observable<PlayoffScorer[]> {
    return this.http.get<PlayoffScorer[]>(
      `${this.baseApiUrl}/stats/playoffs/pool-points`,
      this.credentials,
    );
  }

  getAdminSeasonMembers(seasonLabel: string): Observable<AdminSeasonMember[]> {
    return this.http.get<AdminSeasonMember[]>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/members`,
      this.credentials,
    );
  }

  searchPlayers(season: string, query: string, slotCode?: string) {
    const params = new URLSearchParams({
      seasonLabel: season,
      query,
    });

    if (slotCode) {
      params.set('slotCode', slotCode);
    }

    return this.http.get<PlayerSearchResult[]>(
      `${this.baseApiUrl}/admin/players/search?${params.toString()}`,
      this.credentials,
    );
  }

  getPlayerPlayoffSummary(playerId: number): Observable<PlayerPlayoffSummary> {
    return this.http.get<PlayerPlayoffSummary>(
      `${this.baseApiUrl}/players/${playerId}/playoffs`,
      this.credentials,
    );
  }

  addRosterPlayer(
    seasonLabel: string,
    username: string,
    nhlPlayerId: number,
    slotCode: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/members/${username}/roster`,
      { nhlPlayerId, slotCode },
      this.credentials,
    );
  }

  removeRosterPlayer(seasonLabel: string, rosterAssignmentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/roster/${rosterAssignmentId}`,
      this.credentials,
    );
  }

  getSeasonSlots(seasonLabel: string): Observable<SeasonSlot[]> {
    return this.http.get<SeasonSlot[]>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/slots`,
      this.credentials,
    );
  }

  rebuildSeasonStandings(seasonLabel: string) {
    return this.http.post<any>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/standings/rebuild`,
      {},
      this.credentials,
    );
  }

  getAvailableUsersForSeason(seasonLabel: string) {
    return this.http.get<AdminAvailableUser[]>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/available-users`,
      this.credentials,
    );
  }

  addSeasonMember(seasonLabel: string, username: string, teamName: string) {
    return this.http.post<void>(
      `${this.adminBaseUrl}/seasons/${seasonLabel}/members`,
      {
        username,
        teamName,
      },
      this.credentials,
    );
  }

  getTeamsInActionToday(season: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/${season}/teams-in-action-today`,
      this.credentials,
    );
  }

  getLogoAssets(seasonLabel: string) {
    return this.http.get<LogoAsset[]>(
      `${this.apiRoot}/admin/seasons/${seasonLabel}/logos`,
      this.credentials,
    );
  }

  updateMemberLogo(seasonLabel: string, username: string, logoAssetId: number | null) {
    return this.http.put<void>(
      `${this.apiRoot}/admin/seasons/${seasonLabel}/members/${username}/logo`,
      { logoAssetId },
      this.credentials,
    );
  }

  getNhlTeamRoster(seasonLabel: string, teamCode: string): Observable<NhlTeamRoster> {
    return this.http.get<NhlTeamRoster>(
      `${this.baseUrl}/${encodeURIComponent(seasonLabel)}/teams/${encodeURIComponent(teamCode)}`,
      this.credentials,
    );
  }

  getSeasonPlayerStats(
    seasonLabel: string,
    position: PlayerStatsPositionFilter = 'ALL',
    freeAgentsOnly = false,
  ): Observable<SeasonPlayerStats[]> {
    const params = new URLSearchParams({
      position,
      freeAgentsOnly: String(freeAgentsOnly),
    });

    return this.http.get<SeasonPlayerStats[]>(
      `${this.baseUrl}/${encodeURIComponent(seasonLabel)}/player-stats?${params.toString()}`,
      this.credentials,
    );
  }
}
