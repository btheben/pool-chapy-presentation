import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayoffStats } from './playoff-stats';

describe('PlayoffStats', () => {
  let component: PlayoffStats;
  let fixture: ComponentFixture<PlayoffStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayoffStats],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayoffStats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
