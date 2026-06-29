import { Component, OnInit, signal, inject, ChangeDetectorRef, computed } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Province } from '../../core/models/province.model';
import { Commune } from '../../core/models/commune.model';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';
import { TokenService } from '../../core/services/token.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { count } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OsmMapComponent } from '../../shared/osm-map/osm-map.component';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-manager-house',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    NgxMaskDirective,
    MatTooltipModule,
    OsmMapComponent,
  ],
  providers: [provideNgxMask()],
  templateUrl: './manager-house.html',
  styleUrl: './manager-house.scss',
})
export class ManagerHouse implements OnInit {
  @ViewChild('locationMap') locationMap?: OsmMapComponent;

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // Ép Angular cập nhật UI ngay lập tức
  private houseService = inject(HouseRoomManagementService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private toast = inject(ToastrService);

  viewMode = signal<'LIST' | 'FORM'>('LIST');
  isLoading = signal(false);
  isUpdateMode = signal(false);

  houseForm!: FormGroup;
  listRooms = signal<any[]>([]);

  // 1. Thay đổi cấu trúc mảng ảnh mới để chứa cả File và URL xem trước
  roomImages: { file: File; previewUrl: string }[][] = [];

  // 2. Mảng lưu ảnh cũ tải về từ API
  existingRoomImages: { id: string; url: string; urlImage: string }[][] = [];

  deletedRoomIds: string[] = [];
  deletedImagePaths: string[] = [];

  // Thêm biến quản lý Modal xem ảnh to
  selectedImageToView = signal<string | null>(null);

  // 1. CHUYỂN SANG DÙNG SIGNAL CHO TRẠNG THÁI LOADING TỪNG PHÒNG
  // Lưu trữ dưới dạng Object: { 0: false, 1: true, ... } (Key là roomIndex)
  roomImageLoadingState = signal<Record<number, boolean>>({});

  priceFields = [
    { key: 'price_room', label: 'Giá phòng/tháng' },
    { key: 'price_electricity', label: 'Giá điện/số' },
    { key: 'price_water', label: 'Giá nước/số' },
    { key: 'price_general_cleaning', label: 'Phí vệ sinh chung' },
    { key: 'price_general_electricity', label: 'Phí điện chung' },
    { key: 'price_internet', label: 'Giá Internet/người' },
    { key: 'price_washing_machine', label: 'Giá máy giặt/người' },
  ];

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

  qtyFields = [
    { key: 'bed', label: 'Giường ngủ' },
    { key: 'mattress', label: 'Đệm ngủ' },
    { key: 'wardrobe', label: 'Tủ quần áo' },
  ];

  listProvince = signal<Province[]>([]);
  listCommune = signal<Commune[]>([]);
  searchProvinceText = signal('');
  searchCommuneText = signal('');

  pageNumber = signal(0);
  pageSize = signal(10);

  // --- BIẾN CHO TÌM KIẾM & PHÂN TRANG ---
  isFilterExpanded = signal(false);
  rentStatusFilter = signal<'ALL' | 'VACANT' | 'RENTED'>('ALL');

  searchForm!: FormGroup;
  totalPages = signal(1); // Tổng số trang trả về từ API
  totalElements = signal(0); // Tổng số bản ghi

  // Biến text riêng cho Autocomplete của bộ lọc (để không đụng với form Thêm)
  filterProvinceText = signal('');
  filterCommuneText = signal('');

  filteredSearchProvinces = computed(() => {
    const text = this.filterProvinceText().toLowerCase().trim();
    return this.listProvince().filter((p) => p.name.toLowerCase().includes(text));
  });

  filteredSearchCommunes = computed(() => {
    const text = this.filterCommuneText().toLowerCase().trim();
    return this.listCommune().filter((c) => c.name.toLowerCase().includes(text));
  });

  // --- BIẾN CHO TÌM KIẾM & PHÂN TRANG ---

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

  ngOnInit() {
    if (!this.tokenService.isLoggedIn()) {
      this.router.navigate(['/auth/sign-in']);
    }
    this.initSearchForm();
    this.initData();
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
      has_rent: [null],
    });
  }

  openAddForm() {
    this.isUpdateMode.set(false);
    this.initForm(); // Khởi tạo lại với 1 phòng rỗng
    this.deletedRoomIds = [];
    this.deletedImagePaths = [];
    this.viewMode.set('FORM');

    this.searchCommuneText.set('');
    this.searchProvinceText.set('');
  }

  initForm() {
    this.houseForm = this.fb.group({
      id: [null],
      province: ['', Validators.required],
      commune: ['', Validators.required],
      address: ['', Validators.required],
      latitude: [21.0285],
      longitude: [105.8542],
      count_room: [1, Validators.required],
      name: ['', Validators.required],
      room: this.fb.array([this.createRoomFormGroup(0)]),
    });

    this.roomImages = [[]]; // Khởi tạo mảng ảnh rỗng cho phòng đầu tiên
    this.existingRoomImages = [[]]; // Khởi tạo mảng ảnh cũ rỗng
    this.roomImageLoadingState.set({ 0: false }); // loading ảnh
  }

  createRoomFormGroup(index: number) {
    return this.fb.group({
      id: [null],
      name: [`Phòng ${index + 1}`, Validators.required],
      describe_room: [null],
      area: [0],
      price_room: [0],
      price_electricity: [0],
      price_water: [0],
      price_general_cleaning: [0],
      price_general_electricity: [0],
      price_internet: [0],
      price_washing_machine: [0],
      parking_area: [false],
      elevator: [false],
      security_camera: [false],
      security_24_7: [false],
      shared_laundry_area: [false],
      shared_drying_area: [false],
      dishwashing_area: [false],
      bed: [0],
      mattress: [0],
      wardrobe: [0],
      table_and_chairs: [false],
      air_conditioner: [false],
      water_heater: [false],
      washing_machine: [false],
      private_bathroom: [false],
      has_rent: [false],
      has_host: [false],
      has_pet: [false],
    });
  }

  updateRoomFormGroup(roomData: any) {
    return this.fb.group({
      id: [roomData.id],
      name: [roomData.name, Validators.required],
      describe_room: [roomData.describeRoom],
      area: [roomData.area],
      price_room: [roomData.priceRoom],
      price_electricity: [roomData.priceElectricity],
      price_water: [roomData.priceWater],
      price_general_cleaning: [roomData.priceGeneralCleaning],
      price_general_electricity: [roomData.priceGeneralElectricity],
      price_internet: [roomData.priceInternet],
      price_washing_machine: [roomData.priceWashingMachine],
      parking_area: [roomData.parkingArea],
      elevator: [roomData.elevator],
      security_camera: [roomData.securityCamera],
      security_24_7: [roomData.security24_7],
      shared_laundry_area: [roomData.sharedLaundryArea],
      shared_drying_area: [roomData.sharedDryingArea],
      dishwashing_area: [roomData.dishwashingArea],
      bed: [roomData.bed],
      mattress: [roomData.mattress],
      wardrobe: [roomData.wardrobe],
      table_and_chairs: [roomData.tableAndChairs],
      air_conditioner: [roomData.airConditioner],
      water_heater: [roomData.waterHeater],
      washing_machine: [roomData.washingMachine],
      private_bathroom: [roomData.privateBathroom],
      has_rent: [roomData.hasRent],
      has_host: [roomData.hasHost],
      has_pet: [roomData.hasPet],
    });
  }

  // THÊM PHÒNG: CLONE DỮ LIỆU PHÒNG TRƯỚC ĐÓ
  addRoom() {
    const newIndex = this.rooms.length;
    const newRoom = this.createRoomFormGroup(newIndex);

    if (this.rooms.length > 0) {
      const lastRoomData = this.rooms.at(this.rooms.length - 1).value;
      const { id, name, ...clonedData } = lastRoomData;
      console.log('Cloning data for new room:', clonedData);
      // Đổ data vào phòng mới
      newRoom.patchValue(clonedData);
    }

    this.rooms.push(newRoom);

    this.roomImages.push([]); // Thêm mảng ảnh rỗng cho phòng mới
    this.existingRoomImages.push([]); // Khởi tạo mảng ảnh cũ rỗng
    this.roomImageLoadingState.update((state) => ({ ...state, [newIndex]: false })); // loading ảnh

    this.houseForm.patchValue({ count_room: this.rooms.length });

    console.log('Added new room. Total rooms now:', this.rooms.value);
  }

  removeRoom(index: number) {
    const roomId = this.rooms.at(index).get('id')?.value;
    console.log('Attempting to remove room at index:', index, 'with ID:', roomId);
    if (roomId) {
      this.deletedRoomIds.push(roomId);
    }

    if (this.existingRoomImages[index] && this.existingRoomImages[index].length > 0) {
      this.deletedImagePaths.push(...this.existingRoomImages[index].map((img) => img.urlImage));
    }

    this.rooms.removeAt(index);

    this.roomImages.splice(index, 1); // Xóa mảng mới tải lên ảnh của phòng đó
    this.existingRoomImages.splice(index, 1); // Xóa mảng ảnh cũ của phòng đó
    this.roomImageLoadingState.update((state) => {
      // loading ảnh
      const newState: Record<number, boolean> = {};
      for (let i = 0; i < this.rooms.length; i++) {
        // Nếu i < index bị xóa, giữ nguyên. Nếu i >= index bị xóa, lấy giá trị của phòng kế tiếp (i + 1)
        newState[i] = i < index ? state[i] : state[i + 1] || false;
      }
      return newState;
    });

    this.houseForm.patchValue({ count_room: this.rooms.length });
  }

  // KHI CHỌN ẢNH MỚI (UPDATE LOGIC TẠO PREVIEW)
  async onFileSelected(event: any, roomIndex: number) {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files) as File[];

      const newImagesForRoom = [...this.roomImages[roomIndex]];

      // Bật loading cho phòng này qua Signal
      this.roomImageLoadingState.update((state) => ({ ...state, [roomIndex]: true }));

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          try {
            const webpFile = await this.convertToWebP(file);
            const previewUrl = URL.createObjectURL(webpFile);

            newImagesForRoom.push({ file: webpFile, previewUrl: previewUrl });
          } catch (error) {
            console.error('Lỗi nén ảnh:', error);
          }
        }
      }

      const updatedRoomImages = [...this.roomImages];
      updatedRoomImages[roomIndex] = newImagesForRoom;
      this.roomImages = updatedRoomImages;

      // Ép giao diện render lại một lần duy nhất
      this.cdr.detectChanges();

      // Tắt loading qua Signal
      this.roomImageLoadingState.update((state) => ({ ...state, [roomIndex]: false }));

      // Reset input
      event.target.value = '';
    }
  }

  get rooms() {
    return this.houseForm.get('room') as FormArray;
  }

  // --- CÁC HÀM XÓA ẢNH THEO INDEX ---

  // Xóa ảnh cũ (Đã có trên DB)
  removeExistingImage(roomIndex: number, imgIndex: number) {
    const imageUrl = this.existingRoomImages[roomIndex][imgIndex].url;
    this.deletedImagePaths.push(imageUrl); // Đưa vào danh sách cần xóa khi submit
    this.existingRoomImages[roomIndex].splice(imgIndex, 1); // Xóa khỏi giao diện
  }

  // Xóa ảnh mới (Vừa chọn trên máy)
  removeNewImage(roomIndex: number, imgIndex: number) {
    this.roomImages[roomIndex].splice(imgIndex, 1); // Chỉ cần xóa khỏi mảng local
  }

  onSubmit() {
    console.log('Form Value:', this.houseForm.value);
    if (this.houseForm.invalid) {
      this.houseForm.markAllAsTouched();
      if (this.houseForm.get('province')?.invalid) {
        this.toast.warning('Vui lòng chọn tỉnh/thành phố', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
      if (this.houseForm.get('commune')?.invalid) {
        this.toast.warning('Vui lòng chọn phường/xã', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
      if (this.houseForm.get('address')?.invalid) {
        this.toast.warning('Vui lòng nhập địa chỉ chi tiết', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
      if (this.houseForm.get('name')?.invalid) {
        this.toast.warning('Vui lòng nhập tên nhà trọ', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
      if (this.rooms.length != this.houseForm.value.count_room) {
        this.toast.warning('Vui lòng kiểm tra lại thông tin nhà trọ', 'Chú ý', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
      }
      return;
    }

    this.isLoading.set(true);
    this.syncMapToForm();
    const formData = new FormData();
    const requestJson = this.houseForm.value;

    if (this.isUpdateMode()) {
      const blob = new Blob([JSON.stringify(requestJson)], { type: 'application/json' });
      formData.append('request', blob);

      formData.append(
        'delete_file',
        new Blob([JSON.stringify(this.deletedImagePaths)], { type: 'application/json' }),
      );
      formData.append(
        'delete_room',
        new Blob([JSON.stringify(this.deletedRoomIds)], { type: 'application/json' }),
      );
    } else {
      delete requestJson.id;
      requestJson.room.forEach((r: any) => delete r.id);
      const blob = new Blob([JSON.stringify(requestJson)], { type: 'application/json' });
      formData.append('request', blob);
    }

    // Sửa lại đoạn lấy file từ mảng object mới
    this.roomImages.forEach((imgObjects, roomIndex) => {
      imgObjects.forEach((imgObj, fileIndex) => {
        const finalName = `room${roomIndex}_${fileIndex + 1}.webp`;
        const renamedFile = new File([imgObj.file], finalName, { type: imgObj.file.type });

        if (this.isUpdateMode()) {
          formData.append('new', renamedFile);
        } else {
          formData.append('image_file', renamedFile);
        }
      });
    });

    console.log('Payload Data:', requestJson);

    if (this.isUpdateMode()) {
      //update phòng trọ, nhà trọ
      this.houseService.updateHouse(formData).subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          // this.comebackToList();
          this.getListHouse();

          this.toast.success('Cập nhật thông tin nhà trọ thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
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
    } else {
      this.houseService.addHouse(formData).subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          this.comebackToList();

          this.toast.success('Thêm nhà trọ mới thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
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
  }

  comebackToList() {
    this.viewMode.set('LIST');
    this.getListHouse();
  }

  initData() {
    this.getListProvince();
    this.comebackToList();
  }

  selectFilterProvince(province: Province) {
    this.searchForm.patchValue({
      province: province.provinceCode,
      commune: null,
    });
    this.filterCommuneText.set('');
    this.fetchCommunesForFilter(province.provinceCode);
  }

  fetchCommunesForFilter(provinceCode: string) {
    // this.isLoading.set(true);
    const payload = {
      province_code: provinceCode,
    };
    this.houseService.findCommune(payload).subscribe({
      next: (res) => {
        // this.isLoading.set(false);
        this.listCommune.set(res.listCommune || []);
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

  selectFilterCommune(commune: Commune) {
    this.searchForm.patchValue({ commune: commune.communeCode });
  }

  toggleFilterState(controlName: string) {
    const currentValue = this.searchForm.get(controlName)?.value;

    if (currentValue === null || currentValue === undefined) {
      this.searchForm.patchValue({ [controlName]: true }); // Click 1: Có
    } else if (currentValue === true) {
      this.searchForm.patchValue({ [controlName]: false }); // Click 2: Không
    } else {
      this.searchForm.patchValue({ [controlName]: null }); // Click 3: Tất cả (Reset)
    }
  }

  getListHouse() {
    this.isLoading.set(true);
    const rawFilterData = this.searchForm ? this.searchForm.value : {};
    if (this.rentStatusFilter() === 'VACANT') {
      rawFilterData.has_rent = false;
    } else if (this.rentStatusFilter() === 'RENTED') {
      rawFilterData.has_rent = true;
    }

    const cleanedParams = this.cleanPayload(rawFilterData);
    console.log('search room:', cleanedParams);

    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      isHost: true,
      requestParam: cleanedParams,
    };

    this.houseService.findHouseToken(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.listRooms.set(res.page?.content || []);
        this.totalPages.set(res.page?.totalPages || 1);
        this.totalElements.set(res.page?.totalElements || 0);
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

  // MỞ FORM UPDATE VÀ LOAD ẢNH CŨ
  openUpdateForm(roomData: any) {
    this.isUpdateMode.set(true);

    this.deletedRoomIds = [];
    this.deletedImagePaths = [];

    this.houseForm = this.fb.group({
      id: [null],
      province: ['', Validators.required],
      commune: ['', Validators.required],
      address: ['', Validators.required],
      latitude: [null as number | null],
      longitude: [null as number | null],
      count_room: [null, Validators.required],
      name: ['', Validators.required],
      room: this.fb.array([]),
    });
    this.roomImages = [];
    this.existingRoomImages = [];
    this.roomImageLoadingState.set({ 0: false });

    this.isLoading.set(true);

    const payload = {
      id: roomData.houseSet.id,
    };

    this.houseService.getHouse(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);

        const houseData = res;
        this.houseForm.patchValue({
          id: houseData.id,
          name: houseData.name,
          address: houseData.address,
          latitude: houseData.latitude ?? 21.0285,
          longitude: houseData.longitude ?? 105.8542,
          province: houseData.province.provinceCode,
          commune: houseData.commune.communeCode,
          count_room: houseData.countRoom,
        });

        this.searchProvinceText.set(houseData.province.name);
        this.searchCommuneText.set(houseData.commune.name);
        this.getListCommune();

        houseData.room.forEach((roomData: any, index: number) => {
          this.rooms.push(this.updateRoomFormGroup(roomData));
          this.roomImages.push([]);
          this.existingRoomImages.push([]);
          // 5. Khởi tạo trạng thái false khi load form update
          this.roomImageLoadingState.update((state) => ({ ...state, [index]: true }));
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
                    this.roomImageLoadingState.update((state) => ({ ...state, [index]: false }));
                    this.cdr.detectChanges();
                  }
                },
                error: (err) => {
                  this.roomImageLoadingState.update((state) => ({ ...state, [index]: false }));
                  this.toast.error(err.error?.message, 'Lỗi', {
                    timeOut: 3000,
                    progressBar: true,
                    positionClass: 'toast-top-right',
                  });
                },
              });
            });
          } else {
            this.roomImageLoadingState.update((state) => ({ ...state, [index]: false }));
          }
        });

        this.viewMode.set('FORM');
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

  deleteHouse(houseId: string | null) {
    console.log('Attempting to delete house with ID:', houseId);
    if (!houseId) return;

    if (
      confirm(
        'Bạn có chắc chắn muốn xóa toàn bộ thông tin nhà trọ này cùng các phòng bên trong? Hành động này không thể hoàn tác!',
      )
    ) {
      this.isLoading.set(true);

      const payload = { id: houseId }; // Tạo payload theo API của bạn

      this.houseService.deleteHouse(payload).subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          this.toast.success('Đã xóa nhà trọ thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          // Xóa xong thì tự động quay về danh sách
          this.comebackToList();
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
        },
      });
    }
  }

  // --- 5. CÁC HÀM TRIGGER TÌM KIẾM & PHÂN TRANG ---
  onSearch() {
    this.pageNumber.set(0); // Bấm tìm kiếm thì luôn quay về trang 1 (index 0)
    this.getListHouse();
  }

  onResetSearch() {
    this.searchForm.reset();
    this.rentStatusFilter.set('ALL');
    this.filterProvinceText.set('');
    this.filterCommuneText.set('');
    this.pageNumber.set(0);
    this.getListHouse();
  }

  setRentStatusFilter(status: 'ALL' | 'VACANT' | 'RENTED') {
    this.rentStatusFilter.set(status);
    this.pageNumber.set(0);
    if (status === 'ALL') {
      this.searchForm.patchValue({ has_rent: null });
    } else {
      this.searchForm.patchValue({ has_rent: status === 'RENTED' });
    }
    this.getListHouse();
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageNumber.set(newPage);
      this.getListHouse();
    }
  }

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

  getListCommune() {
    // this.isLoading.set(true);
    const payload = {
      province_code: this.houseForm.value.province,
    };
    this.houseService.findCommune(payload).subscribe({
      next: (res) => {
        // this.isLoading.set(false);
        this.listCommune.set(res.listCommune || []);
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

  // Computed lọc danh sách siêu mượt
  filteredProvinces = computed(() => {
    const text = this.searchProvinceText().toLowerCase().trim();
    return this.listProvince().filter((p) => p.name.toLowerCase().includes(text));
  });

  filteredCommunes = computed(() => {
    const text = this.searchCommuneText().toLowerCase().trim();
    return this.listCommune().filter((c) => c.name.toLowerCase().includes(text));
  });

  selectProvince(province: Province) {
    console.log('Selected Province:', province);
    this.houseForm.patchValue({
      province: province.provinceCode,
      commune: null, // Reset xã
    });
    this.searchCommuneText.set(''); // Xóa text tìm kiếm xã cũ
    this.getListCommune(); // Gọi API lấy xã
  }

  // KHI CHỌN XÃ TRÊN MATERIAL DROPDOWN
  selectCommune(commune: Commune) {
    this.houseForm.patchValue({ commune: commune.communeCode });
    this.searchCommuneText.set(commune.name);
  }

  async geocodeAddress(): Promise<void> {
    const address = this.houseForm.get('address')?.value;
    const provinceName = this.searchProvinceText();
    const communeName = this.searchCommuneText();
    if (!address) {
      this.toast.warning('Vui lòng nhập địa chỉ trước', 'Chú ý');
      return;
    }
    const query = encodeURIComponent(`${address}, ${communeName}, ${provinceName}, Vietnam`);
    try {
      this.isLoading.set(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        { headers: { 'Accept-Language': 'vi' } },
      );
      const data = await res.json();
      if (data?.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        this.houseForm.patchValue({ latitude: lat, longitude: lng });
        this.locationMap?.setPosition(lat, lng);
        this.toast.success('Đã lấy vị trí từ địa chỉ', 'Thành công');
      } else {
        this.toast.warning('Không tìm thấy vị trí. Hãy kéo marker trên bản đồ.', 'Chú ý');
      }
    } catch {
      this.toast.error('Lỗi khi tra cứu vị trí', 'Lỗi');
    } finally {
      this.isLoading.set(false);
    }
  }

  syncMapToForm(): void {
    const pos = this.locationMap?.getPosition();
    if (pos) {
      this.houseForm.patchValue({ latitude: pos.latitude, longitude: pos.longitude });
    }
  }

  mapLatitude(): number {
    return this.houseForm.get('latitude')?.value ?? 21.0285;
  }

  mapLongitude(): number {
    return this.houseForm.get('longitude')?.value ?? 105.8542;
  }

  // Tiện ích để Template gọi xem phòng này có đang load không
  isLoadingRoom(roomIndex: number): boolean {
    return this.roomImageLoadingState()[roomIndex] || false;
  }

  // --- THÊM 2 HÀM XỬ LÝ MODAL ---
  viewFullImage(url: string) {
    this.selectedImageToView.set(url);
  }

  closeFullImage() {
    this.selectedImageToView.set(null);
  }

  private convertToWebP(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Không thể tạo Canvas');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Giữ tạm tên cũ, chỉ đổi đuôi .webp
              const tempName = file.name.replace(/\.[^/.]+$/, '.webp');
              resolve(new File([blob], tempName, { type: 'image/webp' }));
            }
          },
          'image/webp',
          quality,
        );
      };
      img.onerror = (e) => reject(e);
    });
  }
}
