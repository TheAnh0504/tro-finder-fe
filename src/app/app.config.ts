import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { refreshTokenInterceptor } from './core/interceptors/refresh-token-interceptor';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor, refreshTokenInterceptor])),
    provideAnimations(), // Bắt buộc phải có cho ngx-toastr
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      // 1. Cho phép các thông báo trùng nội dung hiện cùng lúc
      preventDuplicates: false,
      // 2. Giới hạn hiển thị tối đa (ví dụ: 3 cái cùng lúc)
      maxOpened: 3,
      // 3. Nếu vượt quá 3 cái, tự động đẩy cái cũ nhất biến mất
      autoDismiss: true,
    }),
  ],
};
