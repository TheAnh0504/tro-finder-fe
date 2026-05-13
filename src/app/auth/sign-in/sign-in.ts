import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  form = this.fb.group({
    username: [''],
    password: [''],
  });

  login() {
    this.authService.login(this.form.value).subscribe({
      next: (res: any) => {
        this.tokenService.setTokens(res.access_token, res.listPermission);

        this.router.navigate(['/home']);
      },
    });
  }
}
