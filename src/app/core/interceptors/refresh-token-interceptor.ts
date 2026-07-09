import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { InfoUser } from '../models/info-user.model';
import { Router } from '@angular/router';

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return authService.refreshToken().pipe(
          switchMap((res: any) => {
            const currentUser: InfoUser = {
              role: res.role,
              name: res.name,
              email: res.email,
              phoneNumber: res.phoneNumber,
              urlImage: res.urlImage,
              isOcr: res.isOcr,
              isRent: res.isRent,
            };
            tokenService.setTokens(res.access_token, res.listPermission, currentUser);

            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access_token}`,
              },
            });
            // router.navigate(['/home']);
            return next(clonedReq);
          }),
        );
      }

      return throwError(() => {
        if (error.error.status_code === '1034') {
          tokenService.clear();
          router.navigate(['/login']);
          return error;
        } else {
          return error;
        }
      });
    }),
  );
};
