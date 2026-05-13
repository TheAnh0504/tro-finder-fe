import { Injectable } from '@angular/core';
import { EPermission } from '../../enum/EPermission.enum';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private ACCESS_TOKEN = 'access_token';
  private LIST_PERMISSION = 'list_permission';

  setTokens(access: string, permissions: string[]) {
    this.setAccessToken(access);
    this.setListPermission(permissions);
  }

  setAccessToken(access: string) {
    sessionStorage.setItem(this.ACCESS_TOKEN, access);
  }

  setListPermission(permissions: string[]) {
    sessionStorage.setItem(this.LIST_PERMISSION, JSON.stringify(permissions));
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN);
  }

  getListPermission(): EPermission[] {
    const permissions = sessionStorage.getItem(this.LIST_PERMISSION);
    if (!permissions) {
      return [];
    }

    const parsed: string[] = JSON.parse(permissions);

    return parsed.filter((value): value is EPermission =>
      Object.values(EPermission).includes(value as EPermission),
    );
  }

  convertToListPermission(permissions: string): EPermission[] {
    const listPermission = permissions.split(',').map((permission) => permission.trim());

    return listPermission.filter((value): value is EPermission =>
      Object.values(EPermission).includes(value as EPermission),
    );
  }

  clear() {
    sessionStorage.clear();
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }
}
