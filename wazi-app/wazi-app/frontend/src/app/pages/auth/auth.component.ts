import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="wrap" style="max-width:460px; padding-top:40px; padding-bottom:60px;">
      <div class="modal" style="box-shadow:none; padding:0;">
        <h2>{{ mode() === 'signin' ? 'Welcome back' : 'Join WAZI' }}</h2>
        <div class="modal-sub">
          {{ mode() === 'signin' ? 'Sign in to manage listings or your saved homes.' : 'Create an account to post houses or save your search.' }}
        </div>

        <div class="role-toggle">
          <button class="role-btn" [class.selected]="role() === 'tenant'" (click)="role.set('tenant')">I'm a tenant</button>
          <button class="role-btn" [class.selected]="role() === 'owner'" (click)="role.set('owner')">I'm an owner</button>
        </div>

        @if (error()) {
          <div class="form-error">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()">
          @if (mode() === 'signup') {
            <div class="form-group">
              <label>Full name</label>
              <input type="text" name="name" [(ngModel)]="name" placeholder="e.g. Wanjiru Kamau" required />
            </div>
          }
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" [(ngModel)]="email" placeholder="you&#64;example.com" required />
          </div>
          @if (mode() === 'signup') {
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" name="phone" [(ngModel)]="phone" placeholder="07xx xxx xxx" />
            </div>
          }
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" [(ngModel)]="password" placeholder="At least 6 characters" required minlength="6" />
          </div>
          <button type="submit" class="btn-primary" [disabled]="submitting()">
            {{ submitting() ? 'Please wait…' : mode() === 'signin' ? 'Sign in' : 'Create ' + role() + ' account' }}
          </button>
        </form>

        <div class="mode-toggle">
          @if (mode() === 'signin') {
            No account yet? <button (click)="mode.set('signup'); error.set('')">Sign up</button>
          } @else {
            Already registered? <button (click)="mode.set('signin'); error.set('')">Sign in</button>
          }
        </div>
      </div>
    </main>
  `,
})
export class AuthComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  role = signal<'owner' | 'tenant'>('tenant');
  mode = signal<'signin' | 'signup'>('signin');
  error = signal('');
  submitting = signal(false);

  name = '';
  email = '';
  phone = '';
  password = '';

  ngOnInit(): void {
    const r = this.route.snapshot.queryParamMap.get('role');
    if (r === 'owner' || r === 'tenant') this.role.set(r);
  }

  async submit(): Promise<void> {
    this.submitting.set(true);
    this.error.set('');
    const err =
      this.mode() === 'signin'
        ? await this.auth.login(this.email.trim(), this.password)
        : await this.auth.register(this.name.trim(), this.email.trim(), this.phone.trim(), this.password, this.role());
    this.submitting.set(false);
    if (err) {
      this.error.set(err);
      return;
    }
    const u = this.auth.user()!;
    this.toast.show(`Welcome, ${u.name.split(' ')[0] || u.email}!`);
    this.router.navigateByUrl(u.role === 'owner' ? '/owner' : '/');
  }
}
