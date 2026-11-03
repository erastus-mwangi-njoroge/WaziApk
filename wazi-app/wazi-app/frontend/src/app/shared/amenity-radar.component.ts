import { Component, Input, computed, signal } from '@angular/core';
import { AMENITY_AXES, Amenities } from '../core/models';

@Component({
  selector: 'app-amenity-radar',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size">
      <circle [attr.cx]="cx()" [attr.cy]="cy()" [attr.r]="r()" fill="none" stroke="#22281F" stroke-opacity="0.08" />
      @for (line of axisLines(); track $index) {
        <line [attr.x1]="cx()" [attr.y1]="cy()" [attr.x2]="line.x" [attr.y2]="line.y" stroke="#22281F" stroke-opacity="0.10" stroke-width="1" />
      }
      <polygon [attr.points]="polygonPoints()" fill="#2F6F4E" fill-opacity="0.35" stroke="#2F6F4E" stroke-width="1.6" />
    </svg>
  `,
})
export class AmenityRadarComponent {
  @Input({ required: true }) set amenities(value: Amenities) {
    this._amenities.set(value);
  }
  @Input() size = 56;

  private _amenities = signal<Amenities | null>(null);

  cx = computed(() => this.size / 2);
  cy = computed(() => this.size / 2);
  r = computed(() => this.size / 2 - 10);

  private axisAngle(i: number, n: number): number {
    return (2 * Math.PI * i) / n - Math.PI / 2;
  }

  axisLines = computed(() => {
    const n = AMENITY_AXES.length;
    const cx = this.cx();
    const cy = this.cy();
    const r = this.r();
    return AMENITY_AXES.map((_, i) => {
      const angle = this.axisAngle(i, n);
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  });

  polygonPoints = computed(() => {
    const a = this._amenities();
    if (!a) return '';
    const n = AMENITY_AXES.length;
    const cx = this.cx();
    const cy = this.cy();
    const r = this.r();
    return AMENITY_AXES.map((axis, i) => {
      const km = a[axis.key] ?? 5;
      const score = Math.max(0.08, Math.min(1, 1 - km / 6));
      const rad = r * (0.22 + 0.78 * score);
      const angle = this.axisAngle(i, n);
      return `${(cx + rad * Math.cos(angle)).toFixed(1)},${(cy + rad * Math.sin(angle)).toFixed(1)}`;
    }).join(' ');
  });
}
