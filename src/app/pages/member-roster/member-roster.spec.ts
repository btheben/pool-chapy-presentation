import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberRoster } from './member-roster';

describe('MemberRoster', () => {
  let component: MemberRoster;
  let fixture: ComponentFixture<MemberRoster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberRoster],
    }).compileComponents();

    fixture = TestBed.createComponent(MemberRoster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
