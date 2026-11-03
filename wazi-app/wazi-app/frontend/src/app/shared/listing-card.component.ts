import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Listing, fmtPrice } from '../core/models';
import { AmenityRadarComponent } from './amenity-radar.component';

@Component({
  selector: 'app-listing-card',
  standalone: true,
  imports: [RouterLink, AmenityRadarComponent],
  template: `
    <article class="card" [routerLink]="['/listing', listing.id]">
      <div class="card-media">
        @if (listing.premiseImage) {
          <img [src]="listing.premiseImage" [alt]="listing.title" loading="lazy" />
        } @else {
          <div class="no-photo">No photo yet</div>
        }
        <div class="card-badge" [class.occupied]="listing.status === 'occupied'">
          {{ listing.status === 'occupied' ? 'Occupied' : 'Vacant' }}
        </div>
        <button class="fav-btn" [class.saved]="isFavorite" (click)="onFavClick($event)" aria-label="Save listing">
          {{ isFavorite ? '♥' : '♡' }}
        </button>
        <div class="card-radar">
          <app-amenity-radar [amenities]="listing.amenities" [size]="54" />
        </div>
      </div>
      <div class="card-body">
        <div class="card-type">{{ listing.type }}</div>
        <div class="card-title">{{ listing.title }}</div>
        <div class="card-loc">{{ listing.town }}</div>
        <div class="card-price">{{ fmtPrice(listing.price) }} <span>/ month</span></div>
        <div class="card-dist">
          <span class="dist-tag">🎓 {{ listing.amenities.schoolKm }} km</span>
          <span class="dist-tag">⚕ {{ listing.amenities.hospitalKm }} km</span>
          <span class="dist-tag">🛣 {{ listing.amenities.roadType }}</span>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .card { display:block; background:var(--card); border:1px solid var(--line); border-radius:14px; overflow:hidden; box-shadow:var(--shadow); cursor:pointer; text-decoration:none; color:inherit; transition:transform .15s ease, box-shadow .15s ease; }
    .card:hover { transform:translateY(-3px); box-shadow:0 14px 30px rgba(34,40,31,0.16); }
    .card-media { position:relative; height:170px; background:var(--paper-2); }
    .card-media img { width:100%; height:100%; object-fit:cover; display:block; }
    .no-photo { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--ink-soft); font-size:13px; }
    .card-badge { position:absolute; top:10px; left:10px; background:var(--amber); color:var(--ink); font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.04em; padding:5px 10px; border-radius:999px; }
    .card-badge.occupied { background:var(--ink-soft); color:#fff; }
    .fav-btn { position:absolute; top:9px; right:9px; width:32px; height:32px; border-radius:50%; border:none; background:rgba(255,253,246,0.9); font-size:16px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .fav-btn.saved { color:var(--rust); }
    .card-radar { position:absolute; bottom:9px; right:9px; background:rgba(255,253,246,0.92); border-radius:10px; padding:3px; line-height:0; }
    .card-body { padding:14px 16px 16px; }
    .card-type { font-size:11.5px; text-transform:uppercase; letter-spacing:0.05em; color:var(--green-dark); font-weight:700; }
    .card-title { font-size:17px; margin-top:3px; font-family:'Fraunces',serif; font-weight:600; }
    .card-loc { font-size:13px; color:var(--ink-soft); margin-top:2px; }
    .card-price { margin-top:10px; font-family:'IBM Plex Mono',monospace; font-size:17px; font-weight:600; }
    .card-price span { font-size:12px; color:var(--ink-soft); font-weight:400; }
    .card-dist { display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; }
    .dist-tag { font-size:11.5px; color:var(--ink-soft); }
  `],
})
export class ListingCardComponent {
  @Input({ required: true }) listing!: Listing;
  @Input() isFavorite = false;
  @Output() toggleFavorite = new EventEmitter<string>();

  fmtPrice = fmtPrice;

  onFavClick(ev: MouseEvent): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.toggleFavorite.emit(this.listing.id);
  }
}
