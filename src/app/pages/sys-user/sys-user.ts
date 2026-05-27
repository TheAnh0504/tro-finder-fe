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
  lockCountInput = signal<number>(3); // Mặc định như cURL là 3

  ngOnInit() {
    this.initSearchForm();
    this.initUserForm();
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
        this.totalPages.set(res.page?.totalPages || 1);
        this.totalElements.set(res.page?.totalElements || 0);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message || 'Lỗi lấy danh sách user', 'Lỗi');
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
          this.toast.success('Cập nhật người dùng thành công!');
          this.viewMode.set('LIST');
          this.getUsers();
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi cập nhật');
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
          this.toast.success('Thêm người dùng thành công!');
          this.viewMode.set('LIST');
          this.getUsers();
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi thêm mới');
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
          this.toast.success('Xóa người dùng thành công');
          this.getUsers();
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi xóa user');
        },
      });
    }
  }

  // --- KHÓA / MỞ KHÓA USER ---
  openLockModal(user: any) {
    this.selectedUser.set(user);
    this.lockCountInput.set(3); // Default
    this.isLockModalOpen.set(true);
  }

  confirmLockUser() {
    this.isLoading.set(true);
    const payload = {
      id: this.selectedUser().id,
      count_locked_until: this.lockCountInput(),
    };

    this.userService.lockUser(payload).subscribe({
      next: () => {
        this.toast.success('Đã khóa tài khoản thành công');
        this.isLockModalOpen.set(false);
        this.getUsers();
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.toast.error(err.error?.message, 'Lỗi khóa tài khoản');
      },
    });
  }

  unlockUser(user: any) {
    if (confirm(`Bạn có chắc muốn mở khóa cho tài khoản ${user.username}?`)) {
      this.isLoading.set(true);
      this.userService.unlockUser({ id: user.id }).subscribe({
        next: () => {
          this.toast.success('Mở khóa tài khoản thành công');
          this.getUsers();
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.toast.error(err.error?.message, 'Lỗi mở khóa');
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
        this.toast.error('Không lấy được thông tin chi tiết', 'Lỗi');
      },
    });
  }
}
