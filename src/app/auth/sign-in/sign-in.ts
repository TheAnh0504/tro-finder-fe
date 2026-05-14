import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { InfoUser } from '../../core/models/info-user.model';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  apiUrl = environment.apiUrl;

  // Trạng thái hiển thị loading và modal OTP
  isLoading = false;
  showOtpModal = false;

  form = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3), // Lớn hơn 2
        Validators.maxLength(49), // Nhỏ hơn 50
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(7), // Lớn hơn 6
        Validators.maxLength(254), // Nhỏ hơn 255
      ],
    ],
  });

  // Form cho Popup OTP
  otpForm = this.fb.group({
    method: ['email'], // Mặc định chọn email
    targetValue: ['', [Validators.required, Validators.email]], // Giá trị nhập vào
  });

  ngOnInit(): void {}

  get f() {
    return this.form.controls;
  }

  get o() {
    return this.otpForm.controls;
  }

  login() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Dữ liệu đăng nhập không hợp lệ:', this.form.value);
      return;
    }

    this.isLoading = true;

    this.authService.login(this.form.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.showOtpModal = true;

        // const currentUser: InfoUser = {
        //   role: res.role,
        //   name: res.name,
        //   email: res.email,
        //   phoneNumber: res.phoneNumber,
        //   urlImage: res.urlImage,
        // };
        // this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);

        // this.router.navigate(['/home']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Đăng nhập thất bại:', err);
      },
    });
  }

  confirmLogin() {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    console.log('Gửi OTP qua phương thức:', this.otpForm.value);
    // TODO: Gọi API gửi mã OTP và chuyển hướng
    this.showOtpModal = false;
  }

  closeOtpModal() {
    this.showOtpModal = false;
    this.otpForm.reset({ method: 'email' }); // Reset form khi tắt
  }

  // Thêm hàm này vào trong class SignIn
  goToRegister() {
    console.log('Chuyển hướng người dùng sang trang Đăng ký...');
    // TODO: Sử dụng Router của Angular để điều hướng
    this.router.navigate(['auth/sign-up']);
  }

  goToForgotPassword() {
    this.router.navigate(['auth/forgot-password']);
  }
}
