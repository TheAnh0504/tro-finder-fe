import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SignUp } from './auth/sign-up/sign-up';
import { SignIn } from './auth/sign-in/sign-in';
import { ManagerHouse } from './pages/manager-house/manager-house';
import { SysUser } from './pages/sys-user/sys-user';
import { SysRole } from './pages/sys-role/sys-role';
import { ForgotPass } from './auth/forgot-pass/forgot-pass';
import { Profile } from './pages/profile/profile';
import { authGuard } from './core/guards/auth-guard';
import { permissionGuard } from './core/guards/permission-guard';
import { EPermission } from './enum/EPermission.enum';
import { AdminLayout } from './layout/admin-layout/admin-layout';
import { SavedRoom } from './pages/saved-room/saved-room';

export const routes: Routes = [
  // 1. Chuyển hướng chính từ root
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'auth/sign-up',
    component: SignUp,
  },
  {
    path: 'auth/sign-in',
    component: SignIn,
  },
  {
    path: 'auth/forgot-password',
    component: ForgotPass,
  },

  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: 'home',
        component: Home,
      },
      {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard],
      },
      {
        path: 'manager-house',
        component: ManagerHouse,
        canActivate: [authGuard, permissionGuard],
        data: {
          permission: [
            EPermission.ADD_HOUSE,
            EPermission.UPDATE_HOUSE,
            EPermission.FIND_HOUSE,
            EPermission.GET_HOUSE,
            EPermission.DELETE_HOUSE,
          ],
        },
      },
      {
        path: 'saved-room',
        component: SavedRoom,
        canActivate: [authGuard],
      },
      {
        path: 'sys-user',
        component: SysUser,
        canActivate: [authGuard, permissionGuard],
        data: {
          permission: [
            EPermission.ADD_USER,
            EPermission.UPDATE_USER,
            EPermission.ADMIN_UPDATE_USER,
            EPermission.FIND_USER,
            EPermission.GET_USER,
            EPermission.DELETE_USER,
            EPermission.LOCK_USER,
            EPermission.UNLOCK_USER,
          ],
        },
      },
      {
        path: 'sys-role',
        component: SysRole,
        canActivate: [authGuard, permissionGuard],
        data: {
          permission: [
            EPermission.ADD_ROLE,
            EPermission.UPDATE_ROLE,
            EPermission.FIND_ROLE,
            EPermission.GET_ROLE,
            EPermission.DELETE_ROLE,
          ],
        },
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
