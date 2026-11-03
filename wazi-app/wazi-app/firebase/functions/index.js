const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

/**
 * Same rule as the apps: "Any"/empty matches everything; a bare town ("Nairobi")
 * also matches its areas ("Nairobi — Kilimani"); an area must match exactly.
 */
function townMatches(wanted, listingTown) {
  if (!wanted || wanted === "Any") return true;
  const t = String(listingTown || "");
  return t === wanted || t.startsWith(wanted + " — ");
}

/**
 * Runs whenever a listing document is created or updated.
 * Fans out a notification to every tenant whose saved preferences match,
 * whenever a listing is first created, or flips from occupied -> vacant.
 */
exports.notifyMatchingTenants = onDocumentWritten("listings/{listingId}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  if (!after) return; // listing was deleted

  const becameVacant = !before || (before.status !== "vacant" && after.status === "vacant");
  if (!becameVacant) return;

  const listingId = event.params.listingId;

  const prefsSnap = await db.collection("preferences").get();
  if (prefsSnap.empty) return;

  const batch = db.batch();
  let count = 0;

  prefsSnap.forEach((prefDoc) => {
    const uid = prefDoc.id;
    if (uid === after.ownerId) return; // don't notify an owner about their own listing

    const p = prefDoc.data();
    const townOk = townMatches(p.town, after.town);
    const typeOk = !p.type || p.type === "Any" || p.type === after.type;
    const minOk = !p.minPrice || Number(after.price) >= Number(p.minPrice);
    const maxOk = !p.maxPrice || Number(after.price) <= Number(p.maxPrice);

    if (townOk && typeOk && minOk && maxOk) {
      const ref = db.collection("notifications").doc();
      batch.set(ref, {
        userId: uid,
        listingId,
        read: false,
        date: FieldValue.serverTimestamp(),
        message: `New vacancy matching your alert: "${after.title}" in ${after.town} at KSh ${Number(after.price).toLocaleString("en-KE")}/mo.`,
      });
      count++;
    }
  });

  if (count > 0) await batch.commit();
});
