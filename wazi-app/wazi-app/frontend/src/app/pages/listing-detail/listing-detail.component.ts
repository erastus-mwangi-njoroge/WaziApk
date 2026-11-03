import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ListingsService } from '../../core/listings.service';
import { AMENITY_AXES, Listing, fmtPrice, timeAgo } from '../../core/models';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  template: `
    @if (loading()) {
      <main class="wrap"><div class="spinner-wrap">Loading listing…</div></main>
    } @else if (!listing()) {
      <main class="wrap"><div class="empty"><h3>Listing not found</h3></div></main>
    } @else {
      <main class="wrap">
        <div class="detail-head">
          <button class="back-link" (click)="back()">← Back to listings</button>
          <div class="gallery">
            <div class="gallery-main">
              @if (listing()!.premiseImage) {
                <img [src]="listing()!.premiseImage" alt="Premise photo" />
              } @else {
                <div class="no-photo-big">No photo yet</div>
              }
              <div class="premise-label">🏠 Whole premise</div>
            </div>
            <div class="gallery-side">
              @for (img of listing()!.interiorImages.slice(0, 4); track img) {
                <img [src]="img" alt="Interior photo" />
              }
              @if (listing()!.interiorImages.length === 0) {
                <div class="no-photo-side">No interior photos yet</div>
              }
            </div>
          </div>
        </div>

        <div class="detail-grid">
          <div>
            <div class="detail-title-row">
              <div>
                <h1>{{ listing()!.title }}</h1>
                <div class="detail-loc">{{ listing()!.town }} · {{ listing()!.type }}</div>
                <div class="status-pill" [class.vacant]="listing()!.status === 'vacant'" [class.occupied]="listing()!.status === 'occupied'">
                  {{ listing()!.status === 'vacant' ? '● Vacant now' : 'Currently occupied' }}
                </div>
              </div>
              <button class="fav-btn static" (click)="toggleFav()" aria-label="Save">{{ isFav() ? '♥' : '♡' }}</button>
            </div>
            <p class="detail-desc">{{ listing()!.desc }}</p>
            <div class="divider"></div>
            <h3 style="font-size:17px;margin-bottom:14px;">What's nearby</h3>
            <div class="amenity-panel">
              <div class="amenity-list">
                @for (a of axes; track a.key) {
                  <div class="amenity-row">
                    <div class="a-name">{{ a.icon }} {{ a.label }}</div>
                    <div class="a-val">{{ listing()!.amenities[a.key] }} km</div>
                  </div>
                }
              </div>
              <div class="util-row">
                <span class="util-pill">💧 {{ listing()!.amenities.water }} water</span>
                <span class="util-pill">⚡ {{ listing()!.amenities.electricity ? 'Electricity connected' : 'No electricity' }}</span>
                <span class="util-pill">🛣 {{ listing()!.amenities.roadType }} access road</span>
              </div>
            </div>
          </div>

          <div>
            <div class="sidebar-card">
              <div class="price-big">{{ fmtPrice(listing()!.price) }} <span>/ month</span></div>
              <div class="form-note">Deposit: {{ fmtPrice(listing()!.deposit) }}</div>
              <div class="owner-row">
                <div class="avatar">{{ (listing()!.ownerName || 'O').slice(0, 1).toUpperCase() }}</div>
                <div>
                  <div class="owner-name">{{ listing()!.ownerName }}</div>
                  <div class="owner-role">Property owner</div>
                </div>
              </div>

              @if (isOwner()) {
                <button class="btn-secondary" (click)="toggleStatus()">Mark as {{ listing()!.status === 'vacant' ? 'occupied' : 'vacant' }}</button>
                <button class="btn-secondary danger" (click)="remove()">Delete listing</button>
              } @else {
                <a class="btn-primary" [href]="'tel:' + listing()!.ownerPhone">Contact owner — {{ listing()!.ownerPhone }}</a>
                <button class="btn-secondary" (click)="toggleFav()">{{ isFav() ? 'Saved to your list' : 'Save this house' }}</button>
              }
              <div class="form-note" style="margin-top:14px;">Posted {{ timeAgo(listing()!.datePosted) }}.</div>
            </div>
          </div>
        </div>
      </main>
    }
  `,
})
export class ListingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private listingsService = inject(ListingsService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  listing = signal<Listing | null>(null);
  loading = signal(true);
  axes = AMENITY_AXES;
  fmtPrice = fmtPrice;
  timeAgo = timeAgo;

  isOwner = signal(false);
  isFav = signal(false);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const l = await this.listingsService.getById(id);
    this.listing.set(l);
    this.loading.set(false);
    this.syncFlags();
  }

  private syncFlags(): void {
    const l = this.listing();
    const u = this.auth.user();
    this.isOwner.set(!!l && !!u && u.uid === l.ownerId);
    this.isFav.set(!!l && this.auth.isFavorite(l.id));
  }

  back(): void {
    this.router.navigateByUrl('/');
  }

  async toggleFav(): Promise<void> {
    if (!this.auth.user()) {
      this.router.navigate(['/auth'], { queryParams: { role: 'tenant' } });
      return;
    }
    await this.auth.toggleFavorite(this.listing()!.id);
    this.syncFlags();
  }

  async toggleStatus(): Promise<void> {
    const l = this.listing();
    if (!l) return;
    const newStatus = l.status === 'vacant' ? 'occupied' : 'vacant';
    await this.listingsService.setStatus(l.id, newStatus);
    this.listing.set({ ...l, status: newStatus });
  }

  async remove(): Promise<void> {
    const l = this.listing();
    if (!l) return;
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    await this.listingsService.remove(l.id);
    this.toast.show('Listing deleted');
    this.router.navigateByUrl('/owner');
  }
}
