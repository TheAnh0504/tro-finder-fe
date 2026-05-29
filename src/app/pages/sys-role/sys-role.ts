import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
// Giả định bạn đã có RoleService
import { RoleService } from '../../core/services/role.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-sys-role',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './sys-role.html',
  styleUrl: './sys-role.scss',
})
export class SysRole implements OnInit {
  private fb = inject(FormBuilder);
  private toast = inject(ToastrService);
  private roleService = inject(RoleService);

  // --- STATE QUẢN LÝ GIAO DIỆN ---
  viewMode = signal<'LIST' | 'FORM'>('LIST');
  isUpdateMode = signal(false);
  isLoading = signal(false);
  isFilterExpanded = signal(false);

  // --- DỮ LIỆU ---
  listRoles = signal<any[]>([]);
  totalPages = signal(1);
  totalElements = signal(0);
  pageNumber = signal(0);
  pageSize = signal(10);

  // --- FORMS ---
  searchForm!: FormGroup;
  roleForm!: FormGroup;

  // --- MODALS ---
  selectedRole = signal<any>(null);
  isDetailModalOpen = signal(false);

  // Danh sách các quyền hệ thống có sẵn (Hiển thị UI)
  availablePermissions = [
    // { key: 'DEFAULT', label: 'Quyền Mặc Định' },
    { key: 'ADD_USER', label: 'Thêm tài khoản mới' },
    { key: 'UPDATE_USER', label: 'Cập nhật thông tin tài khoản' },
    { key: 'ADMIN_UPDATE_USER', label: 'Admin cập nhật thông tin tài khoản' },
    { key: 'FIND_USER', label: 'Tìm kiếm tài khoản' },
    { key: 'GET_USER', label: 'Lây thông tin chi tiết tài khoản' },
    { key: 'DELETE_USER', label: 'Xóa tài khoản' },
    { key: 'LOCK_USER', label: 'Khóa tài khoản' },
    { key: 'UNLOCK_USER', label: 'Mở khóa tài khoản' },

    { key: 'DATA_RECOVERY', label: 'Khôi phục tệp dữ liệu' },

    { key: 'ADD_ROLE', label: 'Thêm nhóm quyền mới' },
    { key: 'UPDATE_ROLE', label: 'Cập nhật nhóm quyền' },
    { key: 'FIND_ROLE', label: 'Tìm kiếm nhóm quyền' },
    { key: 'GET_ROLE', label: 'Lấy thông tin chi tiết nhóm quyền' },
    { key: 'DELETE_ROLE', label: 'Xóa nhóm quyền' },

    { key: 'ADD_HOUSE', label: 'Thêm phòng trọ mới' },
    { key: 'UPDATE_HOUSE', label: 'Cập nhật thông tin phòng trọ' },
    { key: 'FIND_HOUSE', label: 'Tìm kiếm phòng trọ' },
    { key: 'GET_HOUSE', label: 'Lấy thông tin chi tiết phòng trọ' },
    { key: 'DELETE_HOUSE', label: 'Xóa phòng trọ' },

    { key: 'ADD_SAVED_ROOM', label: 'Lưu lại phòng' },
    { key: 'DELETE_SAVED_ROOM', label: 'Xóa phòng đã lưu' },
    { key: 'FIND_SAVED_ROOM', label: 'Tìm kiếm phòng đã lưu' },
  ];

  ngOnInit() {
    this.initSearchForm();
    this.initRoleForm();
    this.getRoles();
  }

  initSearchForm() {
    this.searchForm = this.fb.group({
      roleCode: [''],
      roleName: [''],
      listPermission: [null],
    });
  }

