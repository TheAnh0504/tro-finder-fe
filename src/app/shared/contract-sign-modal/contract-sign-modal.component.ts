import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ContractService } from '../../core/services/contract.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-contract-sign-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './contract-sign-modal.component.html',
  styleUrl: './contract-sign-modal.component.scss',
})
export class ContractSignModalComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private toast = inject(ToastrService);

  @Input() open = false;
  @Input() contract: any | null = null;
  @Input() username = '';

  @Output() closed = new EventEmitter<void>();
  @Output() signed = new EventEmitter<void>();

  providers = signal<any[]>([]);
  certificates = signal<any[]>([]);
  isLoading = signal(false);

  signForm = this.fb.group({
    provider_id: ['', Validators.required],
    username: ['', Validators.required],
    certificate_id: ['', Validators.required],
    page: [1, Validators.required],
    x: [120, Validators.required],
    y: [620, Validators.required],
    width: [180],
    height: [60],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.signForm.patchValue({ username: this.username });
      this.loadProviders();
    }
  }

  loadProviders(): void {
    this.contractService.getSignatureProviders().subscribe({
      next: (res) => {
        this.providers.set(res.providers || []);
        const first = this.providers()[0];
        if (first) {
          this.signForm.patchValue({ provider_id: first.id });
          this.loadCertificates();
        }
      },
      error: (err) => this.toast.error(err.error?.message || 'Không tải được nhà cung cấp ký', 'Lỗi'),
    });
  }

  loadCertificates(): void {
    const providerId = this.signForm.value.provider_id;
    const username = this.signForm.value.username;
    if (!providerId || !username) return;

    this.contractService.getCertificates(providerId, username).subscribe({
      next: (res) => {
        this.certificates.set(res.certificates || []);
        const first = this.certificates()[0];
        if (first) {
          this.signForm.patchValue({ certificate_id: first.id });
        }
      },
      error: (err) => this.toast.error(err.error?.message || 'Không tải được chứng thư số', 'Lỗi'),
    });
  }

  choosePosition(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.signForm.patchValue({
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    });
  }

  close(): void {
    this.closed.emit();
  }

  printPreview(): void {
    if (!this.contract?.documentContent) return;
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(this.buildPrintableHtml(this.contract.documentContent));
    win.document.close();
    win.focus();
    win.print();
  }

  downloadPreviewHtml(): void {
    if (!this.contract?.documentContent) return;
    const blob = new Blob([this.buildPrintableHtml(this.contract.documentContent)], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hop-dong-thue-phong-tro.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildPrintableHtml(content: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Hợp đồng TroFinder</title><style>
      body{font-family:"Times New Roman",serif;padding:32px;color:#111;line-height:1.55}
      .national-title{text-align:center;margin-bottom:14px}
      h1{text-align:center;font-size:22px;margin:12px 0 28px;text-transform:uppercase}
      h3{font-size:16px;margin:18px 0 8px}
      table{width:100%;border-collapse:collapse;margin:8px 0 14px}
      td{border:1px solid #d1d5db;padding:8px;vertical-align:top}
      ul{margin-top:6px}
      .terms{border:1px dashed #cbd5e1;padding:10px;min-height:48px}
      .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;margin-top:48px;text-align:center}
      @page{size:A4;margin:18mm}
    </style></head><body>${content}</body></html>`;
  }

  submit(): void {
    if (!this.contract || this.signForm.invalid) {
      this.signForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.contractService
      .signContract({
        contract_id: this.contract.id,
        ...this.signForm.value,
      })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.toast.success('Đã gửi ký hợp đồng', 'Thành công');
          this.signed.emit();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message || 'Ký hợp đồng thất bại', 'Lỗi');
        },
      });
  }
}
