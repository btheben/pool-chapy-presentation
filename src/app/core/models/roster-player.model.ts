export interface RosterPlayer {
  rosterAssignmentId: number;
  playerId: number;
  slotCode: string;
  slotType: string;
  playerName: string;
  positionCode: string;
  nhlTeamCode: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  poolPoints: number;
  category: string;
  countsForTotals: boolean;
  goalieWins: number;
  shutouts: number;
  teamWins: number;
  teamOtLosses: number;
  recentGoals: number;
  recentAssists: number;
  recentPoolPoints: number;
  recentGoalieWins: number;
  recentShutouts: number;
  recentTeamWins: number;
  recentTeamOtLosses: number;
}
