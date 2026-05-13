import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerHouse } from './manager-house';

describe('ManagerHouse', () => {
  let component: ManagerHouse;
  let fixture: ComponentFixture<ManagerHouse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerHouse],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerHouse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
