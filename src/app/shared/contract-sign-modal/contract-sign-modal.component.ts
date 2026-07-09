import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdfFromBytes } from '../pdf/pdfjs-loader';
import { ContractService } from '../../core/services/contract.service';
import { ToastrService } from 'ngx-toastr';

const PDF_RENDER_SCALE = 1.35;
const SIGNATURE_IMAGE_URL = '/form-sign.png';
const SIGN_WAIT_SECONDS = 90;
const SIGN_POLL_INTERVAL_MS = 5000;

export interface PdfPageView {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  displayWidth: number;
  displayHeight: number;
}

@Component({
  selector: 'app-contract-sign-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './contract-sign-modal.component.html',
  styleUrl: './contract-sign-modal.component.scss',
})
export class ContractSignModalComponent implements OnChanges, OnDestroy {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private toast = inject(ToastrService);
  private injector = inject(Injector);

  readonly signatureImageUrl = SIGNATURE_IMAGE_URL;

  @Input() open = false;
  @Input() contract: any | null = null;
  @Input() username = '';
  @Input() pdfUrl: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() signed = new EventEmitter<void>();

  step = signal<1 | 2>(1);
  providers = signal<any[]>([]);
  certificates = signal<any[]>([]);
  certificatesLoaded = signal(false);
  isLoading = signal(false);
  isRenderingPdf = signal(false);
  isFetchingCerts = signal(false);
  hasSelectedPosition = signal(false);
  pdfPages = signal<PdfPageView[]>([]);
  selectedPosition = signal<{ page: number; x: number; y: number } | null>(null);
  showWaitingModal = signal(false);
  remainingSeconds = signal(SIGN_WAIT_SECONDS);

  private pdfDoc: PDFDocumentProxy | null = null;
  private countdownTimer?: ReturnType<typeof setInterval>;
  private pollTimer?: ReturnType<typeof setInterval>;
  private signBaseline: {
    status?: string | null;
    tenantSignedAt?: string | null;
    hostSignedAt?: string | null;
  } | null = null;
  private pollingSign = false;

  signForm = this.fb.group({
    provider_id: ['', Validators.required],
    username: ['', Validators.required],
    certificate_id: [''],
    serial_number: [''],
    user_id: [''],
    page: [1, Validators.required],
    x: [0, Validators.required],
    y: [0, Validators.required],
    width: [180],
    height: [60],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.resetModalState();
      // this.signForm.patchValue({ username: this.username });
      this.loadPdfDocument();
    }
    if (changes['open'] && !this.open) {
      this.stopWaitingTimers();
      this.cleanupPdf();
    }
  }

  ngOnDestroy(): void {
    this.stopWaitingTimers();
    this.cleanupPdf();
  }

  private resetModalState(): void {
    this.stopWaitingTimers();
    this.showWaitingModal.set(false);
    this.remainingSeconds.set(SIGN_WAIT_SECONDS);
    this.signBaseline = null;
    this.step.set(1);
    this.providers.set([]);
    this.certificates.set([]);
    this.certificatesLoaded.set(false);
    this.hasSelectedPosition.set(false);
    this.selectedPosition.set(null);
    this.pdfPages.set([]);
    this.signForm.patchValue({
      provider_id: '',
      certificate_id: '',
      serial_number: '',
      user_id: '',
      page: 1,
      x: 0,
      y: 0,
    });
  }

  async loadPdfDocument(): Promise<void> {
    this.isRenderingPdf.set(true);
    if (this.pdfDoc) {
      void this.pdfDoc.destroy();
      this.pdfDoc = null;
    }

    try {
      const bytes = await this.fetchPdfBytes();
      this.pdfDoc = await loadPdfFromBytes(bytes);

      const pages: PdfPageView[] = [];
      for (let pageNumber = 1; pageNumber <= this.pdfDoc.numPages; pageNumber++) {
        const page = await this.pdfDoc.getPage(pageNumber);
        const viewportPt = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
        pages.push({
          pageNumber,
          widthPt: viewportPt.width,
          heightPt: viewportPt.height,
          displayWidth: viewport.width,
          displayHeight: viewport.height,
        });
      }
      this.pdfPages.set(pages);
      // Show canvas elements before rendering — while isRenderingPdf is true the template has no canvases.
      this.isRenderingPdf.set(false);
      await this.renderPagesAfterViewReady();
    } catch {
      this.toast.error('Không tải được file PDF hợp đồng', 'Lỗi');
      this.pdfPages.set([]);
      this.isRenderingPdf.set(false);
    }
  }

  private renderPagesAfterViewReady(): Promise<void> {
    return new Promise((resolve) => {
      afterNextRender(
        () => {
          void (async () => {
            let rendered = await this.renderPagesToCanvases();
            if (!rendered && this.pdfPages().length) {
              await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
              await this.renderPagesToCanvases();
            }
            resolve();
          })();
        },
        { injector: this.injector },
      );
    });
  }

