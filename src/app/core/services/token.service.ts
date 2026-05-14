import { Injectable } from '@angular/core';
import { EPermission } from '../../enum/EPermission.enum';
import { InfoUser } from '../models/info-user.model';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private ACCESS_TOKEN = 'access_token';
  private LIST_PERMISSION = 'list_permission';
  private INFO_USER = 'info_user';

  setTokens(access: string, permissions: string[], userInfo: InfoUser) {
    this.setAccessToken(access);
    this.setListPermission(permissions);
    this.setUserInfo(userInfo);
    console.log(access, permissions, userInfo);
  }

  setUserInfo(userInfo: InfoUser) {
    sessionStorage.setItem(this.INFO_USER, JSON.stringify(userInfo));
  }

  getUserInfo(): InfoUser | null {
    const userInfo = sessionStorage.getItem(this.INFO_USER);
    if (!userInfo) {
      return null;
    }

    return JSON.parse(userInfo) as InfoUser;
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
