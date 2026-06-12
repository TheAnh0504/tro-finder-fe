import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { ContractService } from '../../core/services/contract.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { ToastrService } from 'ngx-toastr';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { OsmMapComponent } from '../../shared/osm-map/osm-map.component';
import { InfoUser } from '../../core/models/info-user.model';
import { SysUserService } from '../../core/services/sys-user.service';

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
  private contractService = inject(ContractService);
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);
  private fb = inject(FormBuilder);
  private sysUserService = inject(SysUserService);

  isLoading = signal(true);
  profile = signal<any>(null);
  avatarUrl = signal<string | null>(null);
  activeTab = signal<'info' | 'houses' | 'contracts' | 'reviews' | 'ocr'>('info');

  reviewForm!: FormGroup;
  contractForm!: FormGroup;
  selectedReviewRoomId = signal<string | null>(null);

  cccdFile = signal<File | null>(null);
  cccdFileName = signal<string>(''); // Thêm hiển thị tên file

  contractCccdFile = signal<File | null>(null);
  contractCccdFileName = signal<string>(''); // Thêm hiển thị tên file

  isHost = computed(() => {
    const role = this.profile()?.user?.role;
    return role === 'ROLE_HOST' || role === 'ROLE_USER' || role === 'ROLE_ADMIN';
  });

  isRoomer = computed(() => {
    const role = this.profile()?.user?.role;
    return role === 'ROLE_ROOMER' || role === 'ROLE_USER' || role === 'ROLE_ADMIN';
  });

  contractTypes = [
    { value: 'LEASE', label: 'Hợp đồng thuê nhà' },
    { value: 'DEPOSIT', label: 'Hợp đồng đặt cọc' },
    { value: 'TEMP_RESIDENCE', label: 'Đơn tạm trú' },
    { value: 'TEMP_ABSENCE', label: 'Đơn tạm vắng' },
  ];

  // Form cập nhật thông tin
  updateForm!: FormGroup;
  newAvatarFile = signal<File | null>(null);
  newAvatarPreview = signal<string | null>(null);

  ngOnInit(): void {
    this.reviewForm = this.fb.group({
      room_id: ['', Validators.required],
      stars: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      content: [''],
      anonymous: [false],
    });

    this.contractForm = this.fb.group({
      room_id: ['', Validators.required],
      tenant_username: ['', Validators.required],
      contract_type: ['LEASE', Validators.required],
      begin_time: ['', Validators.required],
      end_time: ['', Validators.required],
      deposit_amount: [0],
      notify_channel: ['EMAIL'],
    });

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

  setTab(tab: 'info' | 'houses' | 'contracts' | 'reviews' | 'ocr'): void {
    this.activeTab.set(tab);
  }

  onCccdSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.cccdFile.set(input.files[0]);
      this.cccdFileName.set(input.files[0].name);
    }
  }

  onContractCccdSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.contractCccdFile.set(input.files[0]);
      this.contractCccdFileName.set(input.files[0].name);
    }
  }

  scanCccd(): void {
    const file = this.cccdFile();
    if (!file) {
      this.toast.warning('Vui lòng chọn ảnh căn cước', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    this.isLoading.set(true);
    this.contractService.scanCccd(fd).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('OCR căn cước thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.cccdFile.set(null);
        this.cccdFileName.set('');
        this.loadProfile();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'OCR thất bại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.reviewService.addReview(this.reviewForm.value).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã gửi đánh giá!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.reviewForm.reset({ stars: 5, anonymous: false });
        this.loadProfile();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không gửi được đánh giá', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  submitContract(): void {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      return;
    }
    const val = this.contractForm.value;
    const request = {
      ...val,
      begin_time: this.formatDateTime(val.begin_time),
      end_time: this.formatDateTime(val.end_time),
    };

    const fd = new FormData();
    fd.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
    const cccd = this.contractCccdFile();
    if (cccd) {
      fd.append('cccd_image', cccd);
    }

    this.isLoading.set(true);
    this.contractService.createContractWithOcr(fd).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Tạo hợp đồng thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.contractForm.reset({
          contract_type: 'LEASE',
          notify_channel: 'EMAIL',
          deposit_amount: 0,
        });
        this.contractCccdFile.set(null);
        this.contractCccdFileName.set('');
        this.loadProfile();
        this.setTab('contracts');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Tạo hợp đồng thất bại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  confirmPayment(paymentId: string): void {
    this.contractService.confirmPayment(paymentId).subscribe({
      next: () => {
        this.toast.success('Đã xác nhận thanh toán', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.loadProfile();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Xác nhận thất bại', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  formatDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  renderStars(count: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  paymentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Chờ thanh toán',
      CONFIRMED: 'Đã xác nhận',
      OVERDUE: 'Quá hạn',
    };
    return map[status] || status;
  }

  contractTypeLabel(type: string): string {
    return this.contractTypes.find((t) => t.value === type)?.label || type;
  }

  getHostRooms(): any[] {
    const houses = this.profile()?.houses || [];
    const rooms: any[] = [];
    houses.forEach((h: any) => {
      (h.room || []).forEach((r: any) => {
        rooms.push({ ...r, houseName: h.name, houseId: h.id });
      });
    });
    return rooms;
  }

  // --- CHỦ NHÀ: DUYỆT HỢP ĐỒNG ---
  approveContract(contractId: string) {
    if (!confirm('Bạn có chắc chắn muốn KÝ DUYỆT hợp đồng này?')) return;

    this.isLoading.set(true);
    // Thay this.contractService.approveContract bằng API chuẩn của BE
    this.contractService.confirmPayment(contractId).subscribe({
      // Dùng tạm hàm có sẵn để demo
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Hợp đồng đã được ký duyệt!', 'Thành công');
        this.loadProfile(); // Reload lại danh sách
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Lỗi khi ký hợp đồng', 'Thất bại');
      },
    });
  }

  rejectContract(contractId: string) {
    if (!confirm('Bạn có chắc chắn muốn TỪ CHỐI hợp đồng này?')) return;

    this.isLoading.set(true);
    // Thay bằng API từ chối của BE
    this.contractService.confirmPayment(contractId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.info('Đã từ chối hợp đồng', 'Thông báo');
        this.loadProfile();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error('Lỗi khi từ chối hợp đồng', 'Thất bại');
      },
    });
  }
}
