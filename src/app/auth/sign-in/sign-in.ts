import { Component, inject, OnDestroy, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { InfoUser } from '../../core/models/info-user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private toast = inject(ToastrService);

  apiUrl = environment.apiUrl;

  // Trạng thái hiển thị loading và modal OTP
  isLoading = signal(false);
  showSendVerifyCodeModal = signal(false);
  showPassword = signal(false);

  phoneRegex = /^(03|05|07|08|09)\d{8}$/;
  responseLogin: any;

  showOtpModal = signal(false);
  countdownDisplay = signal('03:00');
  timer: any;
  totalSeconds = 180; // 3 phút

  countdownSendOtp = signal('05:00');
  totalSecondSendOtp = 300;
  timerOtp: any;
  countSendOtpCode = signal(4);

  otpVerifyForm = this.fb.group({
    otpCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]],
  });

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

  // Form cho send verify code, mặc định là email
  sendVerifyCodeForm = this.fb.group({
    method: ['email'], // Mặc định chọn email
    targetValue: ['', [Validators.required, Validators.email]], // Giá trị nhập vào
  });

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  // // 2. Lắng nghe ô nhập Phương thức (Nằm trong Modal 1)
  // @ViewChild('targetValueInput') set targetValueInput(el: ElementRef<HTMLInputElement>) {
  //   if (el) {
  //     setTimeout(() => el.nativeElement.focus(), 150); // Chờ animation modal trượt lên
  //   }
  // }

  // // 3. Lắng nghe ô nhập OTP 6 số (Nằm trong Modal 2)
  // @ViewChild('otpInput') set otpInput(el: ElementRef<HTMLInputElement>) {
  //   if (el) {
  //     setTimeout(() => el.nativeElement.focus(), 150); // Chờ animation modal trượt lên
  //   }
  // }

  ngOnInit(): void {
    if (this.tokenService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }

    // Lắng nghe mỗi khi radio 'method' bị thay đổi
    this.sendVerifyCodeForm.get('method')?.valueChanges.subscribe((method) => {
      const targetControl = this.sendVerifyCodeForm.get('targetValue');

      if (method === 'phone') {
        // Đổi luật sang số điện thoại
        targetControl?.setValidators([Validators.required, Validators.pattern(this.phoneRegex)]);
      } else {
        // Đổi luật sang email
        targetControl?.setValidators([Validators.required, Validators.email]);
      }

      // UX Tip: Tự động xóa dòng chữ đang nhập dở khi người dùng đổi phương thức
      targetControl?.setValue('');
      targetControl?.markAsUntouched(); // Reset lại viền đỏ

      // Bắt buộc gọi hàm này để Angular áp dụng luật Validate mới ngay lập tức
      targetControl?.updateValueAndValidity();
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  get f() {
    return this.form.controls;
  }

  get s() {
    return this.sendVerifyCodeForm.controls;
  }

  login() {
    this.toast.success('Mã OTP đã được gửi!', 'Thành công', {
      timeOut: 3000,
      progressBar: true,
      positionClass: 'toast-top-right',
    });

    this.toast.info('Mã OTP đã được gửi!', 'Thông báo', {
      timeOut: 3000,
      progressBar: true,
      positionClass: 'toast-top-right',
    });

    this.toast.warning('Mã OTP đã được gửi!', 'Chú ý', {
      timeOut: 3000,
      progressBar: true,
      positionClass: 'toast-top-right',
    });

    this.toast.error('Mã OTP đã được gửi!', 'Lỗi', {
      timeOut: 3000,
      progressBar: true,
      positionClass: 'toast-top-right',
    });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.authService.login(this.form.value).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.showSendVerifyCodeModal.set(true);

        this.responseLogin = res;
        console.log('Login thành công:', res);

        this.sendVerifyCodeForm.reset({ method: 'email' });
        this.countSendOtpCode = signal(4);
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

  sendVerifyCode() {
    if (this.totalSecondSendOtp > 0 && this.countSendOtpCode() > 0) {
      this.countSendOtpCode.set(this.countSendOtpCode() - 1);

      this.otpVerifyForm.get('otpCode')?.setValue('');

      if (this.sendVerifyCodeForm.invalid) {
        this.sendVerifyCodeForm.markAllAsTouched();
        return;
      }

      this.isLoading.set(true);

      const payload = {
        verify_token: this.responseLogin.verify_token,
        verify_method: this.sendVerifyCodeForm.value.method,
        phone_or_mail: this.sendVerifyCodeForm.value.targetValue,
      };

      this.authService.sendVerifyCode(payload).subscribe({
        next: (res: any) => {
          this.showSendVerifyCodeModal.set(false);
          this.isLoading.set(false);
          this.showOtpModal.set(true);

          this.totalSeconds = 180;
          this.countdownDisplay.set('03:00');
          this.startCountdown();

          if (this.countSendOtpCode() == 3) {
            this.countdownSendOtp.set('05:00');
            this.totalSecondSendOtp = 300;
            this.startCountdownOtp();
          }

          this.toast.success('Mã OTP đã được gửi!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
        },
        error: (err) => {
          this.countSendOtpCode.set(this.countSendOtpCode() + 1);
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
        },
      });
    } else {
      this.toast.warning('Bạn đã gửi lại OTP quá số lần được phép!', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
    }
  }

  closeSendVerifyCodeModal() {
    this.showSendVerifyCodeModal.set(false);
    this.sendVerifyCodeForm.reset({ method: 'email' }); // Reset form khi tắt
  }

  goToRegister() {
    console.log('Chuyển hướng người dùng sang trang Đăng ký...');
    this.router.navigate(['auth/sign-up']);
  }

  goToForgotPassword() {
    this.router.navigate(['auth/forgot-password']);
  }

  onOtpInput(event: any) {
    const value = event.target.value;
    const cleanValue = value
      .slice(0, 6)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase();
    this.otpVerifyForm.get('otpCode')?.setValue(cleanValue);
  }

  startCountdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.totalSeconds > 0) {
        this.totalSeconds--;
        const mins = Math.floor(this.totalSeconds / 60);
        const secs = this.totalSeconds % 60;
        this.countdownDisplay.set(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
        );
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  confirmLogin() {
    if (this.otpVerifyForm.invalid) {
      this.otpVerifyForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const payload = {
      verify_token: this.responseLogin.verify_token,
      verify_code: this.otpVerifyForm.value.otpCode,
    };

    this.authService.confirmLogin(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);

        const currentUser: InfoUser = {
          role: res.role,
          name: res.name,
          email: res.email,
          phoneNumber: res.phoneNumber,
          urlImage: res.urlImage,
          isOcr: res.isOcr,
          searchPreferences: res.searchPreferences,
        };
        this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);
        if (currentUser.role === 'Người thuê trọ') {
          this.router.navigate(['/home']);
        } else if (currentUser.role === 'Chủ nhà trọ') {
          this.router.navigate(['/manager-house']);
        } else if (currentUser.role === 'Chủ trọ & Người thuê') {
          this.router.navigate(['/home']);
        } else if (currentUser.role === 'Quản trị viên') {
          this.router.navigate(['/sys-user']);
        } else {
          this.router.navigate(['/home']);
        }
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

  closeConfirmLoginModal() {
    this.showOtpModal.set(false);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.timerOtp) clearInterval(this.timerOtp);
  }

  get o() {
    return this.otpVerifyForm.controls;
  }

  startCountdownOtp() {
    if (this.timerOtp) clearInterval(this.timerOtp);
    this.timerOtp = setInterval(() => {
      if (this.totalSecondSendOtp > 0) {
        this.totalSecondSendOtp--;
        const mins = Math.floor(this.totalSecondSendOtp / 60);
        const secs = this.totalSecondSendOtp % 60;
        this.countdownSendOtp.set(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
        );
      } else {
        clearInterval(this.timerOtp);
      }
    }, 1000);
  }
}
