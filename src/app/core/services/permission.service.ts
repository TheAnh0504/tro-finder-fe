import { inject, Injectable } from '@angular/core';
import { EPermission } from '../../enum/EPermission.enum';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  hasAnyPermission(permissionPage: EPermission[]): boolean {
    const tokenService = inject(TokenService);

    const userPermissions = tokenService.getListPermission();

    return userPermissions.some((p) => permissionPage.includes(p));
  }

  hasAllPermission(permissionPage: EPermission[]): boolean {
    const tokenService = inject(TokenService);

    const userPermissions = tokenService.getListPermission();

    return permissionPage.every((p) => userPermissions.includes(p));
  }
}
