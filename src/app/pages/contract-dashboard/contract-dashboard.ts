import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from '../../core/services/token.service';
import { ContractService } from '../../core/services/contract.service';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';
import { RoomPreferenceService } from '../../core/services/room-preference.service';
import { ReviewService } from '../../core/services/review.service';
import { ProfileService } from '../../core/services/profile.service';
import { ERole } from '../../enum/ERole.enum';
import {
  ContractDTO,
  RoomPaymentDTO,
  EContractStatus,
  EPaymentStatus,
} from '../../core/models/contract.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ContractSignModalComponent } from '../../shared/contract-sign-modal/contract-sign-modal.component';

@Component({
  selector: 'app-contract-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ContractSignModalComponent,
  ],
  templateUrl: './contract-dashboard.html',
  styleUrl: './contract-dashboard.scss',
})
export class ContractDashboard implements OnInit {
  private router = inject(Router);
  private toast = inject(ToastrService);
  private tokenService = inject(TokenService);
  private contractService = inject(ContractService);
  private houseService = inject(HouseRoomManagementService);
  private roomPreferenceService = inject(RoomPreferenceService);
  private fb = inject(FormBuilder);
  private reviewService = inject(ReviewService);
  private profileService = inject(ProfileService);

  // --- State ---
  isLoading = signal(false);
  isVerified = signal(false); // Trạng thái xác minh danh tính
  showVerificationModal = signal(false); // Trạng thái hiển thị modal bắt buộc xác minh
  userRole = signal<string>('');
  contracts = signal<ContractDTO[]>([]);
  houseStats = signal<{ total: number; rented: number; vacant: number }>({
    total: 0,
    rented: 0,
    vacant: 0,
  });

  activeTab = signal<'contracts' | 'reviews' | 'ocr'>('contracts');

  reviewForm!: FormGroup;
  contractForm!: FormGroup;

  cccdFile = signal<File | null>(null);
  cccdFileName = signal<string>('');

  contractCccdFile = signal<File | null>(null);
  contractCccdFileName = signal<string>('');

  contractTypes = [
    { value: 'LEASE', label: 'Hợp đồng thuê nhà' },
    { value: 'DEPOSIT', label: 'Hợp đồng đặt cọc' },
    { value: 'TEMP_RESIDENCE', label: 'Đơn tạm trú' },
    { value: 'TEMP_ABSENCE', label: 'Đơn tạm vắng' },
  ];

  profile = signal<any>(null);

  // Renew modal
  showRenewModal = signal(false);
  renewContractId = signal('');
  renewNewEndTime = signal('');
  renewDepositAmount = signal<number | null>(null);

  // Document viewer
  showDocumentViewer = signal(false);
  documentContent = signal('');

  showSignModal = signal(false);
  signingContract = signal<ContractDTO | null>(null);
  paymentQrFileName = signal('');
  selectedPaymentContractId = signal('');
  selectedPaymentYear = signal(new Date().getFullYear());
  selectedPaymentMonth = signal(new Date().getMonth() + 1);
  showTempFormModal = signal(false);
  tempFormContract = signal<ContractDTO | null>(null);
  tempFormType = signal<'TEMP_RESIDENCE' | 'TEMP_ABSENCE'>('TEMP_RESIDENCE');
  tempFormFromTime = signal('');
  tempFormToTime = signal('');
  tempFormReason = signal('');
  tempFormDestinationAddress = signal('');

  // --- Computed values ---
  isHost = computed(
    () => this.userRole() === 'Chủ nhà trọ' || this.userRole() === 'Chủ trọ & Người thuê',
  );
  isRoomer = computed(
    () => this.userRole() === 'Người thuê trọ' || this.userRole() === 'Chủ trọ & Người thuê',
  );

  activeContracts = computed(() =>
    this.contracts().filter((c) => c.status === EContractStatus.COMPLETED),
  );

  expiredContracts = computed(() =>
    this.contracts().filter((c) => c.status === EContractStatus.EXPIRED),
  );

