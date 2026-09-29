import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-playoff-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './playoff-stats.html',
  styleUrl: './playoff-stats.css',
})
export class PlayoffStatsComponent {}
