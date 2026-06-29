import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  createContractFromDashboard(data: any): Observable<any> {
    return this.http.post('/api/contract/request/from-dashboard', data);
  }

  findContracts(): Observable<any> {
    return this.http.post('/api/contract/find', {});
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

  signContract(data: any): Observable<any> {
    return this.http.post('/api/contract/sign', data);
  }
}
