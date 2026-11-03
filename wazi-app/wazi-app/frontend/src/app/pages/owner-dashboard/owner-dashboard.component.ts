import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ListingsService } from '../../core/listings.service';
import { fmtPrice } from '../../core/models';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (!auth.user() || auth.user()!.role !== 'owner') {
      <main class="wrap"><div class="empty"><h3>Owner sign-in required</h3><p>Sign in as an owner to manage listings.</p></div></main>
    } @else {
      <main class="wrap">
        <div class="dash-head">
          <h1 style="font-size:28px;">Owner dashboard</h1>
          <div class="form-note">Manage the houses you've listed and see how they appear to tenants.</div>
        </div>
        <div class="dash-tabs">
          <span class="dash-tab active">My listings ({{ mine().length }})</span>
          <a class="dash-tab" routerLink="/owner/add">+ Add a listing</a>
        </div>

        @if (mine().length === 0) {
          <div class="empty"><h3>No listings yet</h3><p>Add your first vacant house so tenants nearby can find it.</p></div>
        } @else {
          @for (l of mine(); track l.id) {
            <div class="my-listing-row">
              @if (l.premiseImage) {
                <img [src]="l.premiseImage" alt="" />
              } @else {
                <div class="my-listing-noimg"></div>
              }
              <div class="my-listing-info">
                <h4>{{ l.title }}</h4>
                <div class="my-listing-meta">{{ l.town }} · {{ l.type }} · {{ fmtPrice(l.price) }}/mo · {{ l.status === 'vacant' ? 'Vacant' : 'Occupied' }}</div>
              </div>
              <div class="row-actions">
                <a class="pill-btn" [routerLink]="['/listing', l.id]">View</a>
                <button class="pill-btn" [class.on]="l.status === 'vacant'" (click)="listings.setStatus(l.id, l.status === 'vacant' ? 'occupied' : 'vacant')">
                  {{ l.status === 'vacant' ? 'Vacant' : 'Mark vacant' }}
                </button>
                <button class="pill-btn danger" (click)="del(l.id)">Delete</button>
              </div>
            </div>
          }
        }
      </main>
    }
  `,
})
export class OwnerDashboardComponent implements OnInit {
  auth = inject(AuthService);
  listings = inject(ListingsService);
  fmtPrice = fmtPrice;

  mine = computed(() => {
    const u = this.auth.user();
    if (!u) return [];
    return this.listings.listings().filter((l) => l.ownerId === u.uid);
  });

  async ngOnInit(): Promise<void> {
    if (this.listings.listings().length === 0) await this.listings.loadAll();
  }

  async del(id: string): Promise<void> {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    await this.listings.remove(id);
  }
}
