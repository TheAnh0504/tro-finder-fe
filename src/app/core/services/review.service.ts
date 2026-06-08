import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);

  findByRoom(roomId: string): Observable<any> {
    return this.http.post('/api/review/find', { id: roomId });
  }

  addReview(data: {
    room_id: string;
    stars: number;
    content: string;
    anonymous: boolean;
  }): Observable<any> {
    return this.http.post('/api/review/add', data);
  }
}
