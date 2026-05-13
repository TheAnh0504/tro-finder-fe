import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SysRole } from './sys-role';

describe('SysRole', () => {
  let component: SysRole;
  let fixture: ComponentFixture<SysRole>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SysRole],
    }).compileComponents();

    fixture = TestBed.createComponent(SysRole);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
