import { TOWN_GROUPS } from './kenya-towns';

export interface Amenities {
  schoolKm: number;
  hospitalKm: number;
  policeKm: number;
  industryKm: number;
  roadKm: number;
  roadType: 'Tarmac' | 'Murram';
  water: 'Piped' | 'Borehole' | 'Tank';
  electricity: boolean;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  type: string;
  town: string;
  price: number;
  deposit: number;
  desc: string;
  amenities: Amenities;
  status: 'vacant' | 'occupied';
  premiseImage: string | null; // Firebase Storage download URL
  interiorImages: string[]; // Firebase Storage download URLs
  datePosted: number; // epoch millis
}

export interface WaziUser {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'tenant';
  favIds: string[];
}

export interface TenantPreferences {
  town: string;
  type: string;
  minPrice: string;
  maxPrice: string;
}

export interface WaziNotification {
  id: string;
  userId: string;
  listingId: string | null;
  read: boolean;
  date: number;
  message: string;
}

export interface AmenityAxis {
  key: keyof Pick<Amenities, 'schoolKm' | 'hospitalKm' | 'roadKm' | 'policeKm' | 'industryKm'>;
  label: string;
  icon: string;
}

export const AMENITY_AXES: AmenityAxis[] = [
  { key: 'schoolKm', label: 'School', icon: '🎓' },
  { key: 'hospitalKm', label: 'Hospital', icon: '⚕' },
  { key: 'roadKm', label: 'Tarmac road', icon: '🛣' },
  { key: 'policeKm', label: 'Police', icon: '🚓' },
  { key: 'industryKm', label: 'Industry/CBD', icon: '🏭' },
];

export const HOUSE_TYPES = [
  'Single Room', 'Double Room', 'Bedsitter', 'Shop', 'One Bedroom',
  'Two Bedroom', 'Three Bedroom', 'Own Compound', 'Maisonette',
];

// Every urban centre in Kenya, grouped by county. The data lives in
// data/kenya_towns.json and is turned into ./kenya-towns.ts by tools/gen_towns.py.
export { TOWN_GROUPS };
export type { TownGroup } from './kenya-towns';

/** Flat list of every selectable town / "Town — Area" value. */
export const TOWNS: string[] = TOWN_GROUPS.flatMap((g) => g.options);

/**
 * Does a listing in `listingTown` satisfy a filter / alert for `wanted`?
 * "Any" (or empty) matches everything. A bare town ("Nairobi") also matches
 * its areas ("Nairobi — Kilimani"); an area filter must match exactly.
 */
export function townMatches(wanted: string | undefined | null, listingTown: string): boolean {
  if (!wanted || wanted === 'Any') return true;
  return listingTown === wanted || listingTown.startsWith(wanted + ' — ');
}

export function fmtPrice(n: number): string {
  return 'KSh ' + Math.round(n).toLocaleString('en-KE');
}

export function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
