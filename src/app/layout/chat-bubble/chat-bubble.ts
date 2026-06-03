import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  ElementRef,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { TokenService } from '../../core/services/token.service';
import { EMediaMess } from '../../enum/EMediaMess.enum';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-chat-bubble',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-bubble.html',
  styleUrl: './chat-bubble.scss',
})
export class ChatBubble implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isOpen = signal(false);
  messages = signal<any[]>([]);
  newMessage = signal('');
  activeGroupId = signal('19aefaae-aeba-42fe-bd6f-eb91259586a9'); // Fix cứng ID group để test
  currentUsername = signal('');

  listGroupMessage = signal<any[]>([]);

  private wsSubscription?: Subscription;
  private currentRoomSub: any;

  constructor() {
    effect(() => {
      if (this.messages().length > 0 && this.isOpen()) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  ngOnInit() {
    this.getListGroupMessage();
    // 1. Khởi động kết nối ngầm WebSocket khi component load
    this.chatService.connectWebSocket();

    // 2. Lắng nghe luồng tin nhắn mới từ WebSocket
    this.wsSubscription = this.chatService.messageReceived$.subscribe((newMsg) => {
      // Chỉ push vào danh sách nếu tin nhắn thuộc về phòng đang mở
      if (newMsg.groupId === this.activeGroupId()) {
        this.messages.update((msgs) => [...msgs, newMsg]);
      }
    });
  }

  getListGroupMessage() {
    this.chatService.getListGroupMessage().subscribe({
      next: (res: any) => {
        this.listGroupMessage.set(res);
      },
      error: (err) => {
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.currentRoomSub) this.currentRoomSub.unsubscribe();
    this.chatService.disconnectWebSocket();
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.openChatRoom();
    }
  }

  openChatRoom() {
    // 1. Tải lịch sử tin nhắn cũ qua REST
    this.chatService.getHistoryMessages(this.activeGroupId()).subscribe({
      next: (res) => {
        console.log('Lịch sử tin nhắn:', res);
        this.currentUsername.set(res.username);
        this.messages.set(res.listMessage || []);
      },
    });

    // 2. Hủy theo dõi phòng cũ (nếu chuyển phòng)
    if (this.currentRoomSub) {
      this.currentRoomSub.unsubscribe();
    }

    // 3. Đăng ký nhận tin nhắn Realtime cho phòng này
    // Đợi một chút để client STOMP chắc chắn đã connect xong
    setTimeout(() => {
      this.currentRoomSub = this.chatService.subscribeToGroup(this.activeGroupId());
    }, 500);
  }

  sendMessage() {
    if (!this.newMessage().trim()) return;

    // Bắn tin nhắn qua WebSocket (tốc độ cực nhanh, không tốn overhead HTTP)
    this.chatService.sendMessageWS(this.activeGroupId(), this.newMessage());

    // Clear ô input
    this.newMessage.set('');
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
