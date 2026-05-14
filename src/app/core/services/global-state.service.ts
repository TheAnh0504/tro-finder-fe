import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GlobalStateService {
  // Khai báo các biến toàn cục ở đây bằng signal
  public userToken = signal<string | null>(null);
  public currentUserInfo = signal<any>(null);

  constructor() {}

  // Bạn có thể viết thêm các hàm tiện ích nếu muốn
  clearState() {
    this.userToken.set(null);
    this.currentUserInfo.set(null);
  }

  // Inject service vào component
  // private globalState = inject(GlobalStateService);

  // loginSuccess(token: string, userInfo: any) {
  //   // Lưu dữ liệu vào biến toàn cục
  //   this.globalState.userToken.set(token);
  //   this.globalState.currentUserInfo.set(userInfo);
  // }
  // Đọc giá trị
  // const token = this.globalState.userToken();
  // console.log('Token lấy từ toàn cục:', token);
}
