import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { TOWNS, TOWN_GROUPS, TownGroup } from '../core/models';

const SEP = ' — ';
/** Towns that have sub-areas listed, e.g. "Nairobi" — so we can label them "(all areas)". */
const TOWNS_WITH_AREAS = new Set(TOWNS.filter((t) => t.includes(SEP)).map((t) => t.split(SEP)[0]));

/**
 * Searchable, county-grouped picker for every urban centre in Kenya.
 * Usage:  <app-town-select [(value)]="town" />
 *         <app-town-select [(value)]="filterTown" [includeAny]="true" anyLabel="Any location" />
 */
@Component({
  selector: 'app-town-select',
  standalone: true,
  template: `
    <input class="town-search" type="search" autocomplete="off"
           aria-label="Search towns and counties" placeholder="Search town or county…"
           [value]="query()" (input)="query.set($any($event.target).value)" />
    <select aria-label="Town or area" (change)="pick($any($event.target).value)">
      @if (includeAny) { <option value="Any" [selected]="value === 'Any'">{{ anyLabel }}</option> }
      @for (g of groups(); track g.county) {
        <optgroup [label]="g.county + ' County'">
          @for (t of g.options; track t) {
            <option [value]="t" [selected]="t === value">{{ label(t) }}</option>
          }
        </optgroup>
      }
    </select>
    @if (query() && !groups().length) {
      <div class="town-empty">No town matches “{{ query() }}”.</div>
    }
  `,
  styles: [`
    :host { display: block; }
    .town-search { margin-bottom: 6px; }
    .town-empty { font-size: 12.5px; color: var(--ink-soft); margin-top: 6px; }
  `],
})
export class TownSelectComponent {
  @Input() includeAny = false;
  @Input() anyLabel = 'Any location';

  private _value = signal('Any');
  @Input() set value(v: string) { this._value.set(v || 'Any'); }
  get value(): string { return this._value(); }
  @Output() valueChange = new EventEmitter<string>();

  query = signal('');

  /** Groups filtered by the search box. The current selection is always kept visible. */
  groups = computed<TownGroup[]>(() => {
    const q = this.query().trim().toLowerCase();
    const current = this._value();
    if (!q) return TOWN_GROUPS;
    const out: TownGroup[] = [];
    for (const g of TOWN_GROUPS) {
      const countyHit = g.county.toLowerCase().includes(q);
      const options = g.options.filter((o) => countyHit || o === current || o.toLowerCase().includes(q));
      if (options.length) out.push({ county: g.county, options });
    }
    return out;
  });

  label(t: string): string {
    return TOWNS_WITH_AREAS.has(t) ? `${t} (all areas)` : t;
  }

  pick(v: string): void {
    this._value.set(v);
    this.valueChange.emit(v);
  }
}
