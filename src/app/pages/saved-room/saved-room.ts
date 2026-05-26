import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';

@Component({
  selector: 'app-saved-room',
  imports: [CommonModule],
  templateUrl: './saved-room.html',
  styleUrl: './saved-room.scss',
})
export class SavedRoom implements OnInit {
  private toast = inject(ToastrService);
  private houseService = inject(HouseRoomManagementService);
  private cdr = inject(ChangeDetectorRef);

  listRooms = signal<any[]>([]);
  isLoading = signal(false);
  totalPages = signal(1);
  totalElements = signal(0);

  // Mảng chứa ID các phòng đang được lưu (để xử lý nút thả tim)
  listIdSavedRoom = signal<string[]>([]);

  // Pagination
  pageNumber = signal(0);
  pageSize = signal(12);

  existingRoomImages: { id: string; url: string; urlImage: string }[][] = [];

  // --- STATE: ROOM DETAIL MODAL ---
  isDetailModalOpen = signal(false);
  selectedRoom = signal<any>(null);
  selectedRoomImages = signal<{ id: string; url: string; urlImage: string }[]>([]);

  // --- STATE: IMAGE GALLERY MODAL ---
  isGalleryOpen = signal(false);
  currentGalleryImages = signal<{ id: string; url: string; urlImage: string }[]>([]);
  currentImageIndex = signal(0);

  ngOnInit(): void {
    this.getSavedRooms();
  }

  // --- LẤY DANH SÁCH PHÒNG ĐÃ LƯU ---
  getSavedRooms() {
    this.isLoading.set(true);
    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      requestParam: {},
    };

    this.houseService.findSavedRoom(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.listRooms.set(res.page?.content || []);
        this.totalPages.set(res.page?.totalPages || 1);
        this.totalElements.set(res.page?.totalElements || 0);

        // Đã ở trang "Đã lưu" thì mặc định tất cả ID trả về đều đang được lưu
        this.listIdSavedRoom.set(this.listRooms().map((room) => room.id));

        this.existingRoomImages = [];
        if (this.listRooms() != null && this.listRooms().length > 0) {
          this.listRooms().forEach((roomData: any, index: number) => {
            this.existingRoomImages.push([]);
            let count = 0;

            if (roomData.listImage && roomData.listImage.split(',').length > 0) {
              roomData.listImage.split(',').forEach((imgUrl: string) => {
                this.houseService.getImageRoom({ id: imgUrl }).subscribe({
                  next: (blob: any) => {
                    count++;
                    const objectUrl = URL.createObjectURL(blob);
                    this.existingRoomImages[index].push({
                      id: imgUrl,
                      url: objectUrl,
                      urlImage: imgUrl,
                    });
                    if (count === roomData.listImage.split(',').length) {
                      this.cdr.detectChanges();
                    }
                  },
                  error: (err) => console.error(err),
                });
              });
            }
          });
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  // --- LOGIC: THÊM / BỎ LƯU PHÒNG ---
  toggleSaveRoom(room: any, event: Event) {
    event.stopPropagation();
    const isSaved = this.listIdSavedRoom().includes(room.id);
    if (isSaved) {
      this.deleteSavedRoom(room);
    } else {
      this.addSavedRoom(room);
    }
  }

  addSavedRoom(room: any) {
    this.houseService.addSavedRoom({ id: room.id }).subscribe({
      next: () => this.listIdSavedRoom.update((ids) => [...ids, room.id]),
      error: (err) => this.toast.error(err.error?.message, 'Lỗi'),
    });
  }

  deleteSavedRoom(room: any) {
    this.houseService.deleteSavedRoom({ id: room.id }).subscribe({
      next: () => {
        // Cập nhật lại listId để nút mất màu đỏ
        this.listIdSavedRoom.update((ids) => ids.filter((id) => id !== room.id));
        // Lưu ý: Nếu muốn bỏ lưu phát mất luôn khỏi danh sách thì gọi lại this.getSavedRooms();
      },
      error: (err) => this.toast.error(err.error?.message, 'Lỗi'),
    });
  }

  // --- MODAL CHI TIẾT ---
  openRoomDetail(room: any, index: number) {
    this.selectedRoom.set(room);
    this.selectedRoomImages.set(this.existingRoomImages[index] || []);
    this.isDetailModalOpen.set(true);
  }

  closeRoomDetail() {
    this.isDetailModalOpen.set(false);
    this.selectedRoom.set(null);
    this.selectedRoomImages.set([]);
  }

  // --- MODAL GALLERY CHUYỂN ẢNH ---
  openGallery(images: any[], index: number, event: Event) {
    event.stopPropagation();
    if (!images || images.length === 0) return;
    this.currentGalleryImages.set(images);
    this.currentImageIndex.set(index);
    this.isGalleryOpen.set(true);
  }

  closeGallery() {
    this.isGalleryOpen.set(false);
  }

  nextImage(event: Event) {
    event.stopPropagation();
    this.currentImageIndex.set((this.currentImageIndex() + 1) % this.currentGalleryImages().length);
  }

  prevImage(event: Event) {
    event.stopPropagation();
    const length = this.currentGalleryImages().length;
    this.currentImageIndex.set((this.currentImageIndex() - 1 + length) % length);
  }

  // --- PHÂN TRANG ---
  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageNumber.set(newPage);
      this.getSavedRooms();
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }
}
