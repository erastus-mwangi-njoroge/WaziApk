import { Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { arrayRemove, arrayUnion, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase-init';
import { WaziUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<WaziUser | null>(null);
  initializing = signal(true);

  /** Resolves once the initial Firebase auth state has been checked. */
  readonly ready: Promise<void>;

  constructor() {
    let resolveReady!: () => void;
    this.ready = new Promise((res) => (resolveReady = res));

    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const snap = await getDoc(doc(db, 'users', fbUser.uid));
        this.user.set(snap.exists() ? ({ uid: fbUser.uid, ...(snap.data() as any) } as WaziUser) : null);
      } else {
        this.user.set(null);
      }
      this.initializing.set(false);
      resolveReady();
    });
  }

  async register(name: string, email: string, phone: string, password: string, role: 'owner' | 'tenant'): Promise<string | null> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile: Omit<WaziUser, 'uid'> = { name, email, phone, role, favIds: [] };
      await setDoc(doc(db, 'users', cred.user.uid), profile);
      this.user.set({ uid: cred.user.uid, ...profile });
      return null;
    } catch (e: any) {
      return friendlyAuthError(e);
    }
  }

  async login(email: string, password: string): Promise<string | null> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) this.user.set({ uid: cred.user.uid, ...(snap.data() as any) } as WaziUser);
      return null;
    } catch (e: any) {
      return friendlyAuthError(e);
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.user.set(null);
  }

  isFavorite(listingId: string): boolean {
    return this.user()?.favIds.includes(listingId) ?? false;
  }

  async toggleFavorite(listingId: string): Promise<void> {
    const u = this.user();
    if (!u) return;
    const has = u.favIds.includes(listingId);
    await updateDoc(doc(db, 'users', u.uid), {
      favIds: has ? arrayRemove(listingId) : arrayUnion(listingId),
    });
    this.user.set({ ...u, favIds: has ? u.favIds.filter((x) => x !== listingId) : [...u.favIds, listingId] });
  }
}

function friendlyAuthError(e: any): string {
  const code: string = e?.code || '';
  if (code.includes('email-already-in-use')) return 'An account with that email already exists.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  return e?.message || 'Something went wrong. Please try again.';
}
