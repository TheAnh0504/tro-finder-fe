import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { ToastrService } from 'ngx-toastr';
import { ContractService } from '../../core/services/contract.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OsmMapComponent } from '../../shared/osm-map/osm-map.component';
import { InfoUser } from '../../core/models/info-user.model';
import { SysUserService } from '../../core/services/sys-user.service';

export interface OcrIdentityDTO {
  cccdNumber?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  permanentAddress?: string;
  issueDate?: string;
  issuePlace?: string;
  expiryDate?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    OsmMapComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);
  private fb = inject(FormBuilder);
  private sysUserService = inject(SysUserService);
  private contractService = inject(ContractService);

  isLoading = signal(true);
  profile = signal<any>(null);
  avatarUrl = signal<string | null>(null);
  activeTab = signal<'info' | 'verify' | 'houses'>('info');

  cccdFile = signal<File | null>(null);
  cccdFileName = signal<string>(''); // Thêm hiển thị tên file

  isHost = computed(() => {
    const role = this.profile()?.user?.role;
    return role === 'ROLE_HOST' || role === 'ROLE_USER' || role === 'ROLE_ADMIN';
  });

  isRoomer = computed(() => {
    const role = this.profile()?.user?.role;
    return role === 'ROLE_ROOMER' || role === 'ROLE_USER' || role === 'ROLE_ADMIN';
  });

  // --- LUỒNG XÁC MINH DANH TÍNH MỚI ---
  showOcrMethodModal = signal(false);
  scannedOcrData = signal<OcrIdentityDTO | null>(null);
  uploadedCccdUrl = signal<string | null>(null); // Để preview ảnh khi review

  // Form cập nhật thông tin
  updateForm!: FormGroup;
  newAvatarFile = signal<File | null>(null);
  newAvatarPreview = signal<string | null>(null);

  ngOnInit(): void {
    // Khởi tạo Form Cập nhật
    this.updateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required, Validators.pattern(/^(03|05|07|08|09)\d{8}$/)]],

      // Username thường không cho sửa, nhưng mình thêm vào để hiển thị (disable)
      username: [{ value: '', disabled: true }],

      old_password: [''],
      // Đối với form Update Profile, mật khẩu mới không bắt buộc phải nhập (chỉ nhập khi muốn đổi)
      // Nên ta bỏ Validators.required đi, chỉ giữ điều kiện độ dài
      new_password: ['', [Validators.minLength(7), Validators.maxLength(254)]],
      confirm_password: [''],
    });

    this.loadProfile();
    this.loadAvatar();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile.set(res);
        this.updateForm.patchValue({
          name: res.user?.name,
          email: res.user?.email,
          phone_number: res.user?.phoneNumber,
          username: res.user?.username,
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không tải được hồ sơ', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  loadAvatar(): void {
    const user: InfoUser | null = this.tokenService.getUserInfo();
    let name = user?.name || 'Anonymous';
    let avatar = 'https://ui-avatars.com/api/?name=' + name + '&background=10b981&color=fff';
    if (user?.urlImage) {
      this.authService.getImageFace().subscribe({
        next: (blob: any) => {
          this.avatarUrl.set(URL.createObjectURL(blob));
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
      this.avatarUrl.set(avatar);
    }
  }

  // --- LOGIC CẬP NHẬT THÔNG TIN ---
  onAvatarEditSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.newAvatarFile.set(file);
      // Tạo preview ảnh ngay lập tức
      this.newAvatarPreview.set(URL.createObjectURL(file));
    }
  }

  submitUpdateProfile() {
    if (this.updateForm.invalid) {
      this.updateForm.markAllAsTouched();
      return;
    }

    const val = this.updateForm.value;

    // Validate mật khẩu
    if (val.new_password || val.old_password) {
      if (!val.old_password || !val.new_password) {
        this.toast.warning('Vui lòng nhập cả mật khẩu cũ và mới nếu muốn đổi mật khẩu.', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        return;
      }
      if (val.new_password !== val.confirm_password) {
        this.toast.warning('Nhập lại mật khẩu mới không khớp!', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        return;
      }
    }

    // Tạo payload JSON
    const requestPayload: any = {
      name: val.name,
      email: val.email,
      phone_number: val.phone_number,
    };
    if (val.new_password) {
      requestPayload.old_password = val.old_password;
      requestPayload.new_password = val.new_password;
    }

    const fd = new FormData();
    fd.append('request', new Blob([JSON.stringify(requestPayload)], { type: 'application/json' }));

    if (this.newAvatarFile()) {
      fd.append('image_file', this.newAvatarFile() as File);
    }

    this.isLoading.set(true);
    // Gọi API update (Sửa domain lại cho khớp với env của bạn nếu cần)
    this.sysUserService.updateUser(fd).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Cập nhật thông tin thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        // Reset mật khẩu field
        this.updateForm.patchValue({ old_password: '', new_password: '', confirm_password: '' });
        this.newAvatarFile.set(null);

        // Cập nhật lại UI Avatar ở thanh Topbar nếu cần (Tuỳ logic dự án của bạn)
        this.loadProfile();
        if (this.newAvatarPreview()) {
          this.avatarUrl.set(this.newAvatarPreview()); // Đổi ảnh hiện tại sang ảnh mới
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Cập nhật thất bại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  setTab(tab: 'info' | 'verify' | 'houses'): void {
    this.activeTab.set(tab);
  }

  onCccdSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      this.cccdFile.set(file);
      this.cccdFileName.set(file.name);
      this.uploadedCccdUrl.set(URL.createObjectURL(file)); // Lưu preview ảnh
    }
  }

  openMethodModal(): void {
    if (!this.cccdFile()) {
      this.toast.warning('Vui lòng chọn ảnh căn cước trước', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
      return;
    }
    this.showOcrMethodModal.set(true);
  }

  closeMethodModal(): void {
    this.showOcrMethodModal.set(false);
  }

  processOcr(method: string): void {
    const file = this.cccdFile();
    if (!file) return;

    this.closeMethodModal();
    this.isLoading.set(true);

    const fd = new FormData();
    fd.append('image', file);
    fd.append('type_request', method);

    this.contractService.scanCccd(fd).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.toast.success('Đọc thông tin thành công, vui lòng kiểm tra lại!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.scannedOcrData.set(res.identity);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Quét ảnh thất bại, vui lòng thử lại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  cancelOcrReview(): void {
    this.scannedOcrData.set(null);
    this.cccdFile.set(null);
    this.cccdFileName.set('');
    this.uploadedCccdUrl.set(null);
  }

  confirmOcrData(): void {
    const data = this.scannedOcrData();
    if (!data) return;

    this.isLoading.set(true);
    this.contractService.confirmCccd({ confirm: true }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Xác minh danh tính thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });

        // Reset state
        this.cancelOcrReview();
        // Load lại profile để cập nhật trạng thái Đã xác minh
        this.loadProfile();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Xác nhận thất bại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  // scanCccd(): void {
  //   const file = this.cccdFile();
  //   if (!file) {
  //     this.toast.warning('Vui lòng chọn ảnh căn cước', 'Chú ý', {
  //       timeOut: 3000,
  //       progressBar: true,
  //       positionClass: 'toast-top-right',
  //     });
  //     return;
  //   }
  //   const fd = new FormData();
  //   fd.append('image', file);
  //   this.isLoading.set(true);
  //   this.contractService.scanCccd(fd).subscribe({
  //     next: () => {
  //       this.isLoading.set(false);
  //       this.toast.success('Xác thực căn cước thành công!', 'Thành công', {
  //         timeOut: 3000,
  //         progressBar: true,
  //         positionClass: 'toast-top-right',
  //       });
  //       this.cccdFile.set(null);
  //       this.cccdFileName.set('');
  //       this.loadProfile();
  //     },
  //     error: (err) => {
  //       this.isLoading.set(false);
  //       this.toast.error(err.error?.message || 'Xác thực thất bại', 'Lỗi', {
  //         timeOut: 3000,
  //         progressBar: true,
  //         positionClass: 'toast-top-right',
  //       });
  //     },
  //   });
  // }
}
