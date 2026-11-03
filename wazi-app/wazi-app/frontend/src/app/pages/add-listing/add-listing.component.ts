import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ListingsService } from '../../core/listings.service';
import { Amenities, HOUSE_TYPES, TOWNS } from '../../core/models';
import { TownSelectComponent } from '../../shared/town-select.component';
import { ToastService } from '../../core/toast.service';

interface Preview {
  file: File;
  url: string;
}

@Component({
  selector: 'app-add-listing',
  standalone: true,
  imports: [FormsModule, TownSelectComponent],
  template: `
    <main class="wrap" style="max-width:680px; padding-bottom:60px;">
      <div class="dash-head"><h1 style="font-size:26px;">Add a listing</h1></div>

      @if (error()) {
        <div class="form-error">{{ error() }}</div>
      }

      <form (ngSubmit)="submit()">
        <div class="form-section-title">Photos</div>
        <div class="form-group">
          <label>Whole premise / compound photo — required</label>
          <div class="upload-box" [class.required]="!premise()" (click)="premiseInput.click()">
            {{ premise() ? 'Change premise photo' : 'Click to upload a photo of the whole compound/premise' }}
            <small>Tenants see this first — show the gate, exterior and surroundings.</small>
          </div>
          <input #premiseInput type="file" accept="image/*" style="display:none;" (change)="onPremiseChange($event)" />
          @if (premise(); as p) {
            <div class="preview-strip">
              <div class="preview-thumb"><img [src]="p.url" /><button type="button" (click)="premise.set(null)">✕</button></div>
            </div>
          }
        </div>

        <div class="form-group">
          <label>Interior photos — optional, up to 8</label>
          <div class="upload-box" (click)="interiorInput.click()">
            Click to add interior photos
            <small>Rooms, kitchen, bathroom — whatever helps a tenant picture living there.</small>
          </div>
          <input #interiorInput type="file" accept="image/*" multiple style="display:none;" (change)="onInteriorChange($event)" />
          @if (interior().length > 0) {
            <div class="preview-strip">
              @for (p of interior(); track p.url; let i = $index) {
                <div class="preview-thumb"><img [src]="p.url" /><button type="button" (click)="removeInterior(i)">✕</button></div>
              }
            </div>
          }
        </div>

        <div class="form-section-title">Details</div>
        <div class="form-row">
          <div class="form-group"><label>Title</label><input type="text" name="title" [(ngModel)]="title" required /></div>
          <div class="form-group">
            <label>House type</label>
            <select name="type" [(ngModel)]="type">
              @for (t of houseTypes; track t) { <option [value]="t">{{ t }}</option> }
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Town / area</label>
            <app-town-select [(value)]="town" />
          </div>
          <div class="form-group"><label>Monthly rent (KSh)</label><input type="number" name="price" min="0" [(ngModel)]="price" required /></div>
        </div>
        <div class="form-group"><label>Deposit (KSh)</label><input type="number" name="deposit" min="0" [(ngModel)]="deposit" /></div>
        <div class="form-group"><label>Description</label><textarea name="desc" [(ngModel)]="desc"></textarea></div>

        <div class="form-section-title">Nearby amenities (distance in km)</div>
        <div class="form-row">
          <div class="form-group"><label>🎓 School</label><input type="number" step="0.1" min="0" name="school" [(ngModel)]="schoolKm" /></div>
          <div class="form-group"><label>⚕ Hospital</label><input type="number" step="0.1" min="0" name="hospital" [(ngModel)]="hospitalKm" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>🚓 Police</label><input type="number" step="0.1" min="0" name="police" [(ngModel)]="policeKm" /></div>
          <div class="form-group"><label>🏭 Industry / CBD</label><input type="number" step="0.1" min="0" name="industry" [(ngModel)]="industryKm" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Road to nearest tarmac</label><input type="number" step="0.1" min="0" name="road" [(ngModel)]="roadKm" /></div>
          <div class="form-group">
            <label>Road type at the house</label>
            <select name="roadType" [(ngModel)]="roadType">
              <option value="Tarmac">Tarmac</option>
              <option value="Murram">Murram</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Water supply</label>
            <select name="water" [(ngModel)]="water">
              <option value="Piped">Piped</option>
              <option value="Borehole">Borehole</option>
              <option value="Tank">Tank</option>
            </select>
          </div>
          <div class="form-group" style="display:flex;align-items:end;">
            <label class="checkbox-row" style="margin-bottom:11px;"><input type="checkbox" name="electricity" [(ngModel)]="electricity" /> Electricity connected</label>
          </div>
        </div>

        <button type="submit" class="btn-primary" [disabled]="submitting()">{{ submitting() ? 'Publishing…' : 'Publish listing' }}</button>
        <div class="form-note">Your listing goes live immediately, and tenants with a matching alert are notified right away.</div>
      </form>
    </main>
  `,
})
export class AddListingComponent {
  private auth = inject(AuthService);
  private listingsService = inject(ListingsService);
  private router = inject(Router);
  private toast = inject(ToastService);

  houseTypes = HOUSE_TYPES;

  premise = signal<Preview | null>(null);
  interior = signal<Preview[]>([]);
  error = signal('');
  submitting = signal(false);

  title = '';
  type = HOUSE_TYPES[0];
  town = TOWNS[0];
  price = '';
  deposit = '';
  desc = '';
  schoolKm = '1';
  hospitalKm = '1.5';
  policeKm = '2';
  industryKm = '3';
  roadKm = '0';
  roadType: 'Tarmac' | 'Murram' = 'Tarmac';
  water: 'Piped' | 'Borehole' | 'Tank' = 'Piped';
  electricity = true;

  onPremiseChange(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.premise.set({ file, url: URL.createObjectURL(file) });
    this.error.set('');
  }

  onInteriorChange(ev: Event): void {
    const files = Array.from((ev.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    const remaining = 8 - this.interior().length;
    const previews = files.slice(0, remaining).map((file) => ({ file, url: URL.createObjectURL(file) }));
    this.interior.set([...this.interior(), ...previews]);
  }

  removeInterior(i: number): void {
    this.interior.set(this.interior().filter((_, idx) => idx !== i));
  }

  async submit(): Promise<void> {
    if (!this.premise()) {
      this.error.set("Please add a photo of the whole premise — it's required.");
      return;
    }
    const owner = this.auth.user();
    if (!owner || owner.role !== 'owner') return;

    this.submitting.set(true);
    this.error.set('');

    const amenities: Amenities = {
      schoolKm: Number(this.schoolKm) || 0,
      hospitalKm: Number(this.hospitalKm) || 0,
      policeKm: Number(this.policeKm) || 0,
      industryKm: Number(this.industryKm) || 0,
      roadKm: Number(this.roadKm) || 0,
      roadType: this.roadType,
      water: this.water,
      electricity: this.electricity,
    };

    const err = await this.listingsService.create(
      { title: this.title, type: this.type, town: this.town, price: this.price, deposit: this.deposit, desc: this.desc, amenities },
      this.premise()!.file,
      this.interior().map((p) => p.file),
      owner,
    );

    this.submitting.set(false);
    if (err) {
      this.error.set(err);
      return;
    }
    this.toast.show('Listing published!');
    this.router.navigateByUrl('/owner');
  }
}
