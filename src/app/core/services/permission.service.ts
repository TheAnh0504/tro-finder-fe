import { inject, Injectable } from '@angular/core';
import { EPermission } from '../../enum/EPermission.enum';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private tokenService = inject(TokenService);

  hasPermission(permission: EPermission): boolean {
    const userPermissions = this.tokenService.getListPermission();

    return userPermissions.some((p) => p === permission);
  }

  hasAnyPermission(permissionPage: EPermission[]): boolean {
    const userPermissions = this.tokenService.getListPermission();

    return userPermissions.some((p) => permissionPage.includes(p));
  }

  hasAllPermission(permissionPage: EPermission[]): boolean {
    const userPermissions = this.tokenService.getListPermission();

    return permissionPage.every((p) => userPermissions.includes(p));
  }
}
