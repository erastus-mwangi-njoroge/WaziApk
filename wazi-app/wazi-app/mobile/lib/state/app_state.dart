import "dart:async";
import "dart:io";
import "package:flutter/foundation.dart";
import "../models/models.dart";
import "../services/firebase_api.dart";
import "../theme.dart";

class AppState extends ChangeNotifier {
  final FirebaseApi api = FirebaseApi();

  WaziUser? user;
  bool bootstrapping = true;

  List<Listing> listings = [];
  bool listingsLoading = false;

  String filterTown = "Any";
  String filterType = "Any";
  String filterMaxPrice = "";
  String sort = "newest";

  TenantPreferences prefs = TenantPreferences(town: "Any", type: "Any", minPrice: "", maxPrice: "");
  List<WaziNotification> notifications = [];
  int get unreadCount => notifications.where((n) => !n.read).length;

  List<String> get favIds => user?.favIds ?? [];

  Timer? _pollTimer;
  StreamSubscription? _authSub;

  Future<void> bootstrap() async {
    final fbUser = api.currentFirebaseUser;
    if (fbUser != null) {
      user = await api.fetchProfile(fbUser.uid);
    }
    await loadListings();
    if (user != null) await _loadUserExtras();
    bootstrapping = false;
    notifyListeners();

    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 20), (_) => _pollNotifications());
  }

  Future<void> loadListings() async {
    listingsLoading = true;
    notifyListeners();
    try {
      final all = await api.listings();
      listings = _applyFiltersAndSort(all);
    } catch (_) {
      // keep previous listings on transient failure
    }
    listingsLoading = false;
    notifyListeners();
  }

  List<Listing> _applyFiltersAndSort(List<Listing> all) {
    var items = all.where((l) {
      if (!townMatches(filterTown, l.town)) return false;
      if (filterType != "Any" && l.type != filterType) return false;
      if (filterMaxPrice.isNotEmpty && l.price > (num.tryParse(filterMaxPrice) ?? double.infinity)) return false;
      return true;
    }).toList();
    if (sort == "price-asc") {
      items.sort((a, b) => a.price.compareTo(b.price));
    } else if (sort == "price-desc") {
      items.sort((a, b) => b.price.compareTo(a.price));
    } else {
      items.sort((a, b) => b.datePosted.compareTo(a.datePosted));
    }
    return items;
  }

  Future<void> _loadUserExtras() async {
    if (user == null) return;
    try {
      prefs = await api.getPreferences(user!.id);
    } catch (_) {}
    await _pollNotifications();
  }

  Future<void> _pollNotifications() async {
    if (user == null) return;
    try {
      notifications = await api.notifications(user!.id);
      notifyListeners();
    } catch (_) {}
  }

  Future<String?> login(String email, String password) async {
    try {
      user = await api.login(email: email, password: password);
      await _loadUserExtras();
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> register(String name, String email, String phone, String password, String role) async {
    try {
      user = await api.register(name: name, email: email, phone: phone, password: password, role: role);
      await _loadUserExtras();
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<void> logout() async {
    await api.logout();
    user = null;
    notifications = [];
    notifyListeners();
  }

  bool isFavorite(String id) => favIds.contains(id);

  Future<void> toggleFavorite(String id) async {
    final u = user;
    if (u == null) return;
    try {
      final updated = await api.toggleFavorite(u.id, u.favIds, id);
      user = u.copyWith(favIds: updated);
      notifyListeners();
    } catch (_) {}
  }

  Future<String?> savePreferences(TenantPreferences p) async {
    if (user == null) return "Sign in required.";
    try {
      prefs = await api.setPreferences(user!.id, p);
      notifyListeners();
      return null;
    } catch (e) {
      return "Could not save preferences.";
    }
  }

  Future<String?> createListing(Map<String, dynamic> fields, Amenities amenities, File premise, List<File> interiors) async {
    if (user == null) return "Sign in required.";
    try {
      final listing = await api.createListing(
        fields: fields,
        amenities: amenities,
        premiseImage: premise,
        interiorImages: interiors,
        owner: user!,
      );
      listings = [listing, ...listings];
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    } catch (e) {
      return "Could not publish listing. Please try again.";
    }
  }

  Future<void> toggleListingStatus(Listing l) async {
    final newStatus = l.status == "vacant" ? "occupied" : "vacant";
    try {
      await api.setListingStatus(l.id, newStatus);
      final i = listings.indexWhere((x) => x.id == l.id);
      if (i > -1) {
        listings[i] = Listing(
          id: l.id, ownerId: l.ownerId, ownerName: l.ownerName, ownerPhone: l.ownerPhone,
          title: l.title, type: l.type, town: l.town, price: l.price, deposit: l.deposit, desc: l.desc,
          amenities: l.amenities, status: newStatus, premiseImage: l.premiseImage,
          interiorImages: l.interiorImages, datePosted: l.datePosted,
        );
      }
      notifyListeners();
    } catch (_) {}
  }

  Future<void> deleteListing(String id) async {
    try {
      await api.deleteListing(id);
      listings = listings.where((l) => l.id != id).toList();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markNotificationsRead() async {
    final unread = notifications.where((n) => !n.read).toList();
    if (unread.isEmpty) return;
    try {
      await api.markNotificationsRead(unread);
      notifications = notifications.map((n) => WaziNotification(id: n.id, userId: n.userId, listingId: n.listingId, read: true, date: n.date, message: n.message)).toList();
      notifyListeners();
    } catch (_) {}
  }

  List<Listing> get myListings => user == null ? [] : listings.where((l) => l.ownerId == user!.id).toList();
  List<Listing> get savedListings => listings.where((l) => favIds.contains(l.id)).toList();

  @override
  void dispose() {
    _pollTimer?.cancel();
    _authSub?.cancel();
    super.dispose();
  }
}