  private async fetchPdfBytes(): Promise<ArrayBuffer> {
    if (this.pdfUrl) {
      const response = await fetch(this.pdfUrl);
      return response.arrayBuffer();
    }

    const key = this.resolvePdfKey();
    if (!key) {
      throw new Error('Missing PDF key');
    }

    return new Promise((resolve, reject) => {
      this.contractService.getContractPdfFile(key).subscribe({
        next: (blob) => {
          blob.arrayBuffer().then(resolve).catch(reject);
        },
        error: reject,
      });
    });
  }

  private async renderPagesToCanvases(): Promise<boolean> {
    if (!this.pdfDoc) return false;

    let renderedAny = false;
    for (const meta of this.pdfPages()) {
      const canvas = document.getElementById(
        `pdf-page-canvas-${meta.pageNumber}`,
      ) as HTMLCanvasElement | null;
      if (!canvas) continue;

      renderedAny = true;
      const page = await this.pdfDoc.getPage(meta.pageNumber);
      const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const context = canvas.getContext('2d');
      if (!context) continue;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      await page.render({ canvasContext: context, viewport, canvas }).promise;
    }
    return renderedAny;
  }

  choosePosition(event: MouseEvent, pageMeta: PdfPageView): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    // Tọa độ X giữ nguyên (từ trái sang phải)
    const pdfX = Math.round((cssX / rect.width) * pageMeta.widthPt);

    // Tọa độ Y đang tính từ trên xuống (Top-Down)
    const pdfYTopDown = (cssY / rect.height) * pageMeta.heightPt;

    // Lấy chiều cao của khung chữ ký (mặc định 60 theo logic form của bạn)
    const signHeight = this.signForm.value.height ?? 60;

    // Chuyển đổi Y sang góc dưới bên trái (Bottom-Left).
    // Điểm y lúc này sẽ là góc DƯỚI CÙNG TRÁI của khung chữ ký
    const pdfY = Math.round(pageMeta.heightPt - pdfYTopDown - signHeight);

    this.signForm.patchValue({
      page: pageMeta.pageNumber,
      x: pdfX,
      y: pdfY,
    });

