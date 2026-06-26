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
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { TokenService } from '../../core/services/token.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';

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
  private houseService = inject(HouseRoomManagementService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isOpen = signal(false);
  viewMode = signal<'list' | 'room'>('list'); // 'list': hiển thị ds nhóm, 'room': hiển thị phòng chat

  messages = signal<any[]>([]);
  newMessage = signal('');
  activeGroupId = signal<string | null>(null); // Để null mặc định, chọn nhóm mới set ID
  currentUsername = signal('');
  listGroupMessage = signal<any[]>([]);

  // --- THÊM BIẾN CHO MODAL ẢNH ---
  isImageModalOpen = signal(false);
  selectedImage = signal<string | null>(null);

  // Tự động tìm thông tin của nhóm đang chat để hiển thị lên Header
  activeGroupInfo = computed(() => {
    return this.listGroupMessage().find((g) => g.groupId === this.activeGroupId());
  });

  totalUnreadCount = computed(() => {
    return this.listGroupMessage().reduce((sum, group) => sum + (group.isNotRead || 0), 0);
  });

  private wsSubscription?: Subscription;
  private groupSubscriptions = new Map<string, any>();

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

    // 1. NGAY KHI SOCKET CONNECT XONG -> ĐĂNG KÝ NGHE TẤT CẢ CÁC NHÓM
    this.chatService.isConnected$.subscribe((connected) => {
      if (connected) {
        this.subscribeToAllGroups(this.listGroupMessage());
      }
    });

    // 2. XỬ LÝ LẮNG NGHE TIN NHẮN CHUNG TỪ TẤT CẢ CÁC PHÒNG
    this.wsSubscription = this.chatService.messageReceived$.subscribe((newMsg) => {
      // Kiểm tra xem User có đang ĐANG MỞ trực tiếp nhóm có tin nhắn tới không
      const isViewingActiveRoom =
        this.isOpen() && this.viewMode() === 'room' && this.activeGroupId() === newMsg.groupId;

      if (isViewingActiveRoom) {
        // TRƯỜNG HỢP 1: Đang mở chat box -> Ném vào màn hình chat
        if (newMsg.mediaType === 'VIDEO_MP4' || newMsg.mediaType === 'TEXT') {
          this.messages.update((msgs) => [...msgs, newMsg]);
        } else {
          this.chatService.getImage({ id: newMsg.content }).subscribe({
            next: (blob: any) => {
              newMsg.contentNew = URL.createObjectURL(blob);
              this.messages.update((msgs) => [...msgs, newMsg]);
            },
          });
        }

        // Ép isNotRead về 0 ngay lập tức
        this.listGroupMessage.update((groups) =>
          groups.map((g) => (g.groupId === newMsg.groupId ? { ...g, isNotRead: 0 } : g)),
        );
      } else {
        // TRƯỜNG HỢP 2: Chat box đang đóng, hoặc đang nhắn với nhóm khác
        // -> CỘNG DỒN BIẾN isNotRead LÊN 1 (nếu không phải tin do chính mình gửi)
        if (newMsg.createdBy !== this.currentUsername()) {
          this.listGroupMessage.update((groups) => {
            const exists = groups.some((g) => g.groupId === newMsg.groupId);

            if (exists) {
              return groups.map((g) =>
                g.groupId === newMsg.groupId ? { ...g, isNotRead: (g.isNotRead || 0) + 1 } : g,
              );
            } else {
              // Nếu nhóm hoàn toàn mới (chưa có trong list), tải lại toàn bộ list
              this.getListGroupMessage();
              return groups;
            }
          });
        }
      }
    });

    // 3. LẮNG NGHE TÍN HIỆU YÊU CẦU MỞ PHÒNG CHAT TỪ NƠI KHÁC
    this.openChatSub = this.chatService.openChatBubble$.subscribe((groupId: string) => {
      this.isOpen.set(true); // Bật bong bóng chat lên

      this.chatService.getListGroupMessage().subscribe({
        next: (res: any) => {
          this.listGroupMessage.set([]);
          res.forEach((chatData: any, index: number) => {
            if (chatData.urlAvatar) {
              this.houseService.getImageRoom({ id: chatData.urlAvatar }).subscribe({
                next: (blob: any) => {
                  const objectUrl = URL.createObjectURL(blob);
                  chatData.urlAvatarShow = objectUrl;
                  this.listGroupMessage.update((list) =>
                    list.map((item) =>
                      item.groupId === chatData.groupId
                        ? {
                            ...item,
                            urlAvatarShow: objectUrl,
                          }
                        : item,
                    ),
                  );
                },
                error: (err) => console.error(err),
              });
            }
          });
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
    this.chatService.disconnectWebSocket();
  }

  // --- HÀM MỚI: ĐĂNG KÝ LẮNG NGHE CHO TẤT CẢ CÁC NHÓM ---
  subscribeToAllGroups(groups: any[]) {
    // Chỉ chạy nếu WebSocket đã sẵn sàng
    if (!this.chatService.isConnected$.value) return;

    groups.forEach((g) => {
      // Nếu chưa đăng ký nhóm này thì mới đăng ký
      if (!this.groupSubscriptions.has(g.groupId)) {
        const sub = this.chatService.subscribeToGroup(g.groupId);
        if (sub) {
          this.groupSubscriptions.set(g.groupId, sub);
        }
      }
    });
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
        this.listGroupMessage.set([]);
        res.forEach((chatData: any) => {
          if (chatData.urlAvatar) {
            this.houseService.getImageRoom({ id: chatData.urlAvatar }).subscribe({
              next: (blob: any) => {
                chatData.urlAvatarShow = URL.createObjectURL(blob);
                this.listGroupMessage.update((list) => [...list, chatData]);

                // Vừa tải nhóm xong thì gọi hàm đăng ký lắng nghe luôn
                this.subscribeToAllGroups([chatData]);
              },
            });
          } else {
            this.listGroupMessage.update((list) => [...list, chatData]);
            this.subscribeToAllGroups([chatData]);
          }
        });
      },
      error: (err) => {
        if ('1036' === err.error?.status_code) {
          this.listGroupMessage.set([]);
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

    // Mở nhóm nào thì reset số đếm thông báo nhóm đó về 0
    this.listGroupMessage.update((groups) =>
      groups.map((g) => (g.groupId === groupId ? { ...g, isNotRead: 0 } : g)),
    );

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

    this.chatService.getHistoryMessages(groupId).subscribe({
      next: (res: any) => {
        this.currentUsername.set(res.username);

        const initialMessages = (res.listMessage || []).map((msg: any) => ({
          ...msg,
          contentNew: msg.mediaType === 'TEXT' || msg.mediaType === 'VIDEO_MP4' ? msg.content : '',
        }));
        this.messages.set(initialMessages);

        if (initialMessages.length > 0) {
          initialMessages.forEach((msg: any) => {
            if (msg.mediaType !== 'VIDEO_MP4' && msg.mediaType !== 'TEXT') {
              this.chatService.getImage({ id: msg.content }).subscribe({
                next: (blob: any) => {
                  const objectUrl = URL.createObjectURL(blob);
                  this.messages.update((msgs) =>
                    msgs.map((m) =>
                      m.messId === msg.messId ? { ...m, contentNew: objectUrl } : m,
                    ),
                  );
                },
              });
            }
          });
        }
      },
    });

    // CHÚ Ý: ĐÃ XÓA `this.leaveChatRoom()` VÀ `setTimeout` Ở ĐÂY.
    // Vì bây giờ mình đã subscribe tất cả các phòng vĩnh viễn ở hàm subscribeToAllGroups rồi!
  }

  leaveChatRoom() {}

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

  // Mở modal xem ảnh
  openImageModal(imageUrl: string) {
    if (imageUrl) {
      this.selectedImage.set(imageUrl);
      this.isImageModalOpen.set(true);
    }
  }

  // Đóng modal xem ảnh
  closeImageModal() {
    this.isImageModalOpen.set(false);
    this.selectedImage.set(null);
  }

  // Tải ảnh xuống
  downloadImage() {
    const url = this.selectedImage();
    if (!url) return;

    // Tạo một thẻ <a> ảo để kích hoạt hành động download của trình duyệt
    const a = document.createElement('a');
    a.href = url;
    // Tên file mặc định khi tải (có thể sinh ngẫu nhiên theo timestamp)
    a.download = `TroFinder_Image_${new Date().getTime()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