  pendingConfirmContracts = computed(() => this.contracts().filter((c) => this.canConfirm(c)));
  waitingMySignatureContracts = computed(() => this.contracts().filter((c) => this.canSign(c)));
  waitingOtherSignatureContracts = computed(() =>
    this.contracts().filter(
      (c) =>
        [
          EContractStatus.COUNTERPARTY_CONFIRMED,
          EContractStatus.TENANT_SIGNED,
          EContractStatus.HOST_SIGNED,
        ].includes(c.status as EContractStatus) && !this.canSign(c),
    ),
  );

  // Hợp đồng sắp hết hạn (trong 3 tháng tới)
  expiringContracts = computed(() => {
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    return this.activeContracts().filter((c) => {
      const endDate = this.parseDate(c.endTime);
      return endDate && endDate <= threeMonthsLater && endDate > now;
    });
  });

  // Người thuê chưa đóng tiền (cho host)
  unpaidPayments = computed(() => {
    const result: { contract: ContractDTO; payment: RoomPaymentDTO }[] = [];
    for (const contract of this.activeContracts()) {
      if (!contract.payment) continue;
      for (const p of contract.payment) {
        if (p.status === EPaymentStatus.PENDING || p.status === EPaymentStatus.OVERDUE) {
          result.push({ contract, payment: p });
        }
      }
    }
    return result;
  });

  // Hợp đồng active đầu tiên (cho roomer)
  myActiveContract = computed(() => {
    return this.activeContracts().length > 0 ? this.activeContracts()[0] : null;
  });

  hasActiveRental = computed(() => !!this.myActiveContract());

  // Tháng còn lại của hợp đồng
  remainingMonths = computed(() => {
    const contract = this.myActiveContract();
    if (!contract) return 0;
    const end = this.parseDate(contract.endTime);
    if (!end) return 0;
    const now = new Date();
    const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    return Math.max(0, months);
  });

  isExpiringSoon = computed(() => {
    const m = this.remainingMonths();
    return m > 0 && m <= 3;
  });

  // Progress % cho hợp đồng roomer
  contractProgress = computed(() => {
    const contract = this.myActiveContract();
    if (!contract) return 0;
    const begin = this.parseDate(contract.beginTime);
    const end = this.parseDate(contract.endTime);
    if (!begin || !end) return 0;
    const now = new Date();
    const total = end.getTime() - begin.getTime();
    const elapsed = now.getTime() - begin.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  });

