import { Routes } from '@angular/router';
import { StandingsComponent } from './pages/standings/standings';
import { MemberRosterComponent } from './pages/member-roster/member-roster';
import { PlayoffRosterAdminComponent } from './pages/playoff-roster-admin/playoff-roster-admin';
import { PlayerStatsComponent } from './pages/player-stats/player-stats';
import { NhlTeamPageComponent } from './pages/nhl-team-page/nhl-team-page';
import { PreferencesComponent } from './pages/preferences/preferences';
import { LoginComponent } from './pages/login/login';
import { DiscussionPageComponent } from './pages/discussion-page/discussion-page';
import { SeasonPlayerStatsComponent } from './pages/season-player-stats/season-player-stats';

export const routes: Routes = [
  { path: '', redirectTo: 'standings', pathMatch: 'full' },
  { path: 'standings', component: StandingsComponent },
  { path: 'stats', component: SeasonPlayerStatsComponent },
  { path: 'admin/playoffs-rosters', component: PlayoffRosterAdminComponent },
  { path: 'seasons/:seasonLabel/members/:username', component: MemberRosterComponent },
  { path: 'players/:playerId', component: PlayerStatsComponent },
  { path: 'seasons/:seasonLabel/teams/:teamCode', component: NhlTeamPageComponent },
  { path: 'preferences', component: PreferencesComponent },
  { path: 'login', component: LoginComponent },
  { path: 'seasons/:seasonLabel/discussion', component: DiscussionPageComponent },
];
