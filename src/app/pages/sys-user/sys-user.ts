import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
// Giả định bạn đã tạo UserService với các phương thức tương ứng cURL
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { SysUserService } from '../../core/services/sys-user.service';
import { SysRole } from '../sys-role/sys-role';
import { RoleService } from '../../core/services/role.service';
import { Role } from '../../core/models/role-info.model';
import { HouseRoomManagementService } from '../../core/services/house-room-management.service';

@Component({
  selector: 'app-sys-user',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './sys-user.html',
  styleUrl: './sys-user.scss',
})
export class SysUser implements OnInit {
  private fb = inject(FormBuilder);
  private toast = inject(ToastrService);
  private userService = inject(SysUserService);
  private roleService = inject(RoleService);
  private houseService = inject(HouseRoomManagementService);

  // --- STATE QUẢN LÝ GIAO DIỆN ---
  viewMode = signal<'LIST' | 'FORM'>('LIST');
  isUpdateMode = signal(false);
  isLoading = signal(false);
  isFilterExpanded = signal(false);

  // --- DỮ LIỆU ---
  listUsers = signal<any[]>([]);
  totalPages = signal(1);
  totalElements = signal(0);
  pageNumber = signal(0);
  pageSize = signal(10);

  // --- FORMS ---
  searchForm!: FormGroup;
  userForm!: FormGroup;

  // --- MODALS ---
  selectedUser = signal<any>(null);
  isDetailModalOpen = signal(false);

  isLockModalOpen = signal(false);
  lockCountInput = signal<number>(10); // Mặc định như cURL là 3
  reasonLockUser = signal<string>('');

  listRole = signal<any[]>([]);

  ngOnInit() {
    this.initSearchForm();
    this.initUserForm();
    this.getListRole();
    this.getUsers();
  }

  initSearchForm() {
    this.searchForm = this.fb.group({
      username: [''],
      name: [''],
      email: [''],
      phoneNumber: [''],
      role: [null],
      isLockLogin: [null],
      startDate: [null],
      endDate: [null],
    });
  }

  initUserForm() {
    this.userForm = this.fb.group({
      id: [null],
      username: ['', Validators.required],
      password: [''],
      confirm_password: [''], // Thêm trường nhập lại mật khẩu
      old_password: [''],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', Validators.required],
      role: ['ROLE_USER', Validators.required],
      is_lock_login: [false],
    });
  }

