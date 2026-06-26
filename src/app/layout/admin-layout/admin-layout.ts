import { RouterOutlet } from '@angular/router';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { EPermission } from '../../enum/EPermission.enum';
import { InfoUser } from '../../core/models/info-user.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { ChatBubble } from '../chat-bubble/chat-bubble';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, ChatBubble],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit {
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);
  private authService = inject(AuthService);
  private permissionService = inject(PermissionService);

  isLoading = signal(false);

  // User Dropdown
  isDropdownOpen = signal(false);
  currentUser = signal({
    name: '',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff',
    role: '',
  });

  ngOnInit(): void {
    if (this.isLogin) {
      const user: InfoUser | null = this.tokenService.getUserInfo();
      let name = user?.name || 'Anonymous';
      let avatar = 'https://ui-avatars.com/api/?name=' + name + '&background=10b981&color=fff';
      if (user?.urlImage) {
        this.authService.getImageFace().subscribe({
          next: (blob: any) => {
            const objectUrl = URL.createObjectURL(blob);
            avatar = objectUrl;
          },
          error: (err) => {
            this.toast.error(err.error?.message, 'Lỗi', {
              timeOut: 3000,
              progressBar: true,
              positionClass: 'toast-top-right',
            });
          },
        });
      }
      this.currentUser.set({
        name: name,
        avatar: avatar,
        role: user?.role || '',
      });
    }
  }

  get canManageRoles() {
    return this.permissionService.hasAnyPermission([
      EPermission.ADD_ROLE,
      EPermission.UPDATE_ROLE,
      EPermission.FIND_ROLE,
      EPermission.GET_ROLE,
      EPermission.DELETE_ROLE,
    ]);
  }
  get canManageUsers() {
    return this.permissionService.hasAnyPermission([
      EPermission.ADD_USER,
      EPermission.ADMIN_UPDATE_USER,
      EPermission.FIND_USER,
      EPermission.GET_USER,
      EPermission.DELETE_USER,
      EPermission.LOCK_USER,
      EPermission.UNLOCK_USER,
    ]);
  }
  get canManageHouses() {
    return this.permissionService.hasAnyPermission([
      EPermission.ADD_HOUSE,
      EPermission.UPDATE_HOUSE,
      EPermission.FIND_HOUSE,
      EPermission.GET_HOUSE,
      EPermission.DELETE_HOUSE,
    ]);
  }
  get canManageSavedRoom() {
    return this.permissionService.hasAnyPermission([
      EPermission.ADD_SAVED_ROOM,
      EPermission.DELETE_SAVED_ROOM,
      EPermission.FIND_SAVED_ROOM,
    ]);
  }
  get canManageContracts() {
    return this.permissionService.hasAnyPermission([
      EPermission.FIND_CONTRACT,
      EPermission.GET_CONTRACT,
    ]);
  }
  get isLogin() {
    return this.tokenService.isLoggedIn();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout().subscribe({
      next: (res: any) => {
        console.log('logout success');
      },
      error: (err) => {
        this.toast.error(err.error?.message, 'Lỗi', { timeOut: 3000, progressBar: true });
        this.router.navigate(['/home'], { replaceUrl: true });
      },
    });
    this.tokenService.clear();
    this.router.navigate(['/home'], { replaceUrl: true });
  }
}
