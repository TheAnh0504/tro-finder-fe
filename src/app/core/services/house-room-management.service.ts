import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HouseRoomManagementService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // api manage house
  addHouse(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/add`, data);
  }

  updateHouse(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/update`, data);
  }

  deleteHouse(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/delete`, data);
  }

  // api public get info - với findHouse owner = username

  findProvince(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/province/find`, data);
  }

  findCommune(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/commune/find`, data);
  }

  findHouse(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/public/find`, data);
  }

  getImageRoom(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/house/image-room`, data);
  }
}
