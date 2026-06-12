import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  ElementRef,
  ViewChild,
  OnDestroy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { TokenService } from '../../core/services/token.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-chat-bubble',
  standalone: true,
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
  viewMode = signal<'list' | 'room'>('list'); // 'list': hiển thị ds nhóm, 'room': hiển thị phòng chat

  messages = signal<any[]>([]);
  newMessage = signal('');
  activeGroupId = signal<string | null>(null); // Để null mặc định, chọn nhóm mới set ID
  currentUsername = signal('');
  listGroupMessage = signal<any[]>([]);

  // Tự động tìm thông tin của nhóm đang chat để hiển thị lên Header
  activeGroupInfo = computed(() => {
    return this.listGroupMessage().find((g) => g.groupId === this.activeGroupId());
  });

  private wsSubscription?: Subscription;
  private currentRoomSub: any;

  @ViewChild('fileInput') fileInput!: ElementRef;

  // Khai báo thêm biến để quản lý việc hủy theo dõi (nằm dưới các biến Subscription cũ)
  private openChatSub?: Subscription;

  constructor() {
    effect(() => {
      if (this.messages().length > 0 && this.isOpen() && this.viewMode() === 'room') {
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
      if (newMsg.groupId === this.activeGroupId()) {
        if (newMsg.mediaType === 'VIDEO_MP4') {
          this.messages.update((msgs) => [...msgs, newMsg]);
        } else if (newMsg.mediaType === 'TEXT') {
          this.messages.update((msgs) => [...msgs, newMsg]);
        } else {
          this.chatService.getImage({ id: newMsg.content }).subscribe({
            next: (blob: any) => {
              const objectUrl = URL.createObjectURL(blob);
              newMsg.contentNew = objectUrl; // Gán URL của ảnh vào content để hiển thị
              this.messages.update((msgs) => [...msgs, newMsg]);
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
      }
    });

    // 3. LẮNG NGHE TÍN HIỆU YÊU CẦU MỞ PHÒNG CHAT TỪ NƠI KHÁC
    this.openChatSub = this.chatService.openChatBubble$.subscribe((groupId: string) => {
      this.isOpen.set(true); // Bật bong bóng chat lên

      this.chatService.getListGroupMessage().subscribe({
        next: (res: any) => {
          this.listGroupMessage.set(res);
          // Hàm selectGroup của bạn đã có sẵn logic set ID, set mode 'room' và gọi openChatRoom() rồi
          this.selectGroup(groupId);
        },
        error: (err) => {
          if ('1036' === err.error?.status_code) {
            this.listGroupMessage.set([]); // Nếu chưa có nhóm nào, set mảng rỗng để tránh lỗi
          } else {
            this.toast.error(
              err.error?.message || 'Không thể tải danh sách cuộc trò chuyện',
              'Lỗi',
              {
                timeOut: 3000,
                progressBar: true,
                positionClass: 'toast-top-right',
              },
            );
          }
        },
      });
    });
  }

  ngOnDestroy() {
    if (this.wsSubscription) this.wsSubscription.unsubscribe();
    if (this.openChatSub) this.openChatSub.unsubscribe(); // Nhớ hủy lắng nghe để tránh rò rỉ bộ nhớ
    this.leaveChatRoom();
    this.chatService.disconnectWebSocket();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const groupId = this.activeGroupId();
    if (!groupId) return;

    // Giới hạn dung lượng (Ví dụ: 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('File không được vượt quá 10MB', 'Lỗi');
      return;
    }

    // Gọi hàm upload
    this.chatService.sendFileMessageREST(groupId, file).subscribe({
      next: () => {
        // KHÔNG CẦN ADD VÀO LIST MESSAGES Ở ĐÂY.
        // Vì ngay khi upload xong, Backend sẽ tự bắn qua WebSocket,
        // hàm subscribe WebSocket hiện tại của bạn sẽ tự động hứng và hiện lên giao diện.

        // Reset lại input file để có thể chọn lại file cũ
        this.fileInput.nativeElement.value = '';
      },
      error: (err) => {
        this.toast.error('Lỗi khi gửi file', 'Thất bại');
      },
    });
  }

  // Hàm trigger click input ẩn
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  getListGroupMessage() {
    this.chatService.getListGroupMessage().subscribe({
      next: (res: any) => {
        this.listGroupMessage.set(res);
      },
      error: (err) => {
        if ('1036' === err.error?.status_code) {
          this.listGroupMessage.set([]); // Nếu chưa có nhóm nào, set mảng rỗng để tránh lỗi
        } else {
          this.toast.error(err.error?.message || 'Không thể tải danh sách cuộc trò chuyện', 'Lỗi', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
        }
      },
    });
  }

  toggleChat() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.backToList(); // Mỗi lần mở bong bóng lên thì ưu tiên hiển thị danh sách nhóm trước
    } else {
      this.leaveChatRoom();
    }
  }

  // Hàm chọn một nhóm chat từ danh sách
  selectGroup(groupId: string) {
    this.activeGroupId.set(groupId);
    this.viewMode.set('room');
    this.openChatRoom();
  }

  // Hàm quay trở lại danh sách nhóm
  backToList() {
    this.viewMode.set('list');
    this.leaveChatRoom();
    this.activeGroupId.set(null);
    this.getListGroupMessage(); // Refresh lại danh sách nhóm
  }

  isSameDay(dateString1: string, dateString2: string): boolean {
    if (!dateString1 || !dateString2) return false;

    const d1 = this.parseCustomDate(dateString1);
    const d2 = this.parseCustomDate(dateString2);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  parseCustomDate(dateString: string): Date {
    if (!dateString) return new Date();

    // Cắt chuỗi '03-06-2026 17:40:39' thành phần ngày và phần giờ
    const parts = dateString.split(' ');
    const dateParts = parts[0].split('-'); // Tách [03, 06, 2026]

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS đếm tháng từ 0-11 nên phải trừ 1
    const year = parseInt(dateParts[2], 10);

    // Nếu có phần giờ phút giây
    if (parts[1]) {
      const timeParts = parts[1].split(':');
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      const second = parseInt(timeParts[2], 10);
      return new Date(year, month, day, hour, minute, second);
    }

    return new Date(year, month, day);
  }

  openChatRoom() {
    const groupId = this.activeGroupId();
    if (!groupId) return;

    // 1. Tải lịch sử tin nhắn cũ qua REST
    this.chatService.getHistoryMessages(groupId).subscribe({
      next: (res: any) => {
        this.currentUsername.set(res.username);

        // Tạo ra một mảng copy ban đầu, gắn sẵn trường contentNew để tránh lỗi undefined trên HTML
        const initialMessages = (res.listMessage || []).map((msg: any) => ({
          ...msg,
          // Nếu là TEXT hoặc VIDEO thì contentNew = content gốc. Nếu là ẢNH thì tạm để rỗng chờ load
          contentNew: msg.mediaType === 'TEXT' || msg.mediaType === 'VIDEO_MP4' ? msg.content : '',
        }));

        this.messages.set(initialMessages);

        // Lặp qua để tải file Blob cho những tin nhắn là ẢNH
        if (initialMessages.length > 0) {
          initialMessages.forEach((msg: any) => {
            if (msg.mediaType === 'VIDEO_MP4' || msg.mediaType === 'TEXT') {
              // Không làm gì thêm
            } else {
              // Gọi API lấy blob ảnh
              this.chatService.getImage({ id: msg.content }).subscribe({
                next: (blob: any) => {
                  const objectUrl = URL.createObjectURL(blob);

                  // BẮT BUỘC DÙNG .update() CỦA SIGNAL ĐỂ GIAO DIỆN CẬP NHẬT LẠI ẢNH
                  this.messages.update((msgs) =>
                    msgs.map((m) =>
                      m.messId === msg.messId ? { ...m, contentNew: objectUrl } : m,
                    ),
                  );
                },
                error: (err) => {
                  this.toast.error(err.error?.message, 'Lỗi tải ảnh', {
                    timeOut: 3000,
                    progressBar: true,
                    positionClass: 'toast-top-right',
                  });
                },
              });
            }
          });
        }
        console.log('Lịch sử tin nhắn:', initialMessages);
      },
    });

    // 2. Hủy theo dõi phòng cũ (nếu có)
    this.leaveChatRoom();

    // 3. Đăng ký nhận tin nhắn Realtime cho phòng mới
    setTimeout(() => {
      this.currentRoomSub = this.chatService.subscribeToGroup(groupId);
    }, 300);
  }

  leaveChatRoom() {
    if (this.currentRoomSub) {
      this.currentRoomSub.unsubscribe();
      this.currentRoomSub = null;
    }
  }

  sendMessage() {
    const groupId = this.activeGroupId();
    if (!this.newMessage().trim() || !groupId) return;

    this.chatService.sendMessageWS(groupId, this.newMessage());
    this.newMessage.set('');
  }

  scrollToBottom(): void {
    try {
      this.myScrollContainer.nativeElement.scrollTop =
        this.myScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
