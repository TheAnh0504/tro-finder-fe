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
  EContractType,
  ContractRoomDTO,
  PaymentBreakdownInput,
  PaymentBreakdownResult,
} from '../../core/models/contract.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ContractSignModalComponent } from '../../shared/contract-sign-modal/contract-sign-modal.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-contract-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    NgxMaskDirective,
    ContractSignModalComponent,
  ],
  providers: [provideNgxMask()],
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
  private sanitizer = inject(DomSanitizer);

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

  hasPreviewedContract = false;
  isPreviewing = false;
  isContractModalLoading = signal(false);
  showContractPdfPreviewModal = signal(false);
  draftContract = signal<ContractDTO | null>(null);
  draftContractId: string | null = null;
  previewPdfUrl: SafeResourceUrl | null = null;
  draftSignPdfBlobUrl: string | null = null;
  private previewObjectUrl: string | null = null;
  private contractFormSnapshot = '';

  contractTypes = [
    { value: 'LEASE', label: 'Hợp đồng thuê nhà' },
    { value: 'DEPOSIT', label: 'Hợp đồng đặt cọc' },
  ];

  profile = signal<any>(null);

  // Renew modal
  showRenewModal = signal(false);
  renewContractId = signal('');
  renewNewEndTime = signal('');
  renewDepositAmount = signal<number | null>(null);

  // Document viewer
  showDocumentViewer = signal(false);
  viewingContract = signal<ContractDTO | null>(null);
  documentContent = signal('');
  documentPdfUrl = signal<SafeResourceUrl | null>(null);
  documentViewMode = signal<'pdf' | 'html'>('html');
  documentLoading = signal(false);
  private documentObjectUrl: string | null = null;

  showSignModal = signal(false);
  signingContract = signal<ContractDTO | null>(null);
  paymentQrFileName = signal('');
  hostPaymentQrImage = signal<string | null>(null);
  hostPaymentQrImageShow = signal<string | null>(null);
  isUploadingPaymentQr = signal(false);
  isTriggeringRoomSuggestions = signal(false);
  isTriggeringHostReminders = signal(false);
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

  showWorkflowListModal = signal(false);
  workflowListFilter = signal<
    'pending_confirm' | 'waiting_my_sign' | 'waiting_other_sign' | 'completed' | null
  >(null);

  showPaymentQrModal = signal(false);
  paymentModalNote = signal('');
  paymentModalType = signal<'rent' | 'utilities' | 'all'>('all');
  isNotifyingPayment = signal(false);
  isSavingBreakdown = signal(false);
  isHostPaymentModal = signal(false);
  paymentModalContract = signal<ContractDTO | null>(null);
  paymentElectricityUnits = signal(0);
  paymentWaterUnits = signal(0);
  paymentOccupantCount = signal(1);

  readonly currentYear = new Date().getFullYear();
  readonly currentMonth = new Date().getMonth() + 1;
  paymentViewYear = signal(this.currentYear);
  paymentViewMonth = signal(this.currentMonth);
  paymentModalYear = signal(this.currentYear);
  paymentModalMonth = signal(this.currentMonth);

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

  activeLeaseContracts = computed(() =>
    this.contracts().filter(
      (c) =>
        c.status === EContractStatus.COMPLETED &&
        (c.contractType ?? (c as any).contract_type) === EContractType.LEASE &&
        this.isWithinActivePeriod(c),
    ),
  );

  hostActiveLeaseContracts = computed(() => {
    const username = this.currentUsername();
    return this.activeLeaseContracts().filter(
      (c) => !username || c.room?.houseSet?.owner?.username === username,
    );
  });

  myActiveLeaseContracts = computed(() => {
    const username = this.currentUsername();
    return this.activeLeaseContracts()
      .filter((c) => !username || c.tenant?.username === username)
      .sort(
        (a, b) => this.parseDate(b.endTime)!.getTime() - this.parseDate(a.endTime)!.getTime(),
      );
  });

  currentUsername = computed(
    () =>
      this.profile()?.user?.username ?? (this.tokenService.getUserInfo() as any)?.username ?? '',
  );

  expiredContracts = computed(() =>
    this.contracts().filter((c) => c.status === EContractStatus.EXPIRED),
  );

  pendingConfirmContracts = computed(() => this.contracts().filter((c) => this.canConfirm(c)));
  waitingMySignatureContracts = computed(() => this.contracts().filter((c) => this.canSign(c)));
  waitingOtherSignatureContracts = computed(() =>
    this.contracts().filter((c) => this.isWaitingOtherSignature(c)),
  );

  completedWorkflowContracts = computed(() =>
    this.contracts().filter((c) => c.status === EContractStatus.COMPLETED),
  );

  /** Phòng trọ đủ điều kiện đánh giá: HĐ thuê (LEASE) trạng thái Hoàn thành, user là người thuê, chưa đánh giá */
  reviewableContracts = computed(() => {
    const username =
      this.profile()?.user?.username ?? (this.tokenService.getUserInfo() as any)?.username ?? '';
    const reviewedRoomIds = new Set(
      (this.profile()?.reviews_written ?? []).map((r: any) => r.roomId ?? r.room_id),
    );

    return this.contracts().filter((c) => {
      if (c.status !== EContractStatus.COMPLETED) return false;
      if ((c.contractType ?? (c as any).contract_type) !== EContractType.LEASE) return false;
      if (!c.room?.id) return false;
      if (username && c.tenant?.username && c.tenant.username !== username) return false;
      if (reviewedRoomIds.has(c.room.id)) return false;
      return true;
    });
  });

  // Hợp đồng sắp hết hạn (trong 3 tháng tới)
  expiringContracts = computed(() => {
    const now = new Date();
    const threeMonthsLater = new Date(now);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    return this.activeLeaseContracts().filter((c) => {
      const endDate = this.parseDate(c.endTime);
      return endDate && endDate <= threeMonthsLater && endDate > now;
    });
  });

  // Người thuê chưa đóng tiền tháng hiện tại (cho host)
  unpaidPaymentsThisMonth = computed(() => {
    const year = this.currentYear;
    const month = this.currentMonth;
    const result: { contract: ContractDTO; payment: RoomPaymentDTO | null; overdue: boolean }[] =
      [];

    for (const contract of this.hostActiveLeaseContracts()) {
      const payment = this.getContractMonthPayment(contract, year, month);
      if (
        !payment ||
        payment.status === EPaymentStatus.PENDING ||
        payment.status === EPaymentStatus.OVERDUE
      ) {
        result.push({
          contract,
          payment: payment ?? null,
          overdue: !payment || payment.status === EPaymentStatus.OVERDUE,
        });
      }
    }
    return result;
  });

  hostPaymentViewOptions = computed(() =>
    this.collectPaymentMonthOptions(this.hostActiveLeaseContracts()),
  );

  tenantPaymentViewOptions = computed(() =>
    this.collectPaymentMonthOptions(this.myActiveLeaseContracts()),
  );

  hostPaymentsForViewMonth = computed(() =>
    this.hostActiveLeaseContracts()
      .filter((contract) => this.isMonthInContract(contract, this.paymentViewYear(), this.paymentViewMonth()))
      .map((contract) =>
        this.buildMonthPaymentItem(contract, this.paymentViewYear(), this.paymentViewMonth()),
      ),
  );

  tenantPaymentsForViewMonth = computed(() =>
    this.myActiveLeaseContracts()
      .filter((contract) => this.isMonthInContract(contract, this.paymentViewYear(), this.paymentViewMonth()))
      .map((contract) =>
        this.buildMonthPaymentItem(contract, this.paymentViewYear(), this.paymentViewMonth()),
      ),
  );

  hostAllUnpaidPeriods = computed(() => this.collectUnpaidPeriods(this.hostActiveLeaseContracts()));

  tenantAllUnpaidPeriods = computed(() => this.collectUnpaidPeriods(this.myActiveLeaseContracts()));

  tenantUnpaidPaymentsThisMonth = computed(() => this.tenantAllUnpaidPeriods());

  tenantTotalDueThisMonth = computed(() =>
    this.tenantAllUnpaidPeriods().reduce(
      (sum, item) => sum + this.getContractMonthTotal(item.contract, item.payment),
      0,
    ),
  );

  // Giữ tương thích: toàn bộ khoản chưa xác nhận
  unpaidPayments = computed(() => {
    const result: { contract: ContractDTO; payment: RoomPaymentDTO }[] = [];
    for (const contract of this.hostActiveLeaseContracts()) {
      if (!contract.payment) continue;
      for (const p of contract.payment) {
        if (p.status === EPaymentStatus.PENDING || p.status === EPaymentStatus.OVERDUE) {
          result.push({ contract, payment: p });
        }
      }
    }
    return result;
  });

  // Hợp đồng thuê đang hiệu lực của người thuê hiện tại (phòng đang chọn / phòng đầu tiên)
  myActiveContract = computed(() => this.myActiveLeaseContracts()[0] ?? null);

  hasActiveRental = computed(() => this.myActiveLeaseContracts().length > 0);

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

  myCurrentMonthPayment = computed(() => {
    const contract = this.myActiveContract();
    if (!contract) return null;
    return this.getContractMonthPayment(contract, this.paymentViewYear(), this.paymentViewMonth());
  });

  tenantRentUnpaid = computed(() => {
    const payment = this.myCurrentMonthPayment();
    if (!payment) return true;
    return payment.status === EPaymentStatus.PENDING || payment.status === EPaymentStatus.OVERDUE;
  });

  tenantFixedUtilityFees = computed(() => {
    const payment = this.myCurrentMonthPayment();
    if (payment && this.hasPaymentBreakdown(payment)) {
      return this.sumUtilityAmounts(payment);
    }
    const room = this.myActiveContract()?.room;
    if (!room) return 0;
    return this.estimateStaticUtilityFees(room, 1);
  });

  tenantCurrentMonthTotal = computed(() => {
    const contract = this.myActiveContract();
    if (!contract) return 0;
    const payment = this.myCurrentMonthPayment();
    if (payment && this.hasPaymentBreakdown(payment)) {
      return payment.amount ?? 0;
    }
    return (contract.room?.priceRoom ?? 0) + this.tenantFixedUtilityFees();
  });

  tenantAverageMonthlyTotal = computed(() => {
    const contract = this.myActiveContract();
    if (!contract) return 0;
    const calculated = (contract.payment ?? [])
      .map((p) => this.normalizePayment(p))
      .filter((p) => this.hasPaymentBreakdown(p));
    if (calculated.length === 0) {
      return (contract.room?.priceRoom ?? 0) + this.estimateStaticUtilityFees(contract.room, 1);
    }
    const total = calculated.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    return Math.round(total / calculated.length);
  });

  tenantCalculatedMonthsCount = computed(() => {
    const contract = this.myActiveContract();
    if (!contract?.payment?.length) return 0;
    return contract.payment
      .map((p) => this.normalizePayment(p))
      .filter((p) => this.hasPaymentBreakdown(p)).length;
  });

  tenantEstimatedMonthlyTotal = computed(() => this.tenantAverageMonthlyTotal());

  paymentModalBreakdown = computed(() => {
    const contract = this.paymentModalContract();
    if (!contract?.room) return null;
    return this.calculatePaymentBreakdown(contract.room, {
      electricityUnits: this.paymentElectricityUnits(),
      waterUnits: this.paymentWaterUnits(),
      occupantCount: this.paymentOccupantCount(),
    });
  });

  paymentModalHasSavedBreakdown = computed(() => {
    const contract = this.paymentModalContract();
    if (!contract) return false;
    return this.hasPaymentBreakdown(
      this.getPaymentForPeriod(contract, this.paymentModalYear(), this.paymentModalMonth()),
    );
  });

  tenantPaymentReminders = computed(() => {
    if (!this.myActiveContract())
      return [] as Array<{
        id: string;
        title: string;
        detail: string;
        type: 'rent' | 'utilities' | 'all';
        urgent: boolean;
      }>;

    const reminders: Array<{
      id: string;
      title: string;
      detail: string;
      type: 'rent' | 'utilities' | 'all';
      urgent: boolean;
    }> = [];
    const monthLabel = `${this.currentMonth}/${this.currentYear}`;

    if (this.tenantRentUnpaid()) {
      const payment = this.myCurrentMonthPayment();
      reminders.push({
        id: 'rent',
        title: `Chưa thanh toán tiền phòng tháng ${monthLabel}`,
        detail: payment
          ? `${this.formatCurrency(payment.amount)} — ${this.getPaymentStatusLabel(payment.status)}`
          : `${this.formatCurrency(this.myActiveContract()?.room?.priceRoom)} — Chưa ghi nhận`,
        type: 'rent',
        urgent: payment?.status === EPaymentStatus.OVERDUE,
      });
    }

    if (this.tenantFixedUtilityFees() > 0 || this.myActiveContract()?.room?.priceElectricity) {
      const payment = this.myCurrentMonthPayment();
      const utilityDetail =
        payment && this.hasPaymentBreakdown(payment)
          ? `Điện ${this.formatCurrency(payment.electricityAmount)} · Nước ${this.formatCurrency(payment.waterAmount)} · Phí cố định ${this.formatCurrency(this.tenantFixedUtilityFees())}`
          : `Điện ${this.formatCurrency(this.myActiveContract()?.room?.priceElectricity)}/kWh · Nước ${this.formatCurrency(this.myActiveContract()?.room?.priceWater)}/khối · Phí cố định ~${this.formatCurrency(this.tenantFixedUtilityFees())}`;
      reminders.push({
        id: 'utilities',
        title: `Thanh toán điện, nước & dịch vụ tháng ${monthLabel}`,
        detail: utilityDetail,
        type: 'utilities',
        urgent: this.tenantRentUnpaid(),
      });
    }

    if (this.isExpiringSoon()) {
      reminders.push({
        id: 'expiry',
        title: 'Hợp đồng sắp hết hạn',
        detail: `Còn ${this.remainingMonths()} tháng — hết hạn ${this.formatDate(this.myActiveContract()?.endTime || '')}`,
        type: 'all',
        urgent: this.remainingMonths() <= 1,
      });
    }

    return reminders;
  });

  hostExpiringLeases = computed(() =>
    this.expiringContracts().filter(
      (c) => (c.contractType ?? (c as any).contract_type) === EContractType.LEASE,
    ),
  );

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

    this.contractForm.valueChanges.subscribe(() => {
      const snapshot = JSON.stringify(this.contractForm.getRawValue());
      if (
        this.contractFormSnapshot &&
        snapshot !== this.contractFormSnapshot &&
        this.hasPreviewedContract
      ) {
        this.hasPreviewedContract = false;
        this.revokePreviewUrl();
        this.draftContractId = null;
        this.draftContract.set(null);
      }
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
        const contracts = (res.listContract ?? res.list_contract ?? []).map((c: ContractDTO) =>
          this.normalizeContract(c),
        );
        this.contracts.set(contracts);
        this.syncHostPaymentQrFromContracts(contracts);
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
    this.isUploadingPaymentQr.set(true);
    this.contractService.uploadPaymentQr(fd).subscribe({
      next: (res: any) => {
        this.isUploadingPaymentQr.set(false);
        input.value = '';
        const qrKey = res?.paymentQrImage ?? res?.payment_qr_image ?? null;
        if (qrKey) {
          this.hostPaymentQrImage.set(qrKey);
          this.loadHostPaymentQrPreview(qrKey);
        }
        this.toast.success('Đã tải lên QR thanh toán của chủ nhà!', 'Thành công');
        this.loadContracts();
      },
      error: (err) => {
        this.isUploadingPaymentQr.set(false);
        input.value = '';
        this.toast.error(err.error?.message || 'Không tải lên được QR thanh toán', 'Lỗi');
      },
    });
  }

  private syncHostPaymentQrFromContracts(contracts: ContractDTO[]): void {
    const username = this.currentUsername();
    if (!username) return;

    for (const contract of contracts) {
      const owner = contract.room?.houseSet?.owner;
      if (!owner || owner.username !== username) continue;
      const qrKey = owner.paymentQrImage ?? null;
      if (!qrKey) continue;

      this.hostPaymentQrImage.set(qrKey);
      if (owner.paymentQrImageShow) {
        this.setHostPaymentQrPreview(owner.paymentQrImageShow);
      }
      return;
    }

    this.hostPaymentQrImage.set(null);
    this.setHostPaymentQrPreview(null);
  }

  private loadHostPaymentQrPreview(qrKey: string): void {
    this.houseService.getImageRoom({ id: qrKey }).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.setHostPaymentQrPreview(objectUrl);
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

  private setHostPaymentQrPreview(url: string | null): void {
    const current = this.hostPaymentQrImageShow();
    if (current?.startsWith('blob:') && current !== url) {
      URL.revokeObjectURL(current);
    }
    this.hostPaymentQrImageShow.set(url);
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
          if (this.hostPaymentQrImage() === qrKey) {
            this.setHostPaymentQrPreview(objectUrl);
          }
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

  confirmHostPaymentThisMonth(contractId: string, year?: number, month?: number): void {
    this.selectedPaymentContractId.set(contractId);
    this.selectedPaymentYear.set(year ?? this.paymentViewYear());
    this.selectedPaymentMonth.set(month ?? this.paymentViewMonth());
    this.confirmPaymentForSelectedPeriod();
  }

  setPaymentViewMonth(year: number, month: number): void {
    this.paymentViewYear.set(year);
    this.paymentViewMonth.set(month);
  }

  formatPaymentPeriodLabel(year: number, month: number): string {
    return `${month}/${year}`;
  }

  getContractMonthsInPeriod(
    contract: ContractDTO,
    upToToday = false,
  ): { year: number; month: number }[] {
    const begin = this.parseDate(contract.beginTime);
    const end = this.parseDate(contract.endTime);
    if (!begin || !end) return [];

    const now = new Date();
    const limit = upToToday ? (end.getTime() < now.getTime() ? end : now) : end;
    const months: { year: number; month: number }[] = [];
    let year = begin.getFullYear();
    let month = begin.getMonth() + 1;
    const endYear = limit.getFullYear();
    const endMonth = limit.getMonth() + 1;

    while (year < endYear || (year === endYear && month <= endMonth)) {
      months.push({ year, month });
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return months;
  }

  isMonthInContract(contract: ContractDTO, year: number, month: number): boolean {
    return this.getContractMonthsInPeriod(contract, false).some(
      (item) => item.year === year && item.month === month,
    );
  }

  private collectPaymentMonthOptions(contracts: ContractDTO[]): { year: number; month: number }[] {
    const map = new Map<string, { year: number; month: number }>();
    for (const contract of contracts) {
      for (const period of this.getContractMonthsInPeriod(contract, false)) {
        map.set(`${period.year}-${period.month}`, period);
      }
    }
    return [...map.values()].sort((a, b) => b.year - a.year || b.month - a.month);
  }

  private collectUnpaidPeriods(contracts: ContractDTO[]) {
    const items: Array<{
      contract: ContractDTO;
      year: number;
      month: number;
      payment: RoomPaymentDTO | null;
      needsPayment: boolean;
      overdue: boolean;
    }> = [];

    for (const contract of contracts) {
      for (const { year, month } of this.getContractMonthsInPeriod(contract, true)) {
        const item = this.buildMonthPaymentItem(contract, year, month);
        if (item.needsPayment) {
          items.push({ ...item, year, month });
        }
      }
    }

    return items.sort((a, b) => b.year - a.year || b.month - a.month);
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

  hasViewablePdf(contract: ContractDTO): boolean {
    return !!this.resolvePdfKey(contract);
  }

  getViewContractLabel(contract: ContractDTO): string {
    return this.hasViewablePdf(contract) ? 'Xem PDF HĐ' : 'Xem HĐ';
  }

  private resolvePdfKey(contract: ContractDTO): string | null {
    const candidates = [contract.unsignedPdfFile, contract.signedPdfFile];
    for (const key of candidates) {
      if (key && !key.startsWith('contract-preview://') && !key.startsWith('mock-signed://')) {
        return key;
      }
    }
    return null;
  }

  viewDocument(contract: ContractDTO): void {
    this.viewingContract.set(contract);
    if (this.documentObjectUrl) {
      URL.revokeObjectURL(this.documentObjectUrl);
      this.documentObjectUrl = null;
    }
    this.documentPdfUrl.set(null);

    const pdfKey = this.resolvePdfKey(contract);
    if (pdfKey) {
      this.documentViewMode.set('pdf');
      this.documentLoading.set(true);
      this.showDocumentViewer.set(true);
      this.contractService.getContractPdfFile(pdfKey).subscribe({
        next: (blob) => {
          this.documentObjectUrl = URL.createObjectURL(blob);
          this.documentPdfUrl.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(this.documentObjectUrl),
          );
          this.documentLoading.set(false);
        },
        error: () => {
          this.documentLoading.set(false);
          this.documentViewMode.set('html');
          this.documentContent.set(contract.documentContent || 'Không có nội dung hợp đồng.');
        },
      });
      return;
    }
    this.documentViewMode.set('html');
    this.documentContent.set(contract.documentContent || 'Không có nội dung hợp đồng.');
    this.showDocumentViewer.set(true);
  }

  closeDocumentViewer(revoke = true): void {
    this.showDocumentViewer.set(false);
    this.viewingContract.set(null);
    this.documentLoading.set(false);
    if (revoke && this.documentObjectUrl) {
      URL.revokeObjectURL(this.documentObjectUrl);
      this.documentObjectUrl = null;
    }
    this.documentPdfUrl.set(null);
  }

  signFromDocumentViewer(): void {
    const contract = this.viewingContract();
    if (!contract || !this.canSign(contract)) return;
    this.closeDocumentViewer();
    this.openSignModal(contract);
  }

  approveFromDocumentViewer(): void {
    const contract = this.viewingContract();
    if (!contract || !this.canConfirm(contract)) return;
    this.approveContract(contract.id);
  }

  rejectFromDocumentViewer(): void {
    const contract = this.viewingContract();
    if (!contract || !this.canConfirm(contract)) return;
    this.rejectContract(contract.id);
  }

  printDocument(): void {
    if (this.documentViewMode() === 'pdf' && this.documentObjectUrl) {
      const win = window.open(this.documentObjectUrl, '_blank');
      if (!win) return;
      win.onload = () => {
        win.focus();
        win.print();
      };
      return;
    }
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
    if (
      contract.status !== EContractStatus.COMPLETED ||
      contract.contractType !== EContractType.LEASE
    ) {
      this.toast.warning(
        'Chỉ tạo đơn tạm trú/tạm vắng từ hợp đồng thuê trọ đã hoàn thành',
        'Chú ý',
      );
      return;
    }
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

  triggerRoomSuggestionEmail(): void {
    this.isTriggeringRoomSuggestions.set(true);
    this.contractService.triggerRoomSuggestions().subscribe({
      next: (res: any) => {
        this.isTriggeringRoomSuggestions.set(false);
        this.toast.success(res?.message || 'Đã gửi email gợi ý phòng trọ!', 'Thành công');
      },
      error: (err) => {
        this.isTriggeringRoomSuggestions.set(false);
        this.toast.error(err.error?.message || 'Không gửi được email gợi ý phòng', 'Lỗi');
      },
    });
  }

  triggerHostPaymentReminderEmails(): void {
    this.isTriggeringHostReminders.set(true);
    this.contractService.triggerHostPaymentReminders().subscribe({
      next: (res: any) => {
        this.isTriggeringHostReminders.set(false);
        this.toast.success(res?.message || 'Đã gửi email nhắc thanh toán!', 'Thành công');
      },
      error: (err) => {
        this.isTriggeringHostReminders.set(false);
        this.toast.error(err.error?.message || 'Không gửi được email nhắc thanh toán', 'Lỗi');
      },
    });
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
    this.submitHostContractDraft();
  }

  private buildHostContractRequestPayload() {
    const val = this.contractForm.getRawValue();
    const depositRaw = val.deposit_amount;
    const deposit =
      depositRaw != null && depositRaw !== ''
        ? Number(String(depositRaw).replace(/[^\d]/g, ''))
        : null;
    return {
      room_id: val.room_id,
      tenant_username: val.tenant_username?.trim(),
      contract_type: val.contract_type,
      deposit_amount: deposit != null && !Number.isNaN(deposit) ? deposit : null,
      notify_channel: val.notify_channel || 'EMAIL',
      terms: val.terms,
      begin_time: this.formatDateTime(val.begin_time),
      end_time: this.formatDateTime(val.end_time),
    };
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.previewPdfUrl = null;
  }

  private resetHostContractDraftState(): void {
    this.hasPreviewedContract = false;
    this.isPreviewing = false;
    this.isContractModalLoading.set(false);
    this.revokePreviewUrl();
    this.draftContractId = null;
    this.draftContract.set(null);
    this.showContractPdfPreviewModal.set(false);
    this.draftSignPdfBlobUrl = null;
    this.contractFormSnapshot = '';
  }

  getSelectedHostRoomLabel(): string {
    const roomId = this.contractForm.get('room_id')?.value;
    if (!roomId) return 'Chưa chọn phòng';
    const room = this.getHostRooms().find((r) => r.id === roomId);
    return room ? `${room.name} — ${room.houseName}` : 'Chưa chọn phòng';
  }

  previewHostContractPdf(): void {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      this.toast.warning('Vui lòng điền đủ thông tin hợp đồng.', 'Chú ý');
      return;
    }

    this.isPreviewing = true;
    this.isContractModalLoading.set(true);
    this.revokePreviewUrl();
    const requestData = this.buildHostContractRequestPayload();

    this.contractService.previewContractPdf(requestData).subscribe({
      next: (res: any) => {
        const contractId = res.idContract ?? res.id_contract;
        const urlKey = res.urlContract ?? res.url_contract;
        this.draftContractId = contractId;
        const room = this.getHostRooms().find((r) => r.id === requestData.room_id);
        this.draftContract.set({
          id: contractId,
          unsignedPdfFile: urlKey,
          room: room
            ? {
                id: room.id,
                name: room.name,
                houseSet: { name: room.houseName },
              }
            : undefined,
        } as ContractDTO);

        this.contractService.getContractPdfFile(urlKey).subscribe({
          next: (blob) => {
            this.previewObjectUrl = URL.createObjectURL(blob);
            this.previewPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
              this.previewObjectUrl,
            );
            this.hasPreviewedContract = true;
            this.contractFormSnapshot = JSON.stringify(this.contractForm.getRawValue());
            this.isPreviewing = false;
            this.isContractModalLoading.set(false);
            this.showContractPdfPreviewModal.set(true);
          },
          error: (err) => {
            this.isPreviewing = false;
            this.isContractModalLoading.set(false);
            this.toast.error(err.error?.message || 'Không tải được PDF hợp đồng', 'Lỗi');
          },
        });
      },
      error: (err) => {
        this.isPreviewing = false;
        this.isContractModalLoading.set(false);
        this.toast.error(err.error?.message || 'Không tạo được bản xem trước hợp đồng', 'Lỗi');
      },
    });
  }

  viewHostContractPreviewAgain(): void {
    if (this.previewPdfUrl) {
      this.showContractPdfPreviewModal.set(true);
    } else {
      this.previewHostContractPdf();
    }
  }

  closeContractPdfPreviewModal(): void {
    this.showContractPdfPreviewModal.set(false);
  }

  openHostSignFromPreview(): void {
    if (!this.hasPreviewedContract || !this.draftContract()) {
      this.toast.warning('Vui lòng xem trước hợp đồng trước khi ký.', 'Chú ý');
      return;
    }
    this.showContractPdfPreviewModal.set(false);
    this.draftSignPdfBlobUrl = this.previewObjectUrl;
    this.signingContract.set(null);
    this.showSignModal.set(true);
  }

  submitHostContractDraft(): void {
    if (this.contractForm.invalid) {
      this.contractForm.markAllAsTouched();
      return;
    }
    if (!this.hasPreviewedContract || !this.draftContractId) {
      this.toast.warning('Vui lòng xem trước hợp đồng trước khi gửi.', 'Chú ý');
      return;
    }

    this.isContractModalLoading.set(true);
    this.contractService.submitDraftContract(this.draftContractId).subscribe({
      next: () => {
        this.isContractModalLoading.set(false);
        this.toast.success('Đã gửi hợp đồng cho người thuê!', 'Thành công');
        this.resetHostContractDraftState();
        this.contractForm.reset({
          contract_type: 'LEASE',
          notify_channel: 'EMAIL',
          deposit_amount: 0,
          terms: '',
        });
        this.loadContracts();
        this.setTab('contracts');
      },
      error: (err) => {
        this.isContractModalLoading.set(false);
        this.toast.error(err.error?.message || 'Gửi hợp đồng thất bại', 'Lỗi');
      },
    });
  }

  deleteHostDraftContract(): void {
    if (!this.draftContractId) return;
    if (!confirm('Xóa bản nháp hợp đồng này? Hành động không thể hoàn tác.')) return;

    this.isContractModalLoading.set(true);
    this.contractService.deleteDraftContract(this.draftContractId).subscribe({
      next: () => {
        this.isContractModalLoading.set(false);
        this.toast.success('Đã xóa bản nháp hợp đồng', 'Thành công');
        this.resetHostContractDraftState();
      },
      error: (err) => {
        this.isContractModalLoading.set(false);
        this.toast.error(err.error?.message || 'Không xóa được bản nháp', 'Lỗi');
      },
    });
  }

  onHostDraftSigned(): void {
    this.closeSignModal();
    this.resetHostContractDraftState();
    this.contractForm.reset({
      contract_type: 'LEASE',
      notify_channel: 'EMAIL',
      deposit_amount: 0,
      terms: '',
    });
    this.loadContracts();
    this.setTab('contracts');
    this.toast.success('Đã ký và gửi hợp đồng cho người thuê!', 'Thành công');
  }

  approveContract(contractId: string) {
    if (!confirm('Bạn có chắc chắn muốn xác nhận điều khoản hợp đồng này?')) return;

    this.isLoading.set(true);
    this.contractService.confirmContract(contractId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã xác nhận hợp đồng. Hai bên có thể bắt đầu ký.', 'Thành công');
        this.closeDocumentViewer();
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
        this.closeDocumentViewer();
        this.loadContracts();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error('Lỗi khi từ chối hợp đồng', 'Thất bại');
      },
    });
  }

  canDeleteDraft(contract: ContractDTO): boolean {
    if (contract.status !== EContractStatus.DRAFT) return false;
    const username = this.defaultSignUsername();
    if (contract.createdByRole === ERole.ROLE_HOST) {
      return contract.room?.houseSet?.owner?.username === username;
    }
    return contract.tenant?.username === username;
  }

  deleteDraftContract(contract: ContractDTO): void {
    if (!this.canDeleteDraft(contract)) return;
    if (!confirm('Xóa bản nháp hợp đồng này? Hành động không thể hoàn tác.')) return;

    this.isLoading.set(true);
    this.contractService.deleteDraftContract(contract.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã xóa bản nháp hợp đồng', 'Thành công');
        this.closeDocumentViewer();
        this.loadContracts();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Không xóa được bản nháp', 'Lỗi');
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

  isWaitingOtherSignature(contract: ContractDTO): boolean {
    if (this.canConfirm(contract) || this.canSign(contract)) return false;
    if (
      contract.status === EContractStatus.COMPLETED ||
      contract.status === EContractStatus.REJECTED ||
      contract.status === EContractStatus.EXPIRED ||
      contract.status === EContractStatus.DRAFT
    ) {
      return false;
    }
    if (contract.status === EContractStatus.PROPOSED_BY_TENANT && this.isRoomer()) return true;
    if (contract.status === EContractStatus.PROPOSED_BY_HOST && this.isHost()) return true;
    return [
      EContractStatus.COUNTERPARTY_CONFIRMED,
      EContractStatus.TENANT_SIGNED,
      EContractStatus.HOST_SIGNED,
    ].includes(contract.status as EContractStatus);
  }

  openWorkflowList(
    filter: 'pending_confirm' | 'waiting_my_sign' | 'waiting_other_sign' | 'completed',
  ): void {
    this.workflowListFilter.set(filter);
    this.showWorkflowListModal.set(true);
  }

  closeWorkflowList(): void {
    this.showWorkflowListModal.set(false);
    this.workflowListFilter.set(null);
  }

  workflowListTitle(): string {
    switch (this.workflowListFilter()) {
      case 'pending_confirm':
        return 'Hợp đồng chờ xác nhận';
      case 'waiting_my_sign':
        return 'Hợp đồng chờ tôi ký';
      case 'waiting_other_sign':
        return 'Hợp đồng chờ bên kia ký';
      case 'completed':
        return 'Hợp đồng đã hoàn thành';
      default:
        return 'Danh sách hợp đồng';
    }
  }

  workflowListContracts(): ContractDTO[] {
    switch (this.workflowListFilter()) {
      case 'pending_confirm':
        return this.pendingConfirmContracts();
      case 'waiting_my_sign':
        return this.waitingMySignatureContracts();
      case 'waiting_other_sign':
        return this.waitingOtherSignatureContracts();
      case 'completed':
        return this.completedWorkflowContracts();
      default:
        return [];
    }
  }

  openContractFromWorkflowList(contract: ContractDTO): void {
    this.closeWorkflowList();
    if (this.canSign(contract)) {
      this.openSignModal(contract);
      return;
    }
    if (this.canConfirm(contract)) {
      this.viewDocument(contract);
      return;
    }
    this.viewDocument(contract);
  }

  canSign(contract: ContractDTO): boolean {
    if (contract.status === EContractStatus.DRAFT) {
      return this.isRoomer();
    }
    if (contract.status === EContractStatus.PROPOSED_BY_TENANT && !contract.tenantSignedAt) {
      return this.isRoomer();
    }
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
    if (this.showDocumentViewer()) {
      this.closeDocumentViewer();
    }
    this.draftContract.set(null);
    this.draftSignPdfBlobUrl = null;
    this.signingContract.set(contract);
    this.showSignModal.set(true);
  }

  closeSignModal(): void {
    this.showSignModal.set(false);
    this.signingContract.set(null);
    this.draftSignPdfBlobUrl = null;
  }

  onSigned(): void {
    if (this.draftContract()) {
      this.onHostDraftSigned();
      return;
    }
    this.closeSignModal();
    this.loadContracts();
    this.toast.success('Đã ký hợp đồng thành công', 'Thành công');
  }

  defaultSignUsername(): string {
    const fromProfile = this.profile()?.user?.username;
    if (fromProfile) return fromProfile;
    const token = this.tokenService.getAccessToken();
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.username || '';
    } catch {
      return '';
    }
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
      case EContractStatus.DRAFT:
        return 'Bản nháp';
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
      case EContractStatus.DRAFT:
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

  isWithinActivePeriod(contract: ContractDTO): boolean {
    const now = new Date();
    const begin = this.parseDate(contract.beginTime);
    const end = this.parseDate(contract.endTime);
    if (!begin || !end) return false;
    return now >= begin && now <= end;
  }

  openPaymentQrModal(
    type: 'rent' | 'utilities' | 'all' = 'all',
    contract?: ContractDTO,
    year?: number,
    month?: number,
  ): void {
    const target = contract ?? this.myActiveContract();
    if (!target) return;
    const viewYear = year ?? this.paymentViewYear();
    const viewMonth = month ?? this.paymentViewMonth();
    this.isHostPaymentModal.set(false);
    this.paymentModalContract.set(target);
    this.paymentModalType.set(type);
    this.paymentModalNote.set('');
    this.paymentModalYear.set(viewYear);
    this.paymentModalMonth.set(viewMonth);
    this.initPaymentBreakdownForm(
      target,
      this.getPaymentForPeriod(target, viewYear, viewMonth),
    );
    this.showPaymentQrModal.set(true);
  }

  openHostPaymentBreakdown(
    contract: ContractDTO,
    payment?: RoomPaymentDTO | null,
    year?: number,
    month?: number,
  ): void {
    const viewYear = year ?? this.paymentViewYear();
    const viewMonth = month ?? this.paymentViewMonth();
    this.isHostPaymentModal.set(true);
    this.paymentModalContract.set(contract);
    this.paymentModalType.set('all');
    this.paymentModalNote.set('');
    this.paymentModalYear.set(viewYear);
    this.paymentModalMonth.set(viewMonth);
    const monthPayment =
      payment ?? this.getPaymentForPeriod(contract, viewYear, viewMonth);
    this.initPaymentBreakdownForm(contract, monthPayment);
    this.showPaymentQrModal.set(true);
  }

  openHostPaymentBreakdownForSelected(): void {
    const contractId = this.selectedPaymentContractId();
    if (!contractId) return;
    const contract = this.contracts().find((c) => c.id === contractId);
    if (!contract) return;
    const year = Number(this.selectedPaymentYear());
    const month = Number(this.selectedPaymentMonth());
    this.isHostPaymentModal.set(true);
    this.paymentModalContract.set(contract);
    this.paymentModalType.set('all');
    this.paymentModalNote.set('');
    this.paymentModalYear.set(year);
    this.paymentModalMonth.set(month);
    this.initPaymentBreakdownForm(contract, this.getPaymentForPeriod(contract, year, month));
    this.showPaymentQrModal.set(true);
  }

  private getPaymentForPeriod(
    contract: ContractDTO,
    year: number,
    month: number,
  ): RoomPaymentDTO | null {
    return this.getContractMonthPayment(contract, year, month);
  }

  getContractMonthPayment(
    contract: ContractDTO,
    year = this.currentYear,
    month = this.currentMonth,
  ): RoomPaymentDTO | null {
    const raw = contract.payment?.find((p) => p.paymentYear === year && p.paymentMonth === month);
    return raw ? this.normalizePayment(raw) : null;
  }

  private buildMonthPaymentItem(contract: ContractDTO, year: number, month: number) {
    const payment = this.getContractMonthPayment(contract, year, month);
    const needsPayment =
      !payment ||
      payment.status === EPaymentStatus.PENDING ||
      payment.status === EPaymentStatus.OVERDUE;
    return {
      contract,
      payment,
      isPaid: payment?.status === EPaymentStatus.CONFIRMED,
      needsPayment,
      overdue: !payment || payment.status === EPaymentStatus.OVERDUE,
    };
  }

  getContractMonthTotal(contract: ContractDTO, payment: RoomPaymentDTO | null): number {
    if (payment && this.hasPaymentBreakdown(payment)) {
      return payment.amount ?? 0;
    }
    const room = contract.room;
    if (!room) return 0;
    return (room.priceRoom ?? 0) + this.estimateStaticUtilityFees(room, 1);
  }

  isContractPaidThisMonth(contract: ContractDTO, year?: number, month?: number): boolean {
    const payment = this.getContractMonthPayment(
      contract,
      year ?? this.paymentViewYear(),
      month ?? this.paymentViewMonth(),
    );
    return payment?.status === EPaymentStatus.CONFIRMED;
  }

  private normalizeContract(contract: ContractDTO): ContractDTO {
    return {
      ...contract,
      payment: (contract.payment ?? []).map((p) => this.normalizePayment(p)),
    };
  }

  normalizePayment(raw: RoomPaymentDTO | Record<string, unknown>): RoomPaymentDTO {
    const p = raw as Record<string, unknown>;
    return {
      ...(raw as RoomPaymentDTO),
      electricityUnits: (raw as RoomPaymentDTO).electricityUnits ?? (p['electricity_units'] as number) ?? null,
      waterUnits: (raw as RoomPaymentDTO).waterUnits ?? (p['water_units'] as number) ?? null,
      occupantCount: (raw as RoomPaymentDTO).occupantCount ?? (p['occupant_count'] as number) ?? null,
      rentAmount: (raw as RoomPaymentDTO).rentAmount ?? (p['rent_amount'] as number) ?? null,
      electricityAmount:
        (raw as RoomPaymentDTO).electricityAmount ?? (p['electricity_amount'] as number) ?? null,
      waterAmount: (raw as RoomPaymentDTO).waterAmount ?? (p['water_amount'] as number) ?? null,
      internetAmount:
        (raw as RoomPaymentDTO).internetAmount ?? (p['internet_amount'] as number) ?? null,
      washingMachineAmount:
        (raw as RoomPaymentDTO).washingMachineAmount ??
        (p['washing_machine_amount'] as number) ??
        null,
      generalCleaningAmount:
        (raw as RoomPaymentDTO).generalCleaningAmount ??
        (p['general_cleaning_amount'] as number) ??
        null,
      generalElectricityAmount:
        (raw as RoomPaymentDTO).generalElectricityAmount ??
        (p['general_electricity_amount'] as number) ??
        null,
      filledBy: (raw as RoomPaymentDTO).filledBy ?? (p['filled_by'] as string) ?? null,
      filledByRole:
        (raw as RoomPaymentDTO).filledByRole ?? (p['filled_by_role'] as string) ?? null,
    };
  }

  hasPaymentBreakdown(payment: RoomPaymentDTO | null | undefined): boolean {
    if (!payment) return false;
    const p = this.normalizePayment(payment);
    return (
      p.filledBy != null ||
      p.rentAmount != null ||
      p.electricityAmount != null ||
      p.waterAmount != null ||
      p.internetAmount != null
    );
  }

  sumUtilityAmounts(payment: RoomPaymentDTO): number {
    const p = this.normalizePayment(payment);
    return (
      (p.electricityAmount ?? 0) +
      (p.waterAmount ?? 0) +
      (p.internetAmount ?? 0) +
      (p.washingMachineAmount ?? 0) +
      (p.generalCleaningAmount ?? 0) +
      (p.generalElectricityAmount ?? 0)
    );
  }

  estimateStaticUtilityFees(room: ContractRoomDTO, occupants: number): number {
    const occ = Math.max(1, occupants);
    return this.calculatePaymentBreakdown(room, {
      electricityUnits: 0,
      waterUnits: 0,
      occupantCount: occ,
    }).totalAmount - (room.priceRoom ?? 0);
  }

  private initPaymentBreakdownForm(contract: ContractDTO, payment: RoomPaymentDTO | null): void {
    const normalized = payment ? this.normalizePayment(payment) : null;
    if (normalized && this.hasPaymentBreakdown(normalized)) {
      this.paymentElectricityUnits.set(normalized.electricityUnits ?? 0);
      this.paymentWaterUnits.set(normalized.waterUnits ?? 0);
      this.paymentOccupantCount.set(
        normalized.occupantCount && normalized.occupantCount > 0 ? normalized.occupantCount : 1,
      );
      return;
    }
    this.paymentElectricityUnits.set(0);
    this.paymentWaterUnits.set(0);
    this.paymentOccupantCount.set(1);
  }

  calculatePaymentBreakdown(
    room: ContractRoomDTO,
    input: PaymentBreakdownInput,
  ): PaymentBreakdownResult {
    const occupants = Math.max(1, input.occupantCount || 1);
    const elecUnits = Math.max(0, input.electricityUnits || 0);
    const waterUnits = Math.max(0, input.waterUnits || 0);
    const rentAmount = room.priceRoom ?? 0;
    const electricityAmount = Math.round(elecUnits * (room.priceElectricity ?? 0));
    const waterPerPerson = (room.priceWater ?? 0) > 100_000;
    const waterAmount = waterPerPerson
      ? (room.priceWater ?? 0) * occupants
      : Math.round(waterUnits * (room.priceWater ?? 0));
    const internetAmount =
      (room.priceInternet ?? 0) > 0 ? (room.priceInternet ?? 0) * occupants : 0;
    const washingMachineAmount =
      (room.priceWashingMachine ?? 0) > 0 ? (room.priceWashingMachine ?? 0) * occupants : 0;
    const generalCleaningAmount =
      (room.priceGeneralCleaning ?? 0) > 0 ? (room.priceGeneralCleaning ?? 0) * occupants : 0;
    const generalElectricityAmount =
      (room.priceGeneralElectricity ?? 0) > 0
        ? (room.priceGeneralElectricity ?? 0) * occupants
        : 0;
    const totalAmount =
      rentAmount +
      electricityAmount +
      waterAmount +
      internetAmount +
      washingMachineAmount +
      generalCleaningAmount +
      generalElectricityAmount;
    return {
      rentAmount,
      electricityAmount,
      waterAmount,
      internetAmount,
      washingMachineAmount,
      generalCleaningAmount,
      generalElectricityAmount,
      totalAmount,
      waterPerPerson,
    };
  }

  isWaterPerPerson(room?: ContractRoomDTO | null): boolean {
    return (room?.priceWater ?? 0) > 100_000;
  }

  getPaymentBreakdownForContract(contract: ContractDTO, payment?: RoomPaymentDTO | null) {
    const monthPayment =
      payment ??
      this.getPaymentForPeriod(contract, this.currentYear, this.currentMonth);
    if (monthPayment && this.hasPaymentBreakdown(monthPayment)) {
      const p = this.normalizePayment(monthPayment);
      return {
        rentAmount: p.rentAmount ?? 0,
        electricityAmount: p.electricityAmount ?? 0,
        waterAmount: p.waterAmount ?? 0,
        internetAmount: p.internetAmount ?? 0,
        washingMachineAmount: p.washingMachineAmount ?? 0,
        generalCleaningAmount: p.generalCleaningAmount ?? 0,
        generalElectricityAmount: p.generalElectricityAmount ?? 0,
        totalAmount: p.amount ?? 0,
        waterPerPerson: this.isWaterPerPerson(contract.room),
      } as PaymentBreakdownResult;
    }
    return this.calculatePaymentBreakdown(contract.room, {
      electricityUnits: 0,
      waterUnits: 0,
      occupantCount: 1,
    });
  }

  closePaymentQrModal(): void {
    this.showPaymentQrModal.set(false);
    this.paymentModalNote.set('');
    this.paymentModalContract.set(null);
    this.isHostPaymentModal.set(false);
  }

  savePaymentBreakdownOnly(): void {
    const contract = this.paymentModalContract();
    if (!contract) return;

    this.isSavingBreakdown.set(true);
    this.contractService
      .savePaymentBreakdown({
        contract_id: contract.id,
        payment_year: this.paymentModalYear(),
        payment_month: this.paymentModalMonth(),
        electricity_units: this.paymentElectricityUnits(),
        water_units: this.paymentWaterUnits(),
        occupant_count: this.paymentOccupantCount(),
        note: this.paymentModalNote().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSavingBreakdown.set(false);
          this.toast.success('Đã lưu bảng tiền thanh toán', 'Thành công');
          this.closePaymentQrModal();
          this.loadContracts();
        },
        error: (err) => {
          this.isSavingBreakdown.set(false);
          this.toast.error(err.error?.message || 'Không lưu được bảng tiền', 'Lỗi');
        },
      });
  }

  confirmTenantPaid(): void {
    const contract = this.paymentModalContract() ?? this.myActiveContract();
    if (!contract) return;
    if (!confirm('Xác nhận bạn đã chuyển khoản? Hệ thống sẽ gửi email thông báo cho chủ trọ.')) {
      return;
    }

    this.isNotifyingPayment.set(true);
    this.contractService
      .notifyTenantPayment({
        contract_id: contract.id,
        payment_year: this.paymentModalYear(),
        payment_month: this.paymentModalMonth(),
        note: this.paymentModalNote().trim() || undefined,
        electricity_units: this.paymentElectricityUnits(),
        water_units: this.paymentWaterUnits(),
        occupant_count: this.paymentOccupantCount(),
      })
      .subscribe({
        next: () => {
          this.isNotifyingPayment.set(false);
          this.closePaymentQrModal();
          this.toast.success('Đã gửi thông báo thanh toán cho chủ trọ!', 'Thành công');
          this.loadContracts();
        },
        error: (err) => {
          this.isNotifyingPayment.set(false);
          this.toast.error(err.error?.message || 'Không gửi được thông báo', 'Lỗi');
        },
      });
  }

  getPaymentModalTitle(): string {
    switch (this.paymentModalType()) {
      case 'rent':
        return 'Thanh toán tiền phòng';
      case 'utilities':
        return 'Thanh toán điện, nước & dịch vụ';
      default:
        return 'Thanh toán hàng tháng';
    }
  }

  isPaidThisMonth(contract?: ContractDTO): boolean {
    const target = contract ?? this.myActiveContract();
    if (!target) return false;
    return this.isContractPaidThisMonth(target, this.paymentViewYear(), this.paymentViewMonth());
  }
}
