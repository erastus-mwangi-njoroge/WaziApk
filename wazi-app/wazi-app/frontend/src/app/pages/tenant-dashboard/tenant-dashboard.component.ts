import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ListingsService } from '../../core/listings.service';
import { HOUSE_TYPES, timeAgo } from '../../core/models';
import { TownSelectComponent } from '../../shared/town-select.component';
import { NotificationsService } from '../../core/notifications.service';
import { PreferencesService } from '../../core/preferences.service';
import { ListingCardComponent } from '../../shared/listing-card.component';

type Tab = 'saved' | 'prefs' | 'notifs';

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [FormsModule, ListingCardComponent, TownSelectComponent],
  template: `
    @if (!auth.user() || auth.user()!.role !== 'tenant') {
      <main class="wrap"><div class="empty"><h3>Tenant sign-in required</h3><p>Sign in as a tenant to save homes and set alerts.</p></div></main>
    } @else {
      <main class="wrap">
        <div class="dash-head">
          <h1 style="font-size:28px;">Saved homes &amp; alerts</h1>
          <div class="form-note">Set what you're looking for and we'll notify you the moment a matching house is listed as vacant.</div>
        </div>
        <div class="dash-tabs">
          <button class="dash-tab" [class.active]="tab() === 'saved'" (click)="tab.set('saved')">Saved homes</button>
          <button class="dash-tab" [class.active]="tab() === 'prefs'" (click)="tab.set('prefs')">My preferences</button>
          <button class="dash-tab" [class.active]="tab() === 'notifs'" (click)="tab.set('notifs')">
            Notifications
            @if (notifications.unreadCount() > 0) { <span class="badge" style="background:var(--rust);color:#fff;">{{ notifications.unreadCount() }}</span> }
          </button>
        </div>

        @switch (tab()) {
          @case ('saved') {
            @if (saved().length === 0) {
              <div class="empty"><h3>No saved homes yet</h3><p>Tap the heart on any listing to save it here.</p></div>
            } @else {
              <div class="grid">
                @for (l of saved(); track l.id) {
                  <app-listing-card [listing]="l" [isFavorite]="true" (toggleFavorite)="auth.toggleFavorite($event)" />
                }
              </div>
            }
          }
          @case ('prefs') {
            <div class="pref-card">
              <h3 style="font-size:17px;margin-bottom:14px;">Alert me when a matching house is vacant</h3>
              @if (prefMessage()) { <div class="form-note" style="color:var(--green-dark); margin-bottom:12px;">{{ prefMessage() }}</div> }
              <form (ngSubmit)="savePrefs()">
                <div class="form-group">
                  <label>Preferred town/area</label>
                  <app-town-select [(value)]="prefTown" [includeAny]="true" anyLabel="Any location" />
                </div>
                <div class="form-group">
                  <label>House type</label>
                  <select name="ptype" [(ngModel)]="prefType">
                    <option value="Any">Any type</option>
                    @for (t of houseTypes; track t) { <option [value]="t">{{ t }}</option> }
                  </select>
                </div>
                <div class="form-row">
                  <div class="form-group"><label>Min price (KSh)</label><input type="number" min="0" name="pmin" [(ngModel)]="prefMin" /></div>
                  <div class="form-group"><label>Max price (KSh)</label><input type="number" min="0" name="pmax" [(ngModel)]="prefMax" /></div>
                </div>
                <button type="submit" class="btn-primary">Save preferences</button>
                <div class="form-note">We check every new listing against this and notify you right away when one matches.</div>
              </form>
            </div>
          }
          @case ('notifs') {
            @if (notifications.notifications().length === 0) {
              <div class="empty"><h3>No notifications yet</h3><p>Set your preferences and we'll let you know when a matching house opens up.</p></div>
            } @else {
              <div style="max-width:600px;">
                @for (n of notifications.notifications(); track n.id) {
                  <div class="notif-item" [class.read]="n.read" (click)="openNotif(n.listingId)">
                    <div class="notif-dot"></div>
                    <div>
                      <div class="notif-text">{{ n.message }}</div>
                      <div class="notif-time">{{ timeAgo(n.date) }}</div>
                    </div>
                  </div>
                }
              </div>
            }
          }
        }
      </main>
    }
  `,
})
export class TenantDashboardComponent implements OnInit {
  auth = inject(AuthService);
  listings = inject(ListingsService);
  preferences = inject(PreferencesService);
  notifications = inject(NotificationsService);
  private router = inject(Router);

  tab = signal<Tab>('saved');
  houseTypes = HOUSE_TYPES;
  timeAgo = timeAgo;

  prefTown = 'Any';
  prefType = 'Any';
  prefMin = '';
  prefMax = '';
  prefMessage = signal('');

  saved = computed(() => {
    const favIds = this.auth.user()?.favIds ?? [];
    return this.listings.listings().filter((l) => favIds.includes(l.id));
  });

  async ngOnInit(): Promise<void> {
    const u = this.auth.user();
    if (!u) return;
    if (this.listings.listings().length === 0) await this.listings.loadAll();
    await this.preferences.load(u.uid);
    const p = this.preferences.prefs();
    this.prefTown = p.town;
    this.prefType = p.type;
    this.prefMin = p.minPrice;
    this.prefMax = p.maxPrice;
    await this.notifications.load(u.uid);
    await this.notifications.markAllRead();
  }

  async savePrefs(): Promise<void> {
    const u = this.auth.user();
    if (!u) return;
    const err = await this.preferences.save(u.uid, { town: this.prefTown, type: this.prefType, minPrice: this.prefMin, maxPrice: this.prefMax });
    this.prefMessage.set(err ?? "Saved — we'll alert you when a match appears.");
  }

  openNotif(listingId: string | null): void {
    if (listingId) this.router.navigate(['/listing', listingId]);
  }
}
