import { Injectable } from '@angular/core';

export interface RoomPreference {
  province?: string;
  commune?: string;
  minArea?: number;
  maxArea?: number;
  minPriceRoom?: number;
  maxPriceRoom?: number;
  airConditioner?: boolean;
  waterHeater?: boolean;
  privateBathroom?: boolean;
  washingMachine?: boolean;
  parkingArea?: boolean;
  elevator?: boolean;
  hasPet?: boolean;
  hasHost?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RoomPreferenceService {
  private STORAGE_KEY = 'room_preference';

  savePreference(criteria: RoomPreference): void {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(criteria));
  }

  getPreference(): RoomPreference | null {
    const raw = sessionStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RoomPreference;
    } catch {
      return null;
    }
  }

  clearPreference(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  hasPreference(): boolean {
    return !!sessionStorage.getItem(this.STORAGE_KEY);
  }
}
