import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private http = inject(HttpClient);

  // ocr + contract Controller

  createContract(formData: FormData): Observable<any> {
    return this.http.post('/api/contract/add', formData);
  }

  createContractFromRoom(data: any): Observable<any> {
    return this.http.post('/api/contract/request/from-room', data);
  }

  previewContractPdf(data: any): Observable<any> {
    return this.http.post('/api/contract/request/preview-pdf', data);
  }

  submitDraftContract(contractId: string): Observable<any> {
    return this.http.post('/api/contract/request/submit', { contract_id: contractId });
  }

  deleteDraftContract(contractId: string): Observable<any> {
    return this.http.post('/api/contract/request/delete-draft', { contract_id: contractId });
  }

  getContractPdfFile(minioKey: string): Observable<Blob> {
    return this.http.post('/api/contract/file', { id: minioKey }, { responseType: 'blob' });
  }

  createContractFromDashboard(data: any): Observable<any> {
    return this.http.post('/api/contract/request/from-dashboard', data);
  }

  findContracts(): Observable<any> {
    return this.http.post('/api/contract/find', {}).pipe(
      map((res: any) => ({
        ...res,
        listContract: res.listContract ?? res.list_contract ?? [],
      })),
    );
  }

  getContract(id: string): Observable<any> {
    return this.http.post('/api/contract/get', { id });
  }

  confirmPayment(id: string): Observable<any> {
    return this.http.post('/api/contract/payment/confirm', { id });
  }

  confirmPaymentByPeriod(data: {
    contract_id: string;
    payment_year: number;
    payment_month: number;
  }): Observable<any> {
    return this.http.post('/api/contract/payment/confirm', data);
  }

  notifyTenantPayment(data: {
    contract_id: string;
    payment_year?: number;
    payment_month?: number;
    note?: string;
    electricity_units?: number;
    water_units?: number;
    occupant_count?: number;
  }): Observable<any> {
    return this.http.post('/api/contract/payment/notify-paid', data);
  }

  savePaymentBreakdown(data: {
    contract_id: string;
    payment_year?: number;
    payment_month?: number;
    electricity_units?: number;
    water_units?: number;
    occupant_count?: number;
    note?: string;
  }): Observable<any> {
    return this.http.post('/api/contract/payment/breakdown', data);
  }

  uploadPaymentQr(formData: FormData): Observable<any> {
    return this.http.post('/api/contract/payment/qr', formData);
  }

  createTemporaryResidenceForm(data: any): Observable<any> {
    return this.http.post('/api/contract/temporary-form/create', data);
  }

  createContractWithOcr(formData: FormData): Observable<any> {
    return this.http.post('/api/ocr/contract', formData);
  }

  scanCccd(formData: any): Observable<any> {
    return this.http.post('/api/ocr/cccd', formData);
  }

  confirmCccd(data: any): Observable<any> {
    return this.http.post('/api/ocr/confirm-cccd', data);
  }

  renewContract(data: {
    contractId: string;
    newEndTime: string;
    depositAmount?: number;
  }): Observable<any> {
    return this.http.post('/api/contract/renew', data);
  }

  updateContract(data: any): Observable<any> {
    return this.http.post('/api/contract/update', data);
  }

  confirmContract(contractId: string, reason?: string): Observable<any> {
    return this.http.post('/api/contract/confirm', { contract_id: contractId, reason });
  }

  rejectContract(contractId: string, reason?: string): Observable<any> {
    return this.http.post('/api/contract/reject', { contract_id: contractId, reason });
  }

  getSignatureProviders(): Observable<any> {
    return this.http.get('/api/contract/sign/providers');
  }

  getCertificates(providerId: string, username: string): Observable<any> {
    return this.http.post('/api/contract/sign/certificates', {
      provider_id: providerId,
      username,
    });
  }

  fetchCertificates(providerId: string, username: string): Observable<any> {
    return this.getCertificates(providerId, username);
  }

  signContract(data: any): Observable<any> {
    return this.http.post('/api/contract/sign', data);
  }

  /** Poll IDP sign status via backend */
  checkSignStatus(
    contractId: string,
    username: string,
  ): Observable<{ signed: boolean; signPending?: boolean; contract?: any }> {
    return this.http
      .post('/api/contract/sign/status', {
        contract_id: contractId,
        username,
      })
      .pipe(
        map((res: any) => {
          const payload = res?.data ?? res;
          return {
            signed: !!payload?.signed,
            signPending: payload?.sign_pending ?? payload?.signPending ?? false,
            contract: payload?.contract,
          };
        }),
      );
  }

  triggerRoomSuggestions(): Observable<any> {
    return this.http.post('/api/reminder/room-suggestions', {});
  }

  triggerHostPaymentReminders(): Observable<any> {
    return this.http.post('/api/reminder/host-payment-reminders', {});
  }
}