  getListRole() {
    this.isLoading.set(true);

    this.roleService
      .findRolePublic({
        pageNumber: 0,
        pageSize: 10,
        requestParam: {},
      })
      .subscribe({
        next: (res: any) => {
          this.isLoading.set(false);
          this.listRole.set(res.page?.content || []);
          console.log('listRole:', this.listRole);
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

  getRole(roleCode: string) {
    return this.listRole().find((role) => role.roleCode === roleCode);
  }

  // --- TÌM KIẾM & PHÂN TRANG ---
  onSearch() {
    this.pageNumber.set(0);
    this.getUsers();
  }

  onResetSearch() {
    this.searchForm.reset();
    this.pageNumber.set(0);
    this.getUsers();
  }

  getUsers() {
    this.isLoading.set(true);
    const rawValue = this.searchForm.value;

    // Lọc bỏ các trường rỗng
    const requestParam: any = {};
    Object.keys(rawValue).forEach((key) => {
      if (rawValue[key] !== null && rawValue[key] !== '') {
        // API nhận mảng cho role
        if (key === 'role') requestParam[key] = [rawValue[key]];
        else requestParam[key] = rawValue[key];
      }
    });

    const payload = {
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      requestParam: requestParam,
    };

    this.userService.findUser(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.listUsers.set(res.page?.content || []);
        // if (this.listUsers().length !== 0) {
        //   this.listUsers().forEach((user) => {
        //     let avatar =
        //       'https://ui-avatars.com/api/?name=' + user.name + '&background=10b981&color=fff';
        //     if (user?.urlImage) {
        //       this.houseService.getImageRoom(user?.urlImage).subscribe({
        //         next: (blob: any) => {
        //           const objectUrl = URL.createObjectURL(blob);
        //           avatar = objectUrl;
        //           user.avatar = avatar; // Gán URL ảnh vào đối tượng user
        //         },
        //         error: (err) => {
        //           this.toast.error(err.error?.message, 'Lỗi', {
        //             timeOut: 3000,
        //             progressBar: true,
        //             positionClass: 'toast-top-right',
        //           });
        //         },
        //       });
        //     }
        //   });
        // }
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
      this.getUsers();
    }
  }

  // --- CHUYỂN ĐỔI FORM ---
  openAddForm() {
    this.isUpdateMode.set(false);
    this.userForm.reset({ role: 'ROLE_USER', is_lock_login: false });
    // Yêu cầu nhập password khi tạo mới
    this.userForm.get('password')?.setValidators([Validators.required]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.viewMode.set('FORM');
  }

  openUpdateForm(user: any) {
    this.isUpdateMode.set(true);
    // Bỏ yêu cầu nhập pass, nếu có nhập thì mới update
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();

    this.userForm.patchValue({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone_number: user.phoneNumber,
      role: user.role,
      is_lock_login: user.isLockLogin,
    });
    this.viewMode.set('FORM');
  }

  // --- THÊM & CẬP NHẬT ---
  onSubmit() {
    if (this.userForm.invalid) {
      this.toast.warning('Vui lòng điền đầy đủ thông tin hợp lệ', 'Cảnh báo');
      return;
    }

    const formVal = this.userForm.value;
    if (formVal.password !== formVal.confirm_password) {
      this.toast.error('Mật khẩu nhập lại không khớp!', 'Lỗi');
      return;
    }

    this.isLoading.set(true);

    let requestObj: any = {
      username: formVal.username,
      name: formVal.name,
      email: formVal.email,
      phone_number: formVal.phone_number,
      role: formVal.role,
    };

    // Chuẩn bị FormData theo chuẩn cURL
    const formData = new FormData();

    if (this.isUpdateMode()) {
      // UPDATE
      if (formVal.password && formVal.old_password) {
        requestObj.old_password = formVal.old_password;
        requestObj.new_password = formVal.password;
      }
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObj)], { type: 'application/json' }),
      );

      this.userService.updateUser(formData).subscribe({
        next: () => {
          this.toast.success('Cập nhật thông tin tài khoản thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.viewMode.set('LIST');
          this.getUsers();
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
      // ADD
      requestObj.password = formVal.password;
      requestObj.is_lock_login = formVal.is_lock_login;
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObj)], { type: 'application/json' }),
      );

      this.userService.addUser(formData).subscribe({
        next: () => {
          this.toast.success('Tạo tài khoản mới thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.viewMode.set('LIST');
          this.getUsers();
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

  // --- XÓA USER ---
  deleteUser(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này vĩnh viễn?')) {
      this.isLoading.set(true);
      this.userService.deleteUser({ id: id }).subscribe({
        next: () => {
          // this.toast.success('Xóa người dùng thành công');
          this.toast.success('Xóa tài khoản thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.getUsers();
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

  // --- KHÓA / MỞ KHÓA USER ---
  openLockModal(user: any) {
    this.selectedUser.set(user);
    this.lockCountInput.set(10); // Default
    this.isLockModalOpen.set(true);
  }

  confirmLockUser() {
    this.isLoading.set(true);
    const payload = {
      id: this.selectedUser().id,
      count_locked_until: this.lockCountInput(),
      reason: this.reasonLockUser(),
    };

    this.userService.lockUser(payload).subscribe({
      next: () => {
        this.toast.success('Khóa tài khoản thành công!', 'Thành công', {
          timeOut: 3000,
          progressBar: true,
          positionClass: 'toast-top-right',
        });
        this.isLockModalOpen.set(false);
        this.getUsers();
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

  unlockUser(user: any) {
    if (confirm(`Bạn có chắc muốn mở khóa cho tài khoản ${user.username}?`)) {
      this.isLoading.set(true);
      this.userService.unlockUser({ id: user.id }).subscribe({
        next: () => {
          this.toast.success('Mở khóa tài khoản thành công!', 'Thành công', {
            timeOut: 3000,
            progressBar: true,
            positionClass: 'toast-top-right',
          });
          this.getUsers();
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

  // --- CHI TIẾT USER ---
  openDetail(id: string) {
    this.isLoading.set(true);
    this.userService.getUser({ id: id }).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.selectedUser.set(res); // Giả sử response trả về Object user
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
