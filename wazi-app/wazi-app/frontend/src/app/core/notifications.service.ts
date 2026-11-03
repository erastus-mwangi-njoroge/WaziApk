import { Injectable, signal } from '@angular/core';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase-init';
import { WaziNotification } from './models';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  notifications = signal<WaziNotification[]>([]);

  unreadCount(): number {
    return this.notifications().filter((n) => !n.read).length;
  }

  /** Filters by userId only (no orderBy in the query) so this never needs a
   *  Firestore composite index — results are sorted client-side instead. */
  async load(uid: string): Promise<void> {
    const q = query(collection(db, 'notifications'), where('userId', '==', uid));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        userId: data.userId,
        listingId: data.listingId ?? null,
        read: data.read === true,
        date: data.date?.toMillis ? data.date.toMillis() : Date.now(),
        message: data.message,
      } as WaziNotification;
    });
    items.sort((a, b) => b.date - a.date);
    this.notifications.set(items);
  }

  reset(): void {
    this.notifications.set([]);
  }

  async markAllRead(): Promise<void> {
    const unread = this.notifications().filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    this.notifications.set(this.notifications().map((n) => ({ ...n, read: true })));
  }
}
