import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedRoom } from './saved-room';

describe('SavedRoom', () => {
  let component: SavedRoom;
  let fixture: ComponentFixture<SavedRoom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedRoom],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedRoom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
