import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

  searchForm!: FormGroup;
  listRooms = signal<any[]>([]);
  isLoading = signal(false);

  // Pagination
  pageNumber = signal(0);
  pageSize = signal(12);

  // User Dropdown
  isDropdownOpen = signal(false);
  currentUser = signal({
    name: 'Admin Nguyễn',
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=10b981&color=fff',
    role: 'Quản trị viên',
  });

  // --- TRẠNG THÁI LỌC NÂNG CAO ---
  isAdvancedSearchOpen = signal(false);

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
            this.router.navigate(['/home'], { replaceUrl: true });
          },
          error: (err) => {
            this.toast.error(err.error?.message, 'Lỗi', { timeOut: 3000, progressBar: true });
            this.router.navigate(['/home'], { replaceUrl: true });
          },
        });
      }

      this.initSearchForm();
      this.getListProvince(); // Call API lấy Tỉnh thành
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
    });
  }

  // --- API LOCATION ---
  getListProvince() {
    this.houseService.findProvince({}).subscribe({
      next: (res) => this.listProvince.set(res.listProvince || []),
      error: (err) => console.error(err),
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

  get canManageRoles() {
    return this.hasPermission(EPermission.ADD_ROLE);
  }
  get canManageUsers() {
    return this.hasPermission(EPermission.ADD_USER);
  }
  get canManageHouses() {
    return this.hasPermission(EPermission.ADD_HOUSE);
  }
  get isAdminOrHost() {
    return this.canManageRoles || this.canManageUsers || this.canManageHouses;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
  logout() {
    console.log('Thực hiện đăng xuất...');
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

  getPublicRooms() {
    this.isLoading.set(true);
    const rawData = this.searchForm.value;
    const cleanParams: any = {};
    Object.keys(rawData).forEach((key) => {
      if (rawData[key] !== null && rawData[key] !== '') {
        cleanParams[key] = rawData[key];
      }
    });

    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      isHost: false, // User public
      requestParam: cleanParams,
    };

    this.houseService.findHouse(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.listRooms.set(res.page?.content || []);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        console.error('Lỗi:', err);
      },
    });
  }
}
