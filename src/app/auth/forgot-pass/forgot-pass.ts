import { Component, OnInit, signal, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-forgot-pass',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-pass.html',
  styleUrl: './forgot-pass.scss',
})
export class ForgotPass implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private toast = inject(ToastrService);

  // Trạng thái
  token = signal<string | null>(null);
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Forms
  forgotForm!: FormGroup; // Form nhập username
  resetForm!: FormGroup; // Form đặt lại mật khẩu

  ngOnInit() {
    if (this.tokenService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
    // 1. Bắt Token từ URL queryParam
    this.route.queryParamMap.subscribe((params) => {
      this.token.set(params.get('token'));
      this.initForms();
    });
  }

  initForms() {
    if (!this.token()) {
      this.router.navigate(['/auth/forgot-password']);
      // Form khi chưa có token
      this.forgotForm = this.fb.group({
        username: ['', [Validators.required]],
      });
    } else {
      // Form khi đã có token
      this.resetForm = this.fb.group(
        {
          password: ['', [Validators.required, Validators.minLength(6)]],
          confirmPassword: ['', [Validators.required]],
        },
        { validators: this.passwordMatchValidator },
      );
    }
  }

  passwordMatchValidator(g: AbstractControl) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  get f() {
    return this.forgotForm?.controls;
  }
  get r() {
    return this.resetForm?.controls;
  }

  // Gửi Username để nhận OTP/Email reset
  sendOtp() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    this.authService.forgetPassword(this.forgotForm.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        this.toast.success(
          'Yêu cầu reset mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn! Bạn sẽ được chuyển về trang đăng nhập sau 5 giây.',
          'Thành công',
          {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          },
        );

        setTimeout(() => {
          this.isLoading.set(false);
          // Sau khi thành công, chuyển về login
          this.router.navigate(['/auth/sign-in']);
        }, 6000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  // Xác nhận đổi mật khẩu mới
  confirmForgetPass() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);

    const payload = {
      token: this.token(),
      password: this.resetForm.value.password,
    };

    this.authService.confirmForgetPassword(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        this.toast.success(
          'Đổi mật khẩu thành công! Bạn sẽ được chuyển về trang đăng nhập sau 5 giây.',
          'Thành công',
          {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          },
        );

        setTimeout(() => {
          this.isLoading.set(false);
          // Sau khi thành công, chuyển về login
          this.router.navigate(['/auth/sign-in']);
        }, 6000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  togglePass() {
    this.showPassword.set(!this.showPassword());
  }
  toggleConfirmPass() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }
  goToLogin() {
    this.router.navigate(['/auth/sign-in']);
  }
}
