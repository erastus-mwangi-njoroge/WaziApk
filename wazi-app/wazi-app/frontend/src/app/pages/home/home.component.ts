import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ListingsService } from '../../core/listings.service';
import { HOUSE_TYPES, townMatches } from '../../core/models';
import { TownSelectComponent } from '../../shared/town-select.component';
import { ListingCardComponent } from '../../shared/listing-card.component';

type SortOption = 'newest' | 'price-asc' | 'price-desc';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, ListingCardComponent, TownSelectComponent],
  template: `
    <main>
      <section class="hero">
        <div class="wrap hero-inner">
          <div class="eyebrow">Vacant houses across Kenya</div>
          <h1>Find a <em>vacant</em> house<br />near what matters to you.</h1>
          <p>Browse rooms, bedsitters, family houses and shops with real distances to schools, hospitals, roads, police posts and industry — with real photos from verified owners.</p>

          <div class="search-card">
            <div class="field">
              <label>Town / area</label>
              <app-town-select [(value)]="filterTown" [includeAny]="true" anyLabel="Any location" />
            </div>
            <div class="field">
              <label>House type</label>
              <select [(ngModel)]="filterType">
                <option value="Any">Any type</option>
                @for (t of houseTypes; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Max price (KSh)</label>
              <input type="number" min="0" placeholder="e.g. 20000" [(ngModel)]="filterMaxPrice" />
            </div>
            <button class="search-btn" (click)="refresh()">Search</button>
          </div>
        </div>
      </section>

      <div class="wrap">
        <div class="chip-row">
          @for (t of ['Any'].concat(houseTypes); track t) {
            <button class="chip" [class.active]="filterType === t" (click)="filterType = t; refresh()">{{ t }}</button>
          }
        </div>

        <div class="section-head">
          <h2>Available now</h2>
          <div style="display:flex;align-items:center;gap:14px;">
            <span class="result-count">{{ filtered().length }} listing{{ filtered().length === 1 ? '' : 's' }}</span>
            <select class="sort-select" [(ngModel)]="sort" (ngModelChange)="refresh()">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
        </div>

        @if (listings.loading() && listings.listings().length === 0) {
          <div class="spinner-wrap">Loading WAZI…</div>
        } @else if (filtered().length === 0) {
          <div class="empty">
            <h3>No listings match yet</h3>
            <p>Try widening your filters, or check back soon — owners add new vacancies often.</p>
          </div>
        } @else {
          <div class="grid">
            @for (l of filtered(); track l.id) {
              <app-listing-card [listing]="l" [isFavorite]="auth.isFavorite(l.id)" (toggleFavorite)="onToggleFavorite($event)" />
            }
          </div>
        }
      </div>
    </main>
  `,
})
export class HomeComponent implements OnInit {
  listings = inject(ListingsService);
  auth = inject(AuthService);
  private router = inject(Router);

  houseTypes = HOUSE_TYPES;

  filterTown = 'Any';
  filterType = 'Any';
  filterMaxPrice = '';
  sort = signal<SortOption>('newest');

  filtered = computed(() => {
    let items = this.listings.listings().filter((l) => {
      if (this.filterType !== 'Any' && l.type !== this.filterType) return false;
      if (!townMatches(this.filterTown, l.town)) return false;
      if (this.filterMaxPrice && l.price > Number(this.filterMaxPrice)) return false;
      return true;
    });
    const s = this.sort();
    if (s === 'price-asc') items = [...items].sort((a, b) => a.price - b.price);
    else if (s === 'price-desc') items = [...items].sort((a, b) => b.price - a.price);
    else items = [...items].sort((a, b) => b.datePosted - a.datePosted);
    return items;
  });

  async ngOnInit(): Promise<void> {
    if (this.listings.listings().length === 0) {
      await this.listings.loadAll();
    }
  }

  refresh(): void {
    // filtering/sorting is computed reactively — this just exists as an explicit
    // "Search" affordance for the button; re-triggers change detection via signal write.
    this.sort.set(this.sort());
  }

  async onToggleFavorite(id: string): Promise<void> {
    if (!this.auth.user()) {
      this.router.navigate(['/auth'], { queryParams: { role: 'tenant' } });
      return;
    }
    await this.auth.toggleFavorite(id);
  }
}
