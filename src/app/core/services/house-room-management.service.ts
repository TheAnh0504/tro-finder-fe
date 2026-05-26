import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HouseRoomManagementService {
  private http = inject(HttpClient);

  // api manage house
  addHouse(data: any): Observable<any> {
    return this.http.post(`/api/house/add`, data);
  }

  updateHouse(data: any): Observable<any> {
    return this.http.post(`/api/house/update`, data);
  }

  deleteHouse(data: any): Observable<any> {
    return this.http.post(`/api/house/delete`, data);
  }

  getHouse(data: any): Observable<any> {
    return this.http.post(`/api/house/get`, data);
  }

  // api public get info - với findHouse owner = username

  findProvince(data: any): Observable<any> {
    return this.http.post(`/api/house/province/find`, data);
  }

  findCommune(data: any): Observable<any> {
    return this.http.post(`/api/house/commune/find`, data);
  }

  findHouse(data: any): Observable<any> {
    return this.http.post(`/api/house/public/find`, data);
  }

  getImageRoom(data: any): Observable<any> {
    return this.http.post(`/api/house/image-room`, data, { responseType: 'blob' });
  }

  findSavedRoom(data: any): Observable<any> {
    return this.http.post(`/api/house/saved-room/find`, data);
  }

  addSavedRoom(data: any): Observable<any> {
    return this.http.post(`/api/house/saved-room/add`, data);
  }

  deleteSavedRoom(data: any): Observable<any> {
    return this.http.post(`/api/house/saved-room/delete`, data);
  }
}