  ngOnInit(): void {
    if (!this.tokenService.isLoggedIn()) {
      this.router.navigate(['/auth/sign-in']);
      return;
    }

    const userInfo: any = this.tokenService.getUserInfo();
    if (userInfo) {
      this.userRole.set(userInfo.role);

      // Kiểm tra xác minh danh tính (isOcr)
      if (userInfo.isOcr === true) {
        this.isVerified.set(true);
        this.showVerificationModal.set(false);
      } else {
        this.isVerified.set(false);
        this.showVerificationModal.set(true);
        // Không load data khi chưa xác minh
        return;
      }
    }

    this.loadContracts();

    if (this.isHost()) {
      this.loadHouseStats();
    }

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
      terms: [''],
    });

    this.loadProfile();
  }

  // --- Verification ---
  goToProfileToVerify(): void {
    this.showVerificationModal.set(false);
    this.router.navigate(['/profile']);
  }

  goBackHome(): void {
    this.showVerificationModal.set(false);
    this.router.navigate(['/home']);
  }

  loadProfile(): void {
    this.profileService.getProfile().subscribe({
      next: (res) => {
        this.profile.set(res);
      },
      error: () => {},
    });
  }

  // --- Data loading ---
  loadContracts(): void {
    this.isLoading.set(true);
    this.contractService.findContracts().subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        const contracts = res.listContract || [];
        this.contracts.set(contracts);
        this.loadPaymentQrImages(contracts);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không thể tải dữ liệu hợp đồng', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  loadHouseStats(): void {
    const payload = {
      pageNumber: 0,
      pageSize: 1000,
      isHost: true,
      requestParam: {},
    };
    this.houseService.findHouseToken(payload).subscribe({
      next: (res: any) => {
        const rooms = res.page?.content || [];
        let totalRooms = 0;
        let rentedRooms = 0;
        for (const room of rooms) {
          totalRooms++;
          if (room.hasRent) {
            rentedRooms++;
          }
        }
        this.houseStats.set({
          total: totalRooms,
          rented: rentedRooms,
          vacant: totalRooms - rentedRooms,
        });
      },
      error: () => {},
    });
  }

  // --- Actions ---
  onPaymentQrSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    this.paymentQrFileName.set(file.name);
    this.isLoading.set(true);
    this.contractService.uploadPaymentQr(fd).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã tải lên QR thanh toán của chủ nhà!', 'Thành công');
        this.loadContracts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không tải lên được QR thanh toán', 'Lỗi');
      },
    });
  }

  loadPaymentQrImages(contracts: ContractDTO[]): void {
    const loaded = new Set<string>();
    for (const contract of contracts) {
      const owner = contract.room?.houseSet?.owner;
      const qrKey = owner?.paymentQrImage;
      if (!owner || !qrKey || loaded.has(qrKey)) continue;
      loaded.add(qrKey);
      this.houseService.getImageRoom({ id: qrKey }).subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          this.contracts.update((items) => {
            for (const item of items) {
              if (item.room?.houseSet?.owner?.paymentQrImage === qrKey) {
                item.room.houseSet.owner.paymentQrImageShow = objectUrl;
              }
            }
            return [...items];
          });
        },
        error: () => {},
      });
    }
  }

  confirmPayment(paymentId: string): void {
    if (!confirm('Xác nhận người thuê đã thanh toán khoản này?')) return;

    this.isLoading.set(true);
    this.contractService.confirmPayment(paymentId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã xác nhận thanh toán thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.loadContracts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Lỗi xác nhận thanh toán', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  confirmPaymentForSelectedPeriod(): void {
    if (!this.selectedPaymentContractId()) {
      this.toast.warning('Vui lòng chọn hợp đồng/phòng cần xác nhận', 'Chú ý');
      return;
    }
    if (
      !confirm(
        `Xác nhận đã đóng tiền tháng ${this.selectedPaymentMonth()}/${this.selectedPaymentYear()}?`,
      )
    ) {
      return;
    }
    this.isLoading.set(true);
    this.contractService
      .confirmPaymentByPeriod({
        contract_id: this.selectedPaymentContractId(),
        payment_year: Number(this.selectedPaymentYear()),
        payment_month: Number(this.selectedPaymentMonth()),
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toast.success('Đã xác nhận thanh toán theo tháng!', 'Thành công');
          this.loadContracts();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message || 'Lỗi xác nhận thanh toán', 'Lỗi');
        },
      });
  }

  openRenewModal(contractId: string): void {
    this.renewContractId.set(contractId);
    this.renewNewEndTime.set('');
    this.renewDepositAmount.set(null);
    this.showRenewModal.set(true);
  }

  closeRenewModal(): void {
    this.showRenewModal.set(false);
  }

  submitRenew(): void {
    if (!this.renewNewEndTime()) {
      this.toast.warning('Vui lòng chọn ngày kết thúc mới', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
      return;
    }

    this.isLoading.set(true);
    const data: any = {
      contractId: this.renewContractId(),
      newEndTime: this.formatDateTime(this.renewNewEndTime()),
    };
    if (this.renewDepositAmount() !== null) {
      data.depositAmount = this.renewDepositAmount();
    }

    this.contractService.renewContract(data).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showRenewModal.set(false);
        this.toast.success('Gia hạn hợp đồng thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.loadContracts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Lỗi gia hạn hợp đồng', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  viewDocument(contract: ContractDTO): void {
    this.documentContent.set(contract.documentContent || 'Không có nội dung hợp đồng.');
    this.showDocumentViewer.set(true);
  }

  closeDocumentViewer(): void {
    this.showDocumentViewer.set(false);
  }

  printDocument(): void {
    const content = this.documentContent();
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(this.buildPrintableHtml(content));
    win.document.close();
    win.focus();
    win.print();
  }

  downloadDocumentHtml(): void {
    const blob = new Blob([this.buildPrintableHtml(this.documentContent())], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'don-hop-dong-co-the-in-pdf.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildPrintableHtml(content: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Tài liệu TroFinder</title><style>
      body{font-family:"Times New Roman",serif;padding:32px;color:#111;line-height:1.55}
      .national-title{text-align:center;margin-bottom:14px}
      h1{text-align:center;font-size:22px;margin:12px 0 28px;text-transform:uppercase}
      h3{font-size:16px;margin:18px 0 8px}
      table{width:100%;border-collapse:collapse;margin:8px 0 14px}
      td{border:1px solid #d1d5db;padding:8px;vertical-align:top}
      ul{margin-top:6px}
      .terms{border:1px dashed #cbd5e1;padding:10px;min-height:48px}
      .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px;text-align:center}
      @page{size:A4;margin:18mm}
    </style></head><body>${content}</body></html>`;
  }

  openTempFormModal(contract: ContractDTO, type: 'TEMP_RESIDENCE' | 'TEMP_ABSENCE'): void {
    this.tempFormContract.set(contract);
    this.tempFormType.set(type);
    this.tempFormFromTime.set('');
    this.tempFormToTime.set('');
    this.tempFormReason.set(
      type === 'TEMP_RESIDENCE' ? 'Đăng ký tạm trú theo hợp đồng thuê phòng.' : '',
    );
    this.tempFormDestinationAddress.set('');
    this.showTempFormModal.set(true);
  }

  closeTempFormModal(): void {
    this.showTempFormModal.set(false);
    this.tempFormContract.set(null);
  }

  submitTempForm(): void {
    const contract = this.tempFormContract();
    if (!contract) return;
    const data: any = {
      contract_id: contract.id,
      form_type: this.tempFormType(),
      reason: this.tempFormReason(),
      destination_address: this.tempFormDestinationAddress(),
    };
    if (this.tempFormFromTime()) data.from_time = this.formatDateTime(this.tempFormFromTime());
    if (this.tempFormToTime()) data.to_time = this.formatDateTime(this.tempFormToTime());

    this.isLoading.set(true);
    this.contractService.createTemporaryResidenceForm(data).subscribe({
      next: (created) => {
        this.isLoading.set(false);
        this.closeTempFormModal();
        this.toast.success('Đã tạo đơn. Bên còn lại có thể xác nhận và ký số.', 'Thành công');
        this.loadContracts();
        if (created?.documentContent) {
          this.viewDocument(created);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không tạo được đơn tạm trú/tạm vắng', 'Lỗi');
      },
    });
  }

  goToSearchRoom(): void {
    this.router.navigate(['/home']);
  }

  goToManageHouse(): void {
    this.router.navigate(['/manager-house']);
  }

  setTab(tab: 'contracts' | 'reviews' | 'ocr'): void {
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

    this.isLoading.set(true);
    this.contractService.createContractFromDashboard(request).subscribe({
      next: (created) => {
        this.isLoading.set(false);
        this.toast.success('Đã tạo mẫu hợp đồng và gửi cho bên thuê xác nhận!', 'Thành công');
        this.contractForm.reset({
          contract_type: 'LEASE',
          notify_channel: 'EMAIL',
          deposit_amount: 0,
          terms: '',
        });
        this.contractCccdFile.set(null);
        this.contractCccdFileName.set('');
        this.loadContracts();
        this.setTab('contracts');
        if (created?.documentContent) {
          this.viewDocument(created);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Tạo hợp đồng thất bại', 'Lỗi');
      },
    });
  }

  approveContract(contractId: string) {
    if (!confirm('Bạn có chắc chắn muốn xác nhận điều khoản hợp đồng này?')) return;

    this.isLoading.set(true);
    this.contractService.confirmContract(contractId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã xác nhận hợp đồng. Hai bên có thể bắt đầu ký.', 'Thành công');
        this.loadContracts();
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
    this.contractService.rejectContract(contractId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.info('Đã từ chối hợp đồng', 'Thông báo');
        this.loadContracts();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error('Lỗi khi từ chối hợp đồng', 'Thất bại');
      },
    });
  }

  // --- Utilities ---
  parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
    if (match) {
      const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = match;
      return new Date(+yyyy, +mm - 1, +dd, +hh, +min, +ss);
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  formatDate(dateStr: string): string {
    const d = this.parseDate(dateStr);
    if (!d) return dateStr || '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0 đ';
    return amount.toLocaleString('vi-VN') + ' đ';
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

  canConfirm(contract: ContractDTO): boolean {
    if (contract.status === EContractStatus.PROPOSED_BY_TENANT) {
      return this.isHost();
    }
    if (contract.status === EContractStatus.PROPOSED_BY_HOST) {
      return this.isRoomer();
    }
    return false;
  }

  canSign(contract: ContractDTO): boolean {
    if (contract.status === EContractStatus.COUNTERPARTY_CONFIRMED) {
      return contract.createdByRole === ERole.ROLE_HOST ? this.isHost() : this.isRoomer();
    }
    if (contract.status === EContractStatus.TENANT_SIGNED) {
      return this.isHost();
    }
    if (contract.status === EContractStatus.HOST_SIGNED) {
      return this.isRoomer();
    }
    return false;
  }

  openSignModal(contract: ContractDTO): void {
    this.signingContract.set(contract);
    this.showSignModal.set(true);
  }

  closeSignModal(): void {
    this.showSignModal.set(false);
    this.signingContract.set(null);
  }

  onSigned(): void {
    this.closeSignModal();
    this.loadContracts();
  }

  defaultSignUsername(): string {
    const info: any = this.tokenService.getUserInfo();
    return info?.username || '';
  }

  getPaymentStatusLabel(status: string): string {
    switch (status) {
      case EPaymentStatus.PENDING:
        return 'Chờ thanh toán';
      case EPaymentStatus.CONFIRMED:
        return 'Đã thanh toán';
      case EPaymentStatus.OVERDUE:
        return 'Quá hạn';
      default:
        return status;
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case EPaymentStatus.PENDING:
        return 'status-pending';
      case EPaymentStatus.CONFIRMED:
        return 'status-confirmed';
      case EPaymentStatus.OVERDUE:
        return 'status-overdue';
      default:
        return '';
    }
  }

  getContractStatusLabel(status: string): string {
    switch (status) {
      case EContractStatus.PROPOSED_BY_TENANT:
        return 'Người thuê đề xuất';
      case EContractStatus.PROPOSED_BY_HOST:
        return 'Chủ nhà đề xuất';
      case EContractStatus.COUNTERPARTY_CONFIRMED:
        return 'Đã xác nhận điều khoản';
      case EContractStatus.TENANT_SIGNED:
        return 'Người thuê đã ký';
      case EContractStatus.HOST_SIGNED:
        return 'Chủ nhà đã ký';
      case EContractStatus.COMPLETED:
        return 'Hoàn thành';
      case EContractStatus.REJECTED:
        return 'Đã từ chối';
      case EContractStatus.EXPIRED:
        return 'Đã hết hạn';
      default:
        return status;
    }
  }

  getContractStatusClass(status: string): string {
    switch (status) {
      case EContractStatus.COMPLETED:
        return 'status-active';
      case EContractStatus.EXPIRED:
        return 'status-expired';
      case EContractStatus.REJECTED:
        return 'status-overdue';
      case EContractStatus.PROPOSED_BY_TENANT:
      case EContractStatus.PROPOSED_BY_HOST:
      case EContractStatus.COUNTERPARTY_CONFIRMED:
      case EContractStatus.TENANT_SIGNED:
      case EContractStatus.HOST_SIGNED:
        return 'status-draft';
      default:
        return '';
    }
  }

  getContractTypeLabel(type: string): string {
    switch (type) {
      case 'LEASE':
        return 'Hợp đồng thuê';
      case 'DEPOSIT':
        return 'Hợp đồng cọc';
      case 'TEMP_RESIDENCE':
        return 'Tạm trú';
      case 'TEMP_ABSENCE':
        return 'Tạm vắng';
      default:
        return type;
    }
  }
}
