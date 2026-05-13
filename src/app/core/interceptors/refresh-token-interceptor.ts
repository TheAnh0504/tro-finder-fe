import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return authService.refreshToken().pipe(
          switchMap((res: any) => {
            tokenService.setTokens(res.access_token, res.refresh_token);

            const clonedReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${res.access_token}`,
              },
            });

            return next(clonedReq);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
