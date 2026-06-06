import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TokenService } from '../../core/services/token.service';
import { AuthService } from '../../core/services/auth.service';
import { InfoUser } from '../../core/models/info-user.model';
import { ToastrService } from 'ngx-toastr';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';
import { EPermission } from '../../enum/EPermission.enum';
import { Province } from '../../core/models/province.model';
import { Commune } from '../../core/models/commune.model';

// Thêm các thư viện Material và Mask
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    NgxMaskDirective,
  ],
  providers: [provideNgxMask()],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private toast = inject(ToastrService);
  private fb = inject(FormBuilder);
  private houseService = inject(HouseRoomManagementService);
  private cdr = inject(ChangeDetectorRef); // Ép Angular cập nhật UI ngay lập tức

  searchForm!: FormGroup;
  listRooms = signal<any[]>([]);
  isLoading = signal(false);
  totalPages = signal(1); // Tổng số trang trả về từ API
  totalElements = signal(0); // Tổng số bản ghi

  listIdSavedRoom = signal<string[]>([]);

  // Pagination
  pageNumber = signal(0);
  pageSize = signal(12);

  // --- TRẠNG THÁI LỌC NÂNG CAO ---
  isAdvancedSearchOpen = signal(false);
  existingRoomImages: { id: string; url: string; urlImage: string }[][] = [];

  // --- DATA PROVINCE/COMMUNE TÌM KIẾM ---
  listProvince = signal<Province[]>([]);
  listCommune = signal<Commune[]>([]);
  filterProvinceText = signal('');
  filterCommuneText = signal('');

  amenityFields = [
    { key: 'parking_area', label: 'Chỗ để xe' },
    { key: 'elevator', label: 'Thang máy' },
    { key: 'security_camera', label: 'Camera' },
    { key: 'security_24_7', label: 'Bảo vệ 24/7' },
    { key: 'shared_laundry_area', label: 'Khu giặt chung' },
    { key: 'shared_drying_area', label: 'Khu phơi chung' },
    { key: 'dishwashing_area', label: 'Khu rửa bát' },
    { key: 'table_and_chairs', label: 'Bàn ghế' },
    { key: 'air_conditioner', label: 'Điều hòa' },
    { key: 'water_heater', label: 'Nóng lạnh' },
    { key: 'washing_machine', label: 'Máy giặt riêng' },
    { key: 'private_bathroom', label: 'VS khép kín' },
    { key: 'has_rent', label: 'Đã cho thuê' },
    { key: 'has_host', label: 'Chung chủ' },
    { key: 'has_pet', label: 'Nuôi thú cưng' },
  ];

  filteredSearchProvinces = computed(() => {
    const text = this.filterProvinceText().toLowerCase().trim();
    return this.listProvince().filter((p) => p.name.toLowerCase().includes(text));
  });

  filteredSearchCommunes = computed(() => {
    const text = this.filterCommuneText().toLowerCase().trim();
    return this.listCommune().filter((c) => c.name.toLowerCase().includes(text));
  });

  // --- STATE: ROOM DETAIL MODAL ---
  isDetailModalOpen = signal(false);
  selectedRoom = signal<any>(null);
  selectedRoomImages = signal<{ id: string; url: string; urlImage: string }[]>([]); // Thêm biến lưu ảnh cho Modal

  // Cập nhật hàm mở Detail để truyền thêm index lấy đúng ảnh
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

  // --- LOGIC: THÊM / XÓA LƯU PHÒNG ---
  // Hàm gộp logic click nút Lưu lại
  toggleSaveRoom(room: any, event: Event) {
    event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài (tránh mở modal chi tiết)

    const isSaved = this.listIdSavedRoom().includes(room.id);
    if (isSaved) {
      this.deleteSavedRoom(room);
    } else {
      this.addSavedRoom(room);
    }
  }

  // --- STATE: IMAGE GALLERY MODAL ---
  isGalleryOpen = signal(false);
  currentGalleryImages = signal<{ id: string; url: string; urlImage: string }[]>([]);
  currentImageIndex = signal(0);

  openGallery(images: any[], index: number, event: Event) {
    event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài (tránh mở luôn cả modal chi tiết)
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
    const nextIdx = (this.currentImageIndex() + 1) % this.currentGalleryImages().length;
    this.currentImageIndex.set(nextIdx);
  }

  prevImage(event: Event) {
    event.stopPropagation();
    const length = this.currentGalleryImages().length;
    const prevIdx = (this.currentImageIndex() - 1 + length) % length;
    this.currentImageIndex.set(prevIdx);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const token = params['token'];
      if (token === 'refresh_token') {
        this.authService.refreshToken().subscribe({
          next: (res: any) => {
            const currentUser: InfoUser = {
              role: res.role,
              name: res.name,
              email: res.email,
              phoneNumber: res.phoneNumber,
              urlImage: res.urlImage,
            };
            this.tokenService.setTokens(res.access_token, res.listPermission, currentUser);
            window.location.href = '/home';
          },
          error: (err) => {
            this.toast.error(err.error?.message, 'Lỗi', {
              timeOut: 3000,
              progressBar: true,
              positionClass: 'toast-top-right',
            });
            this.router.navigate(['/home'], { replaceUrl: true });
          },
        });
      }

      this.initSearchForm();
      this.getListProvince(); // Call API lấy Tỉnh thành
      if (this.tokenService.isLoggedIn()) this.getListSavedRoom();
      this.getPublicRooms();
    });
  }

  initSearchForm() {
    this.searchForm = this.fb.group({
      province: [null],
      commune: [null],
      min_area: [null],
      max_area: [null],
      min_price_room: [null],
      max_price_room: [null],

      price_electricity: [null],
      price_water: [null],
      price_general_cleaning: [null],
      price_general_electricity: [null],
      price_internet: [null],
      price_washing_machine: [null],
      bed: [null],
      mattress: [null],
      wardrobe: [null],

      parking_area: [null],
      elevator: [null],
      security_camera: [null],
      security_24_7: [null],
      shared_laundry_area: [null],
      shared_drying_area: [null],
      dishwashing_area: [null],
      table_and_chairs: [null],
      air_conditioner: [null],
      water_heater: [null],
      washing_machine: [null],
      private_bathroom: [null],
      has_pet: [null],
      has_host: [null],
      has_rent: [false],
    });
  }

  // --- API LOCATION ---
  getListProvince() {
    // this.isLoading.set(true);
    const payload = {};
    this.houseService.findProvince(payload).subscribe({
      next: (res) => {
        // this.isLoading.set(false);
        this.listProvince.set(res.listProvince || []);
      },
      error: (err) => {
        // this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  getListSavedRoom() {
    this.isLoading.set(true);
    const payload = {
      pageNumber: 0,
      pageSize: 1000,
      requestParam: {},
    };
    this.houseService.findSavedRoom(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.listIdSavedRoom.set(res.page?.content.map((room: any) => room.id) || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  fetchCommunesForFilter(provinceCode: string) {
    this.houseService.findCommune({ province_code: provinceCode }).subscribe({
      next: (res) => this.listCommune.set(res.listCommune || []),
      error: (err) => console.error(err),
    });
  }

  selectFilterProvince(province: Province) {
    this.searchForm.patchValue({ province: province.provinceCode, commune: null });
    this.filterCommuneText.set('');
    this.fetchCommunesForFilter(province.provinceCode);
  }

  selectFilterCommune(commune: Commune) {
    this.searchForm.patchValue({ commune: commune.communeCode });
  }

  toggleFilterState(controlName: string) {
    const currentValue = this.searchForm.get(controlName)?.value;
    if (currentValue === null || currentValue === undefined) {
      this.searchForm.patchValue({ [controlName]: true });
    } else if (currentValue === true) {
      this.searchForm.patchValue({ [controlName]: false });
    } else {
      this.searchForm.patchValue({ [controlName]: null });
    }
  }

  resetSearch() {
    this.searchForm.reset();
    this.searchForm.patchValue({ has_rent: false });
    this.filterProvinceText.set('');
    this.filterCommuneText.set('');
    this.pageNumber.set(0);
    this.getPublicRooms();
  }

  // --- HỆ THỐNG PHÂN QUYỀN ---
  hasPermission(permission: string): boolean {
    if (!this.tokenService.isLoggedIn()) return false;
    const userPermissions = this.tokenService.getListPermission() || [];
    return userPermissions.some((p: string) => p === permission);
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  // --- TÌM KIẾM ---
  onSearch() {
    this.pageNumber.set(0);
    this.getPublicRooms();

    // Cuộn mượt xuống phần kết quả
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  cleanPayload(obj: any): any {
    const cleanedObj: any = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value !== null && value !== undefined && value !== '') {
        cleanedObj[key] = value;
      }
    });

    return cleanedObj;
  }

  getPublicRooms() {
    this.isLoading.set(true);
    const rawFilterData = this.searchForm ? this.searchForm.value : {};

    const cleanedParams = this.cleanPayload(rawFilterData);
    console.log('search room:', cleanedParams);

    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      isHost: false, // User public
      requestParam: cleanedParams,
    };

    this.houseService.findHouse(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        console.log('room: ', res.page?.content);
        this.listRooms.set(res.page?.content || []);
        this.totalPages.set(res.page?.totalPages || 1);
        this.totalElements.set(res.page?.totalElements || 0);

        this.existingRoomImages = [];
        //TODO: với từng phòng nếu id thuộc this.listIdSavedRoom thì nút Lưu lại đỏ như lúc di chuột vào
        // khi click chọn thì call addSavedRoom(), bỏ chọn call deleteSavedRoom()

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
                      console.log('image: ', this.existingRoomImages);
                    }
                  },
                  error: (err) => {
                    this.toast.error(err.error?.message, 'Lỗi', {
                      timeOut: 3000,
                      progressBar: true,
                      positionClass: 'toast-top-right',
                    });
                  },
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
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  addSavedRoom(room: any) {
    // call api + push vào this.listIdSavedRoom
    const payload = {
      id: room.id,
    };
    this.houseService.addSavedRoom(payload).subscribe({
      next: (res) => {
        this.listIdSavedRoom.update((ids) => [...ids, room.id]);
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

  deleteSavedRoom(room: any) {
    // call api + push vào this.listIdSavedRoom
    const payload = {
      id: room.id,
    };
    this.houseService.deleteSavedRoom(payload).subscribe({
      next: (res) => {
        this.listIdSavedRoom.update((ids) => ids.filter((id) => id !== room.id));
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

  // --- CHUYỂN TRANG ---
  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageNumber.set(newPage);
      this.getPublicRooms();

      // Cuộn mượt lên đầu phần kết quả sau khi chuyển trang
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }
}
