import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SysUser } from './sys-user';

describe('SysUser', () => {
  let component: SysUser;
  let fixture: ComponentFixture<SysUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SysUser],
    }).compileComponents();

    fixture = TestBed.createComponent(SysUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
