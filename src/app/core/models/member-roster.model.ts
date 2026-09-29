import { RosterPlayer } from './roster-player.model';

export interface MemberRoster {
  seasonLabel: string;
  username: string;
  displayName: string;
  teamName: string;
  logoUrl: string | null;
  finalRank: number | null;
  totalPoints: number | null;
  recentStatsDate: string | null;
  roster: RosterPlayer[];
}
