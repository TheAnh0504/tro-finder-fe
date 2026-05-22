import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { InfoUser } from '../../core/models/info-user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);

  ngOnInit(): void {
    // Lắng nghe sự thay đổi của query parameters
    this.route.queryParams.subscribe((params) => {
      // Bắt giá trị của key 'token'
      const token = params['token'];

      if (token === 'refresh_token') {
        // chạy api refresh token, sau đó điều hướng về home
        this.authService.refreshToken().subscribe({
          next: (res: any) => {
            console.log('Refresh token thành công:', res);
            const currentUser: InfoUser = {
              role: res.role,
              name: res.name,
              email: res.email,
              phoneNumber: res.phoneNumber,
              urlImage: res.urlImage,
            };
            this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);

            this.router.navigate(['/home'], {
              replaceUrl: true,
            });
          },
          error: (err) => {
            this.toast.error(err.error?.message, 'Lỗi', {
              timeOut: 3000,
              progressBar: true,
              positionClass: 'toast-top-right',
            });
          },
        });
      } else {
        if (!this.tokenService.isLoggedIn()) {
          this.router.navigate(['/auth/sign-in']);
        }
      }
    });
  }
}
