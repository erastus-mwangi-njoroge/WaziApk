import "dart:io";
import "package:cloud_firestore/cloud_firestore.dart";
import "package:firebase_auth/firebase_auth.dart";
import "package:firebase_storage/firebase_storage.dart";
import "../models/models.dart";

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class FirebaseApi {
  final _auth = FirebaseAuth.instance;
  final _db = FirebaseFirestore.instance;
  final _storage = FirebaseStorage.instance;

  Stream<User?> get authState => _auth.authStateChanges();
  User? get currentFirebaseUser => _auth.currentUser;

  Future<WaziUser?> fetchProfile(String uid) async {
    final snap = await _db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return WaziUser.fromMap(uid, snap.data()!);
  }

  Future<WaziUser> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String role,
  }) async {
    try {
      final cred = await _auth.createUserWithEmailAndPassword(email: email, password: password);
      final profile = WaziUser(id: cred.user!.uid, name: name, email: email, phone: phone, role: role, favIds: []);
      await _db.collection("users").doc(profile.id).set(profile.toMap());
      return profile;
    } on FirebaseAuthException catch (e) {
      throw ApiException(_friendlyAuthError(e));
    }
  }

  Future<WaziUser> login({required String email, required String password}) async {
    try {
      final cred = await _auth.signInWithEmailAndPassword(email: email, password: password);
      final profile = await fetchProfile(cred.user!.uid);
      if (profile == null) throw ApiException("No profile found for this account.");
      return profile;
    } on FirebaseAuthException catch (e) {
      throw ApiException(_friendlyAuthError(e));
    }
  }

  Future<void> logout() => _auth.signOut();

  /// Loads every listing, newest first. Filtering by town/type/price happens
  /// client-side so the app never needs a Firestore composite index.
  Future<List<Listing>> listings() async {
    final snap = await _db.collection("listings").orderBy("datePosted", descending: true).get();
    return snap.docs.map((d) => Listing.fromMap(d.id, d.data())).toList();
  }

  Future<Listing?> listingDetail(String id) async {
    final snap = await _db.collection("listings").doc(id).get();
    if (!snap.exists) return null;
    return Listing.fromMap(snap.id, snap.data()!);
  }

  Future<String> _uploadImage(String listingId, String kind, File file) async {
    final safeName = file.path.split(Platform.pathSeparator).last.replaceAll(RegExp(r'[^a-zA-Z0-9.\-_]'), '_');
    final path = "listings/$listingId/$kind-${DateTime.now().millisecondsSinceEpoch}-$safeName";
    final ref = _storage.ref(path);
    await ref.putFile(file);
    return ref.getDownloadURL();
  }

  Future<Listing> createListing({
    required Map<String, dynamic> fields,
    required Amenities amenities,
    required File premiseImage,
    required List<File> interiorImages,
    required WaziUser owner,
  }) async {
    final docRef = _db.collection("listings").doc(); // pre-generated id
    final premiseUrl = await _uploadImage(docRef.id, "premise", premiseImage);
    final interiorUrls = <String>[];
    for (final f in interiorImages.take(8)) {
      interiorUrls.add(await _uploadImage(docRef.id, "interior", f));
    }
    final data = {
      "ownerId": owner.id,
      "ownerName": owner.name,
      "ownerPhone": owner.phone.isEmpty ? "N/A" : owner.phone,
      "title": fields["title"],
      "type": fields["type"],
      "town": fields["town"],
      "price": num.tryParse(fields["price"].toString()) ?? 0,
      "deposit": num.tryParse(fields["deposit"].toString()) ?? 0,
      "desc": (fields["desc"] as String).trim().isEmpty ? "No description provided yet." : fields["desc"],
      "amenities": amenities.toMap(),
      "status": "vacant",
      "premiseImage": premiseUrl,
      "interiorImages": interiorUrls,
      "datePosted": FieldValue.serverTimestamp(),
    };
    await docRef.set(data);
    return Listing.fromMap(docRef.id, {...data, "datePosted": Timestamp.now()});
  }

  Future<void> setListingStatus(String id, String status) => _db.collection("listings").doc(id).update({"status": status});

  Future<void> deleteListing(String id) => _db.collection("listings").doc(id).delete();
  // Note: this doesn't delete the uploaded Storage files for the listing —
  // fine for a demo; add a Cloud Function on document-delete to clean those
  // up automatically before relying on this in production.

  Future<List<String>> toggleFavorite(String uid, List<String> current, String listingId) async {
    final has = current.contains(listingId);
    await _db.collection("users").doc(uid).update({
      "favIds": has ? FieldValue.arrayRemove([listingId]) : FieldValue.arrayUnion([listingId]),
    });
    return has ? (current.where((x) => x != listingId).toList()) : [...current, listingId];
  }

  Future<TenantPreferences> getPreferences(String uid) async {
    final snap = await _db.collection("preferences").doc(uid).get();
    return TenantPreferences.fromMap(snap.data());
  }

  Future<TenantPreferences> setPreferences(String uid, TenantPreferences p) async {
    await _db.collection("preferences").doc(uid).set(p.toMap());
    return p;
  }

  /// Filters by userId only (no orderBy in the query) so this never needs a
  /// Firestore composite index — results are sorted client-side instead.
  Future<List<WaziNotification>> notifications(String uid) async {
    final snap = await _db.collection("notifications").where("userId", isEqualTo: uid).get();
    final items = snap.docs.map((d) => WaziNotification.fromMap(d.id, d.data())).toList();
    items.sort((a, b) => b.date.compareTo(a.date));
    return items;
  }

  Future<void> markNotificationsRead(List<WaziNotification> unread) async {
    final batch = _db.batch();
    for (final n in unread) {
      batch.update(_db.collection("notifications").doc(n.id), {"read": true});
    }
    await batch.commit();
  }
}

String _friendlyAuthError(FirebaseAuthException e) {
  switch (e.code) {
    case "email-already-in-use":
      return "An account with that email already exists.";
    case "invalid-credential":
    case "wrong-password":
    case "user-not-found":
      return "Invalid email or password.";
    case "weak-password":
      return "Password should be at least 6 characters.";
    case "invalid-email":
      return "Enter a valid email address.";
    default:
      return e.message ?? "Something went wrong. Please try again.";
  }
}
