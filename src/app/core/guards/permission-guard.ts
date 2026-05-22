import { inject } from '@angular/core';

import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';

import { PermissionService } from '../services/permission.service';
import { TokenService } from '../services/token.service';
import { EPermission } from '../../enum/EPermission.enum';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const permissionService = inject(PermissionService);
  const tokenService = inject(TokenService);

  const router = inject(Router);

  const requiredPermission: EPermission[] = route.data['permission'];

  if (permissionService.hasAnyPermission(requiredPermission)) {
    return true;
  }

  router.navigate(['/home']);

  return false;
};
