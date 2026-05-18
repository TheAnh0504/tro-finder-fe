import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  findRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/find`, data);
  }

  addRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/add`, data);
  }

  updateRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/update`, data);
  }

  deleteRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/delete`, data);
  }

  getRole(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/get`, data);
  }

  // public

  findRolePublic(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/role/public/find`, data);
  }
}
