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

  getMe(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/me`);
  }

  getImageFace(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/image-face`);
  }

  forgetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/forget-password`, data);
  }

  confirmForgetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/confirm-forget-password`, data);
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/sign-up`, data);
  }

  confirmSignUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/confirm-signup`, data);
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
