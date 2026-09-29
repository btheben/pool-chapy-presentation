import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayoffRosterAdmin } from './playoff-roster-admin';

describe('PlayoffRosterAdmin', () => {
  let component: PlayoffRosterAdmin;
  let fixture: ComponentFixture<PlayoffRosterAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayoffRosterAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayoffRosterAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
