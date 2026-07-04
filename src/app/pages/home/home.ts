import { Component, OnInit, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
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
import { MatSelectModule } from '@angular/material/select';

// Thêm các thư viện Material và Mask
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { OsmMapComponent } from '../../shared/osm-map/osm-map.component';
import { ChatService } from '../../core/services/chat.service';
import { SysUserService } from '../../core/services/sys-user.service';
import { ContractService } from '../../core/services/contract.service';

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
    MatSelectModule,
    NgxMaskDirective,
    OsmMapComponent,
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
  private chatService = inject(ChatService);
  private sysUserService = inject(SysUserService);
  private contractService = inject(ContractService);

  searchForm!: FormGroup;
  preferencesForm!: FormGroup;
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

  // DATA PROVINCE/COMMUNE TÌM KIẾM CHO PREFERENCES MODAL
  preferencesCommunes = signal<Commune[]>([]);
  preferencesProvinceText = signal('');
  preferencesCommuneText = signal('');
  filteredPreferencesProvinces = computed(() => {
    const text = this.preferencesProvinceText().toLowerCase().trim();
    return this.listProvince().filter((p) => p.name.toLowerCase().includes(text));
  });
  filteredPreferencesCommunes = computed(() => {
    const text = this.preferencesCommuneText().toLowerCase().trim();
    return this.preferencesCommunes().filter((c) => c.name.toLowerCase().includes(text));
  });

  isPreferencesModalOpen = signal(false);

  // --- STATE: MODAL GỬI YÊU CẦU HỢP ĐỒNG (DÀNH CHO NGƯỜI THUÊ) ---
  isRequestContractModalOpen = signal(false);
  requestContractForm!: FormGroup;
  requestCccdFile = signal<File | null>(null);
  requestCccdFileName = signal<string>('');

  user = signal<InfoUser | null>(null);

  // trạng thái xác minh OCR
  isUserVerified = signal<boolean>(false);

  // Cờ kiểm soát trạng thái preview PDF hợp đồng
  isPreviewing: boolean = false;
  hasPreviewedContract: boolean = false;
  previewPdfUrl: string | null = null;

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
    console.log('selected room: ', room);
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
              isOcr: res.isOcr,
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
      if (this.tokenService.isLoggedIn()) {
        this.getListSavedRoom();
        this.user.set(this.tokenService.getUserInfo() || null);
        console.log('user: ', this.user());

        if (this.user()?.role === 'Người thuê trọ') {
          if (this.user()?.searchPreferences) {
            try {
              const prefs = JSON.parse(this.user()!.searchPreferences!);
              this.searchForm.patchValue(prefs);
              this.preferencesForm.patchValue(prefs);
            } catch (e) {
              console.error('Failed to parse search preferences', e);
            }
          } else {
            this.isPreferencesModalOpen.set(true);
          }
        }
      }
      this.getPublicRooms();
    });

    this.requestContractForm.valueChanges.subscribe(() => {
      this.hasPreviewedContract = false;
      this.previewPdfUrl = null;
    });
  }

  // Gọi API Preview
  previewContractPdf() {
    if (this.requestContractForm.invalid) {
      // Show toast error: Vui lòng điền đủ thông tin
      return;
    }

    this.isPreviewing = true;
    const requestData = {
      ...this.requestContractForm.value,
      roomId: this.selectedRoom().id,
    };

    // Gọi API bạn vừa tạo ở bước 1
    // this.contractService.previewContractPdf(requestData).subscribe({
    //   next: (res: any) => {
    //     // Giả sử API trả về URL qua trường urlImage
    //     this.previewPdfUrl = res.urlImage;
    //     this.hasPreviewedContract = true;
    //     this.isPreviewing = false;
    //   },
    //   error: (err) => {
    //     this.isPreviewing = false;
    //     // Show toast error
    //   }
    // });
  }

  initSearchForm() {
    const controls = {
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
    };
    this.searchForm = this.fb.group(controls);
    this.preferencesForm = this.fb.group({ ...controls, has_rent: [null] });
  }

  // --- API LOCATION ---
  getListProvince() {
    // this.isLoading.set(true);
    const payload = {};
    this.houseService.findProvince(payload).subscribe({
      next: (res) => {
        // this.isLoading.set(false);
        this.listProvince.set(res.listProvince || []);

        // Populate text for autocomplete if there's a selected province in search preferences
        const selectedProvince = this.searchForm.get('province')?.value;
        if (selectedProvince) {
          const provinceObj = this.listProvince().find(
            (p: any) => p.provinceCode === selectedProvince,
          );
          if (provinceObj) {
            this.filterProvinceText.set(provinceObj.name);
            this.fetchCommunesForFilter(selectedProvince, true); // Pass a flag to indicate it's from init
          }
        }
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

  fetchCommunesForFilter(provinceCode: string, isInit: boolean = false) {
    this.houseService.findCommune({ province_code: provinceCode }).subscribe({
      next: (res) => {
        this.listCommune.set(res.listCommune || []);
        if (isInit) {
          const selectedCommune = this.searchForm.get('commune')?.value;
          if (selectedCommune) {
            const communeObj = this.listCommune().find(
              (c: any) => c.communeCode === selectedCommune,
            );
            if (communeObj) {
              this.filterCommuneText.set(communeObj.name);
            }
          }
        }
      },
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

  getAmenityIcon(key: string): string {
    const icons: { [key: string]: string } = {
      parking_area: '🏍️',
      elevator: '🛗',
      security_camera: '📹',
      security_24_7: '🛡️',
      shared_laundry_area: '🧺',
      shared_drying_area: '☀️',
      dishwashing_area: '🚰',
      table_and_chairs: '🪑',
      air_conditioner: '❄️',
      water_heater: '♨️',
      washing_machine: '🧺',
      private_bathroom: '🚿',
      has_pet: '🐈',
      has_host: '🔑',
    };
    return icons[key] || '✅';
  }

  // --- HÀM CHO MODAL PREFERENCES ---
  fetchPreferencesCommunes(provinceCode: string) {
    this.houseService.findCommune({ province_code: provinceCode }).subscribe({
      next: (res) => this.preferencesCommunes.set(res.listCommune || []),
      error: (err) => console.error(err),
    });
  }

  selectPreferencesProvince(province: Province) {
    this.preferencesForm.patchValue({ province: province.provinceCode, commune: null });
    this.preferencesCommuneText.set('');
    this.fetchPreferencesCommunes(province.provinceCode);
  }

  selectPreferencesCommune(commune: Commune) {
    this.preferencesForm.patchValue({ commune: commune.communeCode });
  }

  togglePreferencesFilterState(controlName: string) {
    const currentValue = this.preferencesForm.get(controlName)?.value;
    if (currentValue === null || currentValue === undefined) {
      this.preferencesForm.patchValue({ [controlName]: true });
    } else if (currentValue === true) {
      this.preferencesForm.patchValue({ [controlName]: false });
    } else {
      this.preferencesForm.patchValue({ [controlName]: null });
    }
  }

  submitPreferences() {
    this.isLoading.set(true);
    const cleanedParams = this.cleanPayload(this.preferencesForm.value);
    const payload = {
      search_preferences: JSON.stringify(cleanedParams),
    };

    this.sysUserService.updateSearchPreferences(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isPreferencesModalOpen.set(false);
        this.toast.success('Lưu tùy chọn thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });

        // Cập nhật Token Service
        const currentUser = this.tokenService.getUserInfo();
        if (currentUser) {
          currentUser.searchPreferences = JSON.stringify(cleanedParams);
          this.tokenService.setTokens(
            this.tokenService.getAccessToken()!,
            this.tokenService.getListPermission(),
            currentUser,
          );
        }

        // Fill data sang searchForm
        this.searchForm.patchValue(cleanedParams);
        this.onSearch();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Lỗi lưu tùy chọn', 'Lỗi', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      },
    });
  }

  skipPreferences() {
    this.isPreferencesModalOpen.set(false);
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

    // Lưu lại bộ lọc xuống backend và session nếu là Người thuê trọ
    if (this.user()?.role === 'Người thuê trọ') {
      const cleanedParams = this.cleanPayload(this.searchForm.value);
      const payload = {
        search_preferences: JSON.stringify(cleanedParams),
      };

      this.sysUserService.updateSearchPreferences(payload).subscribe({
        next: () => {
          // Update Token Service
          const currentUser = this.tokenService.getUserInfo();
          if (currentUser) {
            currentUser.searchPreferences = JSON.stringify(cleanedParams);
            this.tokenService.setTokens(
              this.tokenService.getAccessToken()!,
              this.tokenService.getListPermission(),
              currentUser,
            );
          }
        },
        error: (err) => console.error('Failed to update search preferences', err),
      });
    }

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

  renderStars(count: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  isStarFilled(starIndex: number, rating: number | null | undefined): boolean {
    return rating != null && starIndex <= Math.round(rating);
  }

  hasMapLocation(room: any): boolean {
    return room?.houseSet?.latitude != null && room?.houseSet?.longitude != null;
  }

  // --- STATE: MODAL THÔNG TIN CHỦ NHÀ ---
  isOwnerModalOpen = signal(false);

  // Lấy trạng thái đăng nhập
  get isLoggedIn(): boolean {
    return this.tokenService.isLoggedIn();
  }

  // Hàm mở Modal Thông tin Chủ nhà
  openOwnerModal(room: any, event: Event) {
    event.stopPropagation(); // Tránh kích hoạt mở detail modal nếu click ở ngoài card
    if (room.houseSet.owner.urlImage) {
      this.houseService.getImageRoom({ id: room.houseSet.owner.urlImage }).subscribe({
        next: (blob: any) => {
          const objectUrl = URL.createObjectURL(blob);
          room.houseSet.owner.urlImageShow = objectUrl;
          this.selectedRoom.set(room); // Tận dụng lại selectedRoom
          this.isOwnerModalOpen.set(true);
        },
        error: (err) => {
          this.toast.error(err.error?.message, 'Lỗi', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
        },
      });
    } else {
      this.selectedRoom.set(room); // Tận dụng lại selectedRoom
      this.isOwnerModalOpen.set(true);
    }
  }

  // Hàm đóng Modal
  closeOwnerModal() {
    this.isOwnerModalOpen.set(false);
    // Không set selectedRoom = null ở đây vì có thể user đang xem modal chi tiết phòng ở dưới
  }

  // Hàm điều hướng sang Chat
  chatWithOwner() {
    const owner = this.selectedRoom()?.houseSet?.owner;
    if (!owner?.username) return;

    this.isLoading.set(true);

    const payload = {
      typeGroup: 'COUPLE',
      listAdmin: owner.username,
    };

    this.chatService.addNewGroupMessage(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.closeOwnerModal();

        // sử dụng res.groupId để điều hướng đến phòng chat tương ứng
        this.chatService.openChatBubble$.next(res.groupId);
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

  // Sửa lại hàm signContractNow() đang có
  signContractNow() {
    const room = this.selectedRoom();
    if (!room) return;

    this.closeOwnerModal();

    // KIỂM TRA TRẠNG THÁI OCR CỦA USER Ở ĐÂY
    // Ép kiểu any để lấy isOcr (bạn nhớ đảm bảo Backend có trả trường isOcr vào trong token nhé)
    const userInfo: any = this.tokenService.getUserInfo();
    this.isUserVerified.set(true);

    // Khởi tạo form
    this.requestContractForm = this.fb.group({
      room_id: [room.id, Validators.required],
      tenant_username: [this.tokenService.getUserInfo()?.name || '', Validators.required],
      contract_type: ['LEASE', Validators.required],
      begin_time: ['', Validators.required],
      end_time: ['', Validators.required],
      deposit_amount: [room.priceRoom || 0],
      notify_channel: ['EMAIL'],
      terms: [''],
    });

    this.isRequestContractModalOpen.set(true);
  }

  closeRequestContractModal() {
    this.isRequestContractModalOpen.set(false);
    this.requestCccdFile.set(null);
    this.requestCccdFileName.set('');
  }

  onRequestCccdSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.requestCccdFile.set(input.files[0]);
      this.requestCccdFileName.set(input.files[0].name);
    }
  }

  formatDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  submitContractRequest(): void {
    if (this.requestContractForm.invalid) {
      this.requestContractForm.markAllAsTouched();
      return;
    }
    if (!this.hasPreviewedContract) {
      // Show toast error: Cần xem trước hợp đồng trước khi gửi
      this.toast.warning('Vui lòng xem trước hợp đồng trước khi gửi yêu cầu.', 'Chú ý', {
        timeOut: 3000,
        progressBar: true,
        positionClass: 'toast-top-right',
      });
      return;
    }
    const val = this.requestContractForm.value;
    const request = {
      room_id: val.room_id,
      contract_type: val.contract_type,
      deposit_amount: val.deposit_amount,
      notify_channel: val.notify_channel,
      terms: val.terms,
      begin_time: this.formatDateTime(val.begin_time),
      end_time: this.formatDateTime(val.end_time),
    };

    this.isLoading.set(true);
    this.contractService.createContractFromRoom(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Đã gửi yêu cầu hợp đồng cho chủ nhà!', 'Thành công');
        this.closeRequestContractModal();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Gửi yêu cầu thất bại', 'Lỗi');
      },
    });
  }

  // 3. Thêm hàm để nút "Đi đến trang Xác minh" gọi tới
  goToProfileToVerify() {
    this.closeRequestContractModal();
    this.router.navigate(['/profile']); // Chuyển hướng sang tab/trang cá nhân
  }
}
