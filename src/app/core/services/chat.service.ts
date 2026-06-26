import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { TokenService } from './token.service';
import SockJS from 'sockjs-client';
import { EMediaMess } from '../../enum/EMediaMess.enum';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { InfoUser } from '../models/info-user.model';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private toast = inject(ToastrService);
  private stompClient!: Client;

  // Dùng Subject để phát sự kiện khi có tin nhắn mới qua WebSocket
  public messageReceived$ = new Subject<any>();
  public openChatBubble$ = new Subject<string>();

  public isConnected$ = new BehaviorSubject<boolean>(false);

  // Khởi tạo kết nối WebSocket
  connectWebSocket() {
    const token = this.tokenService.getAccessToken(); // Lấy token để xác thực nếu cần

    this.stompClient = new Client({
      // Dùng cấu hình webSocketFactory nếu bạn xài SockJS bên backend
      webSocketFactory: () => new SockJS(environment.apiUrl + '/api/chat/ws-chat'),
      connectHeaders: {
        Authorization: `Bearer ${token}`, // Gửi token lên backend xác thực
      },
      debug: (str) => {
        // console.log(str); // Bật lên để debug nếu lỗi
      },
      reconnectDelay: 5000, // Tự động kết nối lại sau 5s nếu rớt mạng
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      beforeConnect: async () => {
        this.authService.refreshToken().subscribe({
          next: (res: any) => {
            const currentUser: InfoUser = {
              role: res.role,
              name: res.name,
              email: res.email,
              phoneNumber: res.phoneNumber,
              urlImage: res.urlImage,
              isOcr: res.isOcr,
            };
            this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);

            this.stompClient.connectHeaders = {
              Authorization: `Bearer ${res.access_token}`,
            };
          },
          error: (err) => {
            this.toast.error(err.error?.message, 'Lỗi', {
              timeOut: 3000,
              progressBar: true,
              positionClass: 'toast-top-right',
            });
          },
        });
      },
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Đã kết nối WebSocket Chat!');
      this.isConnected$.next(true);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Lỗi STOMP: ' + frame.headers['message']);
    };

    this.stompClient.activate();
  }

  // Đăng ký nhận tin nhắn của một phòng cụ thể
  subscribeToGroup(groupId: string) {
    if (this.stompClient && this.stompClient.connected) {
      return this.stompClient.subscribe(`/api/chat/topic/group/${groupId}`, (message) => {
        if (message.body) {
          const parsedMessage = JSON.parse(message.body);
          this.messageReceived$.next(parsedMessage); // Bắn dữ liệu ra cho Component hứng
        }
      });
    }
    return null;
  }

  // Gửi tin nhắn qua WebSocket
  sendMessageWS(groupId: string, content: string) {
    if (this.stompClient && this.stompClient.connected) {
      const chatMessage = {
        groupId: groupId,
        content: content,
        mediaType: EMediaMess.TEXT.toString(),
      };
      this.stompClient.publish({
        destination: '/api/chat/chat.sendMessage',
        body: JSON.stringify(chatMessage),
      });
    }
  }

  sendFileMessageREST(groupId: string, file: File) {
    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('file', file);

    // Đổi lại đường dẫn API cho đúng với config của bạn
    return this.http.post('/api/chat/send-file', formData);
  }

  getImage(data: any): Observable<any> {
    return this.http.post(`/api/chat/image`, data, { responseType: 'blob' });
  }

  // Lấy lịch sử chat cũ qua REST API
  getHistoryMessages(groupId: string): Observable<any> {
    return this.http.get(`/api/chat/${groupId}/messages`);
  }

  getListGroupMessage(): Observable<any> {
    return this.http.get(`/api/chat/list-group`);
  }

  addNewGroupMessage(groupData: any): Observable<any> {
    return this.http.post(`/api/chat/add-group`, groupData);
  }

  updateGroupMessage(groupData: any): Observable<any> {
    return this.http.post(`/api/chat/update-group`, groupData);
  }

  // Ngắt kết nối khi tắt web
  disconnectWebSocket() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.isConnected$.next(false);
    }
  }
}
