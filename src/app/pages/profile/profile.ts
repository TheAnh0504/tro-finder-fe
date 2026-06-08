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

    this.loadProfile();
    this.loadAvatar();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không tải được hồ sơ', 'Lỗi');
      },
    });
  }

  loadAvatar(): void {
    this.authService.getImageFace().subscribe({
      next: (blob) => {
        this.avatarUrl.set(URL.createObjectURL(blob));
      },
      error: () => {},
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
      this.toast.warning('Vui lòng chọn ảnh căn cước', 'Chú ý');
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    this.isLoading.set(true);
    this.contractService.scanCccd(fd).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('OCR căn cước thành công!', 'Thành công');
        this.cccdFile.set(null);
        this.cccdFileName.set('');
        this.loadProfile();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'OCR thất bại', 'Lỗi');
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
        this.toast.success('Đã gửi đánh giá!', 'Thành công');
        this.reviewForm.reset({ stars: 5, anonymous: false });
        this.loadProfile();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không gửi được đánh giá', 'Lỗi');
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
        this.toast.success('Tạo hợp đồng thành công!', 'Thành công');
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
        this.toast.error(err.error?.message || 'Tạo hợp đồng thất bại', 'Lỗi');
      },
    });
  }

  confirmPayment(paymentId: string): void {
    this.contractService.confirmPayment(paymentId).subscribe({
      next: () => {
        this.toast.success('Đã xác nhận thanh toán', 'Thành công');
        this.loadProfile();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Xác nhận thất bại', 'Lỗi');
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
}