    this.selectedPosition.set({ page: pageMeta.pageNumber, x: pdfX, y: pdfY });
    this.hasSelectedPosition.set(true);
  }

  markerLeftPercent(page: PdfPageView): number {
    const pos = this.selectedPosition();
    if (!pos || pos.page !== page.pageNumber || !page.widthPt) return 0;
    return (pos.x / page.widthPt) * 100;
  }

  markerTopPercent(page: PdfPageView): number {
    const pos = this.selectedPosition();
    if (!pos || pos.page !== page.pageNumber || !page.heightPt) return 0;

    const signHeight = this.signForm.value.height ?? 60;

    // Đảo ngược lại: tính khoảng cách từ đỉnh trang (Top) xuống góc trên của chữ ký
    const topDownY = page.heightPt - pos.y - signHeight;

    // Trả về phần trăm (dùng cho CSS top: ...%)
    return (topDownY / page.heightPt) * 100;
  }

  markerWidthPercent(page: PdfPageView): number {
    const width = this.signForm.value.width ?? 180;
    if (!page.widthPt) return 0;
    return (width / page.widthPt) * 100;
  }

  markerHeightPercent(page: PdfPageView): number {
    const height = this.signForm.value.height ?? 60;
    if (!page.heightPt) return 0;
    return (height / page.heightPt) * 100;
  }

  goToSignStep(): void {
    if (!this.hasSelectedPosition()) {
      this.toast.warning('Vui lòng click trên PDF để chọn vị trí chữ ký', 'Chú ý');
      return;
    }
    this.step.set(2);
    this.loadProviders();
    void this.renderPagesAfterViewReady();
  }

  backToPositionStep(): void {
    this.step.set(1);
    this.certificates.set([]);
    this.certificatesLoaded.set(false);
    this.signForm.patchValue({ certificate_id: '', serial_number: '', user_id: '' });
    void this.renderPagesAfterViewReady();
  }

  loadProviders(): void {
    this.contractService.getSignatureProviders().subscribe({
      next: (res) => {
        this.providers.set(res.providers || []);
        const first = this.providers()[0];
        if (first && !this.signForm.value.provider_id) {
          this.signForm.patchValue({ provider_id: first.id });
        }
      },
      error: (err) =>
        this.toast.error(err.error?.message || 'Không tải được nhà cung cấp ký', 'Lỗi'),
    });
  }

  onProviderOrUsernameChange(): void {
    this.certificates.set([]);
    this.certificatesLoaded.set(false);
    this.signForm.patchValue({ certificate_id: '', serial_number: '', user_id: '' });
  }

  fetchCertificates(): void {
    const providerId = this.signForm.value.provider_id;
    const username = this.signForm.value.username?.trim();
    if (!providerId || !username) {
      this.signForm.markAllAsTouched();
      this.toast.warning('Vui lòng chọn nhà cung cấp và nhập số giấy tờ tùy thân', 'Chú ý');
      return;
    }

    this.isFetchingCerts.set(true);
    this.certificatesLoaded.set(false);
    this.signForm.patchValue({ certificate_id: '', serial_number: '', user_id: '' });

    this.contractService.fetchCertificates(providerId, username).subscribe({
      next: (res) => {
        this.isFetchingCerts.set(false);
        this.certificates.set(res.certificates || []);
        this.certificatesLoaded.set(true);
        if (!this.certificates().length) {
          this.toast.info('Không tìm thấy chứng thư số cho tài khoản này', 'Thông báo');
        }
      },
      error: (err) => {
        this.isFetchingCerts.set(false);
        this.certificatesLoaded.set(false);
        this.toast.error(err.error?.message || 'Không tải được chứng thư số', 'Lỗi');
      },
    });
  }

  selectCertificate(certificateId: string, serialNumber: string, userId: string): void {
    this.signForm.patchValue({
      certificate_id: certificateId,
      serial_number: serialNumber,
      user_id: userId,
    });
  }

  canSubmitSign(): boolean {
    return (
      !!this.signForm.value.provider_id &&
      !!this.signForm.value.username?.trim() &&
      !!this.signForm.value.certificate_id &&
      this.hasSelectedPosition() &&
      !this.isLoading()
    );
  }

  close(): void {
    if (this.showWaitingModal()) return;
    this.stopWaitingTimers();
    this.cleanupPdf();
    this.closed.emit();
  }

  formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  submit(): void {
    if (!this.contract || !this.canSubmitSign()) {
      this.signForm.markAllAsTouched();
      if (!this.signForm.value.certificate_id) {
        this.toast.warning('Vui lòng chọn chứng thư số trước khi gửi ký', 'Chú ý');
      }
      return;
    }

    const username = this.signForm.value.username?.trim() ?? '';
    this.signBaseline = {
      status: this.contract.status ?? null,
      tenantSignedAt: this.contract.tenantSignedAt ?? this.contract.tenant_signed_at ?? null,
      hostSignedAt: this.contract.hostSignedAt ?? this.contract.host_signed_at ?? null,
    };

    this.isLoading.set(true);
    this.contractService
      .signContract({
        contract_id: this.contract.id,
        ...this.signForm.value,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toast.info('Đã gửi yêu cầu ký. Vui lòng xác nhận trên thiết bị CTS.', 'Đã gửi');
          this.startSignConfirmationWait(username);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message || 'Ký hợp đồng thất bại', 'Lỗi');
        },
      });
  }

  private startSignConfirmationWait(username: string): void {
    if (!this.contract?.id || !this.signBaseline) return;

    this.showWaitingModal.set(true);
    this.remainingSeconds.set(SIGN_WAIT_SECONDS);
    this.stopWaitingTimers();

    this.countdownTimer = setInterval(() => {
      const next = this.remainingSeconds() - 1;
      if (next <= 0) {
        this.remainingSeconds.set(0);
        this.handleSignTimeout();
        return;
      }
      this.remainingSeconds.set(next);
    }, 1000);

    void this.pollSignStatus(username);
    this.pollTimer = setInterval(() => {
      void this.pollSignStatus(username);
    }, SIGN_POLL_INTERVAL_MS);
  }

  private pollSignStatus(username: string): void {
    if (!this.showWaitingModal() || !this.contract?.id || !this.signBaseline || this.pollingSign) {
      return;
    }

    this.pollingSign = true;
    this.contractService.checkSignStatus(this.contract.id, username).subscribe({
      next: (res) => {
        this.pollingSign = false;
        if (res.signed) {
          this.handleSignSuccess(res.contract);
        }
      },
      error: () => {
        this.pollingSign = false;
      },
    });
  }

  private handleSignSuccess(updatedContract?: any): void {
    if (!this.showWaitingModal()) return;

    this.stopWaitingTimers();
    this.showWaitingModal.set(false);

    if (updatedContract && this.contract) {
      Object.assign(this.contract, updatedContract);
    }

    this.cleanupPdf();
    this.signed.emit();
  }

  private handleSignTimeout(): void {
    if (!this.showWaitingModal()) return;

    this.stopWaitingTimers();
    this.showWaitingModal.set(false);
    this.toast.warning('Người dùng chưa xác nhận ký. Vui lòng thử lại.', 'Chưa xác nhận');
  }

  private stopWaitingTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.pollingSign = false;
  }

  private resolvePdfKey(): string | null {
    const candidates = [this.contract?.unsignedPdfFile, this.contract?.signedPdfFile];
    for (const key of candidates) {
      if (key && !key.startsWith('contract-preview://') && !key.startsWith('mock-signed://')) {
        return key;
      }
    }
    return null;
  }

  private cleanupPdf(): void {
    if (this.pdfDoc) {
      void this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    this.pdfPages.set([]);
  }
}
