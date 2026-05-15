import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/sign-in`, data);
  }

  sendVerifyCode(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/send-verify-code`, data);
  }

  confirmLogin(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/confirm-login`, data);
  }

  refreshToken() {
    return this.http.post(
      `${this.apiUrl}/api/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
  }
}
