import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SysUserService {
  private http = inject(HttpClient);

  addUser(data: any): Observable<any> {
    return this.http.post(`/api/user/add`, data);
  }

  updateUser(data: any): Observable<any> {
    return this.http.post(`/api/user/update`, data);
  }

  findUser(data: any): Observable<any> {
    return this.http.post(`/api/user/find`, data);
  }

  getUser(data: any): Observable<any> {
    return this.http.post(`/api/user/get`, data);
  }

  deleteUser(data: any): Observable<any> {
    return this.http.post(`/api/user/delete`, data);
  }

  lockUser(data: any): Observable<any> {
    return this.http.post(`/api/user/lock-account`, data);
  }

  unlockUser(data: any): Observable<any> {
    return this.http.post(`/api/user/unlock-account`, data);
  }
}
