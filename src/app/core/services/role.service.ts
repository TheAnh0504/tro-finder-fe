import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private http = inject(HttpClient);

  findRole(data: any): Observable<any> {
    return this.http.post(`/api/role/find`, data);
  }

  addRole(data: any): Observable<any> {
    return this.http.post(`/api/role/add`, data);
  }

  updateRole(data: any): Observable<any> {
    return this.http.post(`/api/role/update`, data);
  }

  deleteRole(data: any): Observable<any> {
    return this.http.post(`/api/role/delete`, data);
  }

  getRole(data: any): Observable<any> {
    return this.http.post(`/api/role/get`, data);
  }

  // public

  findRolePublic(data: any): Observable<any> {
    return this.http.post(`/api/role/public/find`, data);
  }
}