  initRoleForm() {
    this.roleForm = this.fb.group({
      id: [null],
      role_code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]], // Code viết hoa, ko dấu
      role_name: ['', Validators.required],
      list_permission: [[]], // Lưu mảng các quyền
    });
  }

  // --- TÌM KIẾM & PHÂN TRANG ---
  onSearch() {
    this.pageNumber.set(0);
    this.getRoles();
  }

  onResetSearch() {
    this.searchForm.reset();
    this.pageNumber.set(0);
    this.getRoles();
  }

  getRoles() {
    this.isLoading.set(true);
    const rawValue = this.searchForm.value;

    const requestParam: any = {};
    Object.keys(rawValue).forEach((key) => {
      if (rawValue[key] !== null && rawValue[key] !== '') {
        if (key === 'listPermission') {
          if (!rawValue[key].includes(null)) {
            requestParam[key] = rawValue[key];
          }
        } else requestParam[key] = rawValue[key];
      }
    });

    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      requestParam: requestParam,
    };

    // Gọi API Find Role
    this.roleService.findRole(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.listRoles.set(res.page?.content || []);
        this.totalPages.set(res.page?.totalPages || 1);
        this.totalElements.set(res.page?.totalElements || 0);
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

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.totalPages()) {
      this.pageNumber.set(newPage);
      this.getRoles();
    }
  }

  // --- LOGIC TOGGLE QUYỀN TRONG FORM ---
  togglePermission(permissionKey: string, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentList: string[] = this.roleForm.get('list_permission')?.value || [];

    if (isChecked) {
      if (!currentList.includes(permissionKey)) currentList.push(permissionKey);
    } else {
      const index = currentList.indexOf(permissionKey);
      if (index > -1) currentList.splice(index, 1);
    }

    this.roleForm.patchValue({ list_permission: currentList });
  }

  // --- CHUYỂN ĐỔI FORM ---
  openAddForm() {
    this.isUpdateMode.set(false);
    this.roleForm.reset({ list_permission: ['DEFAULT'] });
    this.roleForm.get('role_code')?.enable(); // Cho phép sửa role_code khi tạo mới
    this.viewMode.set('FORM');
  }

  openUpdateForm(role: any) {
    this.isUpdateMode.set(true);
    this.roleForm.patchValue({
      id: role.id,
      role_code: role.roleCode,
      role_name: role.roleName,
      list_permission: role.listPermission ? [...role.listPermission] : [],
    });
    // Không cho đổi mã vai trò khi đã tạo
    this.roleForm.get('role_code')?.disable();
    this.viewMode.set('FORM');
  }

  // --- THÊM & CẬP NHẬT ---
  onSubmit() {
    if (this.roleForm.invalid) {
      this.toast.warning('Vui lòng điền đầy đủ thông tin hợp lệ', 'Cảnh báo');
      return;
    }

    this.isLoading.set(true);
    // Lấy value bao gồm cả trường disable
    const formVal = this.roleForm.getRawValue();

    const requestObj = {
      role_code: formVal.role_code,
      role_name: formVal.role_name,
      list_permission: formVal.list_permission,
    };

    if (this.isUpdateMode()) {
      this.roleService.updateRole(requestObj).subscribe({
        next: () => {
          this.toast.success('Cập nhật thông tin nhóm quyền thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.viewMode.set('LIST');
          this.getRoles();
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
    } else {
      this.roleService.addRole(requestObj).subscribe({
        next: () => {
          this.toast.success('Thêm nhóm quyền mới thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.viewMode.set('LIST');
          this.getRoles();
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

  // --- XÓA ROLE ---
  deleteRole(id: string) {
    if (
      confirm(
        'Cảnh báo: Bạn có chắc chắn muốn xóa Nhóm quyền này? Mọi tài khoản đang dùng nhóm quyền này có thể bị ảnh hưởng!',
      )
    ) {
      this.isLoading.set(true);
      this.roleService.deleteRole({ id: id }).subscribe({
        next: () => {
          this.toast.success('Xóa nhóm quyền thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.getRoles();
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

  // --- CHI TIẾT ROLE ---
  openDetail(id: string) {
    this.isLoading.set(true);
    this.roleService.getRole({ id: id }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.selectedRole.set(res);
        this.isDetailModalOpen.set(true);
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
