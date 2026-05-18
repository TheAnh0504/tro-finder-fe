import { Component, signal, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  Form,
} from '@angular/forms';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';
import { Role } from '../../core/models/role-info.model';
import { Toast, ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { InfoUser } from '../../core/models/info-user.model';
import { TokenService } from '../../core/services/token.service';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
})
export class SignUp implements OnInit, OnDestroy {
  registerForm: FormGroup;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);

  otpVerifyForm: FormGroup;
  showOtpModal = signal(false);
  countdownDisplay = signal('03:00');
  timer: any;
  totalSeconds = signal(180); // 3 phút

  countdownSendOtp = signal('05:00');
  totalSecondSendOtp = 300;
  timerOtp: any;
  countSendOtpCode = signal(3);

  responseSignUp: any;

  // Danh sách Role linh động từ hệ thống
  listRole: Role[] = [
    { id: '', roleCode: 'ROLE_ROOMER', roleName: 'Người thuê trọ', listPermission: [] },
    { id: '', roleCode: 'ROLE_HOST', roleName: 'Chủ nhà trọ', listPermission: [] },
    { id: '', roleCode: 'ROLE_USER', roleName: 'Cả hai', listPermission: [] },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private roleService: RoleService,
    private toast: ToastrService,
    private authService: AuthService,
    private tokenService: TokenService,
  ) {
    this.isLoading.set(true);

    this.registerForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^(03|05|07|08|09)\d{8}$/)]],
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(4)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        // Thêm trường nhập lại mật khẩu
        confirmPassword: ['', [Validators.required]],
        role: [this.listRole[0].roleCode, Validators.required], // Mặc định chọn role đầu tiên
      },
      {
        // Đưa hàm kiểm tra khớp mật khẩu vào toàn bộ Form
        validators: this.passwordMatchValidator,
      },
    );

    this.otpVerifyForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]],
    });

    this.roleService
      .findRolePublic({
        pageNumber: 0,
        pageSize: 20,
        requestParam: {},
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.listRole =
            res.page.content.filter((r: Role) => r.roleCode != 'ROLE_ADMIN') || this.listRole; // Cập nhật danh sách role từ API nếu có
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

  ngOnInit(): void {
    if (this.tokenService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  // 3. Lắng nghe ô nhập OTP 6 số (Nằm trong Modal 2)
  @ViewChild('otpInput') set otpInput(el: ElementRef<HTMLInputElement>) {
    if (el) {
      setTimeout(() => el.nativeElement.focus(), 150); // Chờ animation modal trượt lên
    }
  }

  // Hàm custom validator kiểm tra khớp pass
  passwordMatchValidator(g: AbstractControl) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  get f() {
    return this.registerForm.controls;
  }

  get o() {
    return this.otpVerifyForm.controls;
  }

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  goToLogin() {
    this.router.navigate(['/auth/sign-in']);
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const formValues = this.registerForm.value;

    const requestPayload = {
      username: formValues.username,
      password: formValues.password,
      name: formValues.name,
      email: formValues.email,
      phone_number: formValues.phoneNumber,
      role: formValues.role,
      is_lock_login: false, // Hardcode theo spec
    };

    // Tạo FormData chứa JSON string (Giống hệt cURL)
    const formData = new FormData();
    const blob = new Blob([JSON.stringify(requestPayload)], {
      type: 'application/json',
    });
    formData.append('request', blob);

    this.authService.signUp(formData).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.showOtpModal.set(true);
        this.responseSignUp = res;

        this.totalSeconds.set(180);
        this.countdownDisplay.set('03:00');
        this.startCountdown();

        this.countdownSendOtp.set('05:00');
        this.totalSecondSendOtp = 300;
        this.startCountdownOtp();

        this.countSendOtpCode.set(3);

        this.toast.success('Mã OTP đã được gửi!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
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

      this.isLoading.set(true);

      const payload = {
        verify_token: this.responseSignUp.verify_token,
        verify_method: 'email',
        phone_or_mail: this.registerForm.value.email,
      };

      this.authService.sendVerifyCode(payload).subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          this.showOtpModal.set(true);

          this.totalSeconds.set(180);
          this.countdownDisplay.set('03:00');
          this.startCountdown();

          this.toast.success('Mã OTP đã được gửi!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
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
    } else {
      this.toast.warning('Bạn đã gửi lại OTP quá số lần được phép!', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
    }
  }

  startCountdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.totalSeconds() > 0) {
        this.totalSeconds.update((value) => value - 1);
        const mins = Math.floor(this.totalSeconds() / 60);
        const secs = this.totalSeconds() % 60;
        this.countdownDisplay.set(
          `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
        );
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
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

  confirmLogin() {
    if (this.otpVerifyForm.invalid) {
      this.otpVerifyForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const payload = {
      verify_token: this.responseSignUp.verify_token,
      verify_code: this.otpVerifyForm.value.otpCode,
    };

    this.authService.confirmSignUp(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);

        const currentUser: InfoUser = {
          role: res.role,
          name: res.name,
          email: res.email,
          phoneNumber: res.phoneNumber,
          urlImage: res.urlImage,
        };
        this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);

        this.router.navigate(['/home']);
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

  closeConfirmLoginModal() {
    this.showOtpModal.set(false);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
