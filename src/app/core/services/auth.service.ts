import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);

  login(data: any): Observable<any> {
    return this.http.post(`/api/auth/sign-in`, data);
  }

  sendVerifyCode(data: any): Observable<any> {
    return this.http.post(`/api/auth/send-verify-code`, data);
  }

  confirmLogin(data: any): Observable<any> {
    return this.http.post(`/api/auth/confirm-login`, data, {
      withCredentials: true,
    });
  }

  getMe(): Observable<any> {
    return this.http.get(`/api/auth/me`);
  }

  getImageFace(): Observable<any> {
    return this.http.get(`/api/auth/image-face`);
  }

  forgetPassword(data: any): Observable<any> {
    return this.http.post(`/api/auth/forget-password`, data);
  }

  confirmForgetPassword(data: any): Observable<any> {
    return this.http.post(`/api/auth/confirm-forget-password`, data);
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`/api/auth/sign-up`, data);
  }

  confirmSignUp(data: any): Observable<any> {
    return this.http.post(`/api/auth/confirm-signup`, data, {
      withCredentials: true,
    });
  }

  refreshToken() {
    return this.http.post(
      `/api/auth/refresh`,
      {},
      {
        withCredentials: true,
      },
    );
  }
}
