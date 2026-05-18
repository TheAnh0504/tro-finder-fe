import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SysUserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  addUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/add`, data);
  }

  updateUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/update`, data);
  }

  findUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/find`, data);
  }

  getUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/get`, data);
  }

  deleteUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/delete`, data);
  }

  lockUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/lock-account`, data);
  }

  unlockUser(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/user/unlock-account`, data);
  }
}
