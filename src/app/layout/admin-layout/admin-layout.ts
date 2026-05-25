import { RouterOutlet } from '@angular/router';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { EPermission } from '../../enum/EPermission.enum';
import { InfoUser } from '../../core/models/info-user.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout implements OnInit {
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);
  private authService = inject(AuthService);

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

  // --- HỆ THỐNG PHÂN QUYỀN ---
  hasPermission(permission: string): boolean {
    if (!this.tokenService.isLoggedIn()) return false;
    const userPermissions = this.tokenService.getListPermission() || [];
    return userPermissions.some((p: string) => p === permission);
  }

  get canManageRoles() {
    return this.hasPermission(EPermission.ADD_ROLE);
  }
  get canManageUsers() {
    return this.hasPermission(EPermission.ADD_USER);
  }
  get canManageHouses() {
    return this.hasPermission(EPermission.ADD_HOUSE);
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
