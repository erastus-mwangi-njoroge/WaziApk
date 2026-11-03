import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { NotificationsService } from './core/notifications.service';
import { ToastService } from './core/toast.service';
import { BrandLogoComponent } from './shared/brand-logo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, BrandLogoComponent],
  template: `
    <div class="shell">
      <header class="nav">
        <div class="wrap nav-inner">
          <a class="brand" routerLink="/">
            <app-brand-logo class="brand-mark" />
            <div class="brand-name">wazi</div>
            <div class="brand-tag">nyumba wazi, karibu nyumbani</div>
          </a>
          <div class="nav-links">
            @if (auth.user(); as u) {
              @if (u.role === 'owner') {
                <a class="nav-btn" routerLink="/owner">My listings</a>
              }
              @if (u.role === 'tenant') {
                <a class="nav-btn" routerLink="/tenant">
                  Saved &amp; alerts
                  @if (unread() > 0) { <span class="badge">{{ unread() }}</span> }
                </a>
              }
              <div class="nav-user">
                <div class="avatar">{{ initial() }}</div>
                <button class="nav-btn" (click)="logout()">Log out</button>
              </div>
            } @else {
              <a class="nav-cta" routerLink="/auth" [queryParams]="{ role: 'owner' }">List a house</a>
              <a class="nav-btn" routerLink="/auth" [queryParams]="{ role: 'tenant' }">Sign in</a>
            }
          </div>
        </div>
      </header>

      <router-outlet />

      <footer class="site-footer">
        <div class="wrap footer-inner">
          <div class="brand">
            <app-brand-logo class="brand-mark" />
            <div class="brand-name" style="font-size:18px;">wazi</div>
          </div>
          <div class="footer-note">WAZI connects tenants with vacant houses across Kenya. Listings and photos are provided by owners, backed by Firebase.</div>
        </div>
      </footer>

      @if (toast.message(); as msg) {
        <div class="toast">{{ msg }}</div>
      }
    </div>
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  notifications = inject(NotificationsService);
  toast = inject(ToastService);
  private router = inject(Router);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  unread = computed(() => this.notifications.notifications().filter((n) => !n.read).length);
  initial = computed(() => (this.auth.user()?.name || 'U').slice(0, 1).toUpperCase());

  async ngOnInit(): Promise<void> {
    await this.auth.ready;
    if (this.auth.user()?.role === 'tenant') {
      this.notifications.load(this.auth.user()!.uid);
    }
    this.pollTimer = setInterval(() => {
      const u = this.auth.user();
      if (u?.role === 'tenant') this.notifications.load(u.uid);
    }, 20000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.notifications.reset();
    this.router.navigateByUrl('/');
  }
}
