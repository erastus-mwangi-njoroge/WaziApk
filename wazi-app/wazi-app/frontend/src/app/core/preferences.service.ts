import { Injectable, signal } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase-init';
import { TenantPreferences } from './models';

const EMPTY: TenantPreferences = { town: 'Any', type: 'Any', minPrice: '', maxPrice: '' };

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  prefs = signal<TenantPreferences>(EMPTY);

  async load(uid: string): Promise<void> {
    const snap = await getDoc(doc(db, 'preferences', uid));
    this.prefs.set(snap.exists() ? (snap.data() as TenantPreferences) : EMPTY);
  }

  reset(): void {
    this.prefs.set(EMPTY);
  }

  async save(uid: string, p: TenantPreferences): Promise<string | null> {
    try {
      await setDoc(doc(db, 'preferences', uid), p);
      this.prefs.set(p);
      return null;
    } catch (e: any) {
      return e?.message || 'Could not save preferences.';
    }
  }
}
