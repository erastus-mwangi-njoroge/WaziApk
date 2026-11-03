import { Injectable, signal } from '@angular/core';
import {
  DocumentSnapshot,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase-init';
import { Amenities, Listing, WaziUser } from './models';

export interface NewListingFields {
  title: string;
  type: string;
  town: string;
  price: string;
  deposit: string;
  desc: string;
  amenities: Amenities;
}

@Injectable({ providedIn: 'root' })
export class ListingsService {
  listings = signal<Listing[]>([]);
  loading = signal(false);

  private fromDoc(d: DocumentSnapshot<any> | any): Listing {
    const data = d.data();
    return {
      id: d.id,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      title: data.title,
      type: data.type,
      town: data.town,
      price: data.price,
      deposit: data.deposit,
      desc: data.desc,
      amenities: data.amenities,
      status: data.status,
      premiseImage: data.premiseImage ?? null,
      interiorImages: data.interiorImages ?? [],
      datePosted: data.datePosted?.toMillis ? data.datePosted.toMillis() : Date.now(),
    };
  }

  /** Loads every listing, newest first. Filtering by town/type/price happens client-side
   *  so the app never needs a Firestore composite index. */
  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const q = query(collection(db, 'listings'), orderBy('datePosted', 'desc'));
      const snap = await getDocs(q);
      this.listings.set(snap.docs.map((d) => this.fromDoc(d)));
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id: string): Promise<Listing | null> {
    const cached = this.listings().find((l) => l.id === id);
    if (cached) return cached;
    const snap = await getDoc(doc(db, 'listings', id));
    return snap.exists() ? this.fromDoc(snap) : null;
  }

  private async uploadImage(listingId: string, kind: 'premise' | 'interior', file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `listings/${listingId}/${kind}-${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async create(fields: NewListingFields, premise: File, interiors: File[], owner: WaziUser): Promise<string | null> {
    try {
      // Pre-generate the document id so uploaded images can be grouped under it.
      const listingRef = doc(collection(db, 'listings'));
      const premiseUrl = await this.uploadImage(listingRef.id, 'premise', premise);
      const interiorUrls: string[] = [];
      for (const f of interiors.slice(0, 8)) {
        interiorUrls.push(await this.uploadImage(listingRef.id, 'interior', f));
      }
      const data = {
        ownerId: owner.uid,
        ownerName: owner.name,
        ownerPhone: owner.phone || 'N/A',
        title: fields.title.trim(),
        type: fields.type,
        town: fields.town,
        price: Number(fields.price) || 0,
        deposit: Number(fields.deposit) || 0,
        desc: fields.desc.trim() || 'No description provided yet.',
        amenities: fields.amenities,
        status: 'vacant' as const,
        premiseImage: premiseUrl,
        interiorImages: interiorUrls,
        datePosted: serverTimestamp(),
      };
      await setDoc(listingRef, data);
      this.listings.set([{ id: listingRef.id, ...data, datePosted: Date.now() } as Listing, ...this.listings()]);
      return null;
    } catch (e: any) {
      return e?.message || 'Could not publish listing.';
    }
  }

  async setStatus(id: string, status: 'vacant' | 'occupied'): Promise<void> {
    await updateDoc(doc(db, 'listings', id), { status });
    this.listings.set(this.listings().map((l) => (l.id === id ? { ...l, status } : l)));
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, 'listings', id));
    this.listings.set(this.listings().filter((l) => l.id !== id));
    // Note: this doesn't delete the uploaded Storage files for the listing —
    // fine for a demo, but worth cleaning up (e.g. in a Cloud Function
    // triggered on document delete) before relying on this in production.
  }
}
