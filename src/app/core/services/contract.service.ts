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

  findContracts(): Observable<any> {
    return this.http.post('/api/contract/find', {});
  }

  getContract(id: string): Observable<any> {
    return this.http.post('/api/contract/get', { id });
  }

  confirmPayment(id: string): Observable<any> {
    return this.http.post('/api/contract/payment/confirm', { id });
  }

  createContractWithOcr(formData: FormData): Observable<any> {
    return this.http.post('/api/ocr/contract', formData);
  }

  scanCccd(formData: FormData): Observable<any> {
    return this.http.post('/api/ocr/cccd', formData);
  }
}
