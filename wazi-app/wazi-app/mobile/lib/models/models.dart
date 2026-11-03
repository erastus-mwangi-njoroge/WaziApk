import "package:cloud_firestore/cloud_firestore.dart";

class WaziUser {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role; // "owner" | "tenant"
  final List<String> favIds;

  WaziUser({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.favIds,
  });

  factory WaziUser.fromMap(String id, Map<String, dynamic> j) => WaziUser(
        id: id,
        name: j["name"] ?? "",
        email: j["email"] ?? "",
        phone: j["phone"] ?? "",
        role: j["role"] ?? "tenant",
        favIds: (j["favIds"] as List?)?.map((e) => e.toString()).toList() ?? [],
      );

  Map<String, dynamic> toMap() => {"name": name, "email": email, "phone": phone, "role": role, "favIds": favIds};

  WaziUser copyWith({List<String>? favIds}) =>
      WaziUser(id: id, name: name, email: email, phone: phone, role: role, favIds: favIds ?? this.favIds);
}

class Amenities {
  final double schoolKm;
  final double hospitalKm;
  final double policeKm;
  final double industryKm;
  final double roadKm;
  final String roadType;
  final String water;
  final bool electricity;

  Amenities({
    required this.schoolKm,
    required this.hospitalKm,
    required this.policeKm,
    required this.industryKm,
    required this.roadKm,
    required this.roadType,
    required this.water,
    required this.electricity,
  });

  factory Amenities.fromMap(Map<String, dynamic> j) => Amenities(
        schoolKm: _num(j["schoolKm"]),
        hospitalKm: _num(j["hospitalKm"]),
        policeKm: _num(j["policeKm"]),
        industryKm: _num(j["industryKm"]),
        roadKm: _num(j["roadKm"]),
        roadType: j["roadType"] ?? "Tarmac",
        water: j["water"] ?? "Piped",
        electricity: j["electricity"] == true,
      );

  Map<String, dynamic> toMap() => {
        "schoolKm": schoolKm, "hospitalKm": hospitalKm, "policeKm": policeKm, "industryKm": industryKm,
        "roadKm": roadKm, "roadType": roadType, "water": water, "electricity": electricity,
      };

  static double _num(dynamic v) {
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? 0;
  }

  /// Ordered list for the radar chart: (label, icon, km)
  List<(String, String, double)> get axes => [
        ("School", "🎓", schoolKm),
        ("Hospital", "⚕", hospitalKm),
        ("Tarmac road", "🛣", roadKm),
        ("Police", "🚓", policeKm),
        ("Industry/CBD", "🏭", industryKm),
      ];
}

class Listing {
  final String id;
  final String ownerId;
  final String ownerName;
  final String ownerPhone;
  final String title;
  final String type;
  final String town;
  final num price;
  final num deposit;
  final String desc;
  final Amenities amenities;
  final String status; // "vacant" | "occupied"
  final String? premiseImage; // Firebase Storage download URL
  final List<String> interiorImages; // Firebase Storage download URLs
  final DateTime datePosted;

  Listing({
    required this.id,
    required this.ownerId,
    required this.ownerName,
    required this.ownerPhone,
    required this.title,
    required this.type,
    required this.town,
    required this.price,
    required this.deposit,
    required this.desc,
    required this.amenities,
    required this.status,
    required this.premiseImage,
    required this.interiorImages,
    required this.datePosted,
  });

  factory Listing.fromMap(String id, Map<String, dynamic> j) => Listing(
        id: id,
        ownerId: j["ownerId"] ?? "",
        ownerName: j["ownerName"] ?? "Owner",
        ownerPhone: j["ownerPhone"] ?? "N/A",
        title: j["title"] ?? "",
        type: j["type"] ?? "",
        town: j["town"] ?? "",
        price: j["price"] ?? 0,
        deposit: j["deposit"] ?? 0,
        desc: j["desc"] ?? "",
        amenities: Amenities.fromMap(Map<String, dynamic>.from(j["amenities"] ?? {})),
        status: j["status"] ?? "vacant",
        premiseImage: j["premiseImage"],
        interiorImages: (j["interiorImages"] as List?)?.map((e) => e.toString()).toList() ?? [],
        datePosted: _dateFrom(j["datePosted"]),
      );

  static DateTime _dateFrom(dynamic v) {
    if (v is Timestamp) return v.toDate();
    if (v is DateTime) return v;
    return DateTime.now();
  }
}

class TenantPreferences {
  final String town;
  final String type;
  final String minPrice;
  final String maxPrice;

  TenantPreferences({required this.town, required this.type, required this.minPrice, required this.maxPrice});

  factory TenantPreferences.fromMap(Map<String, dynamic>? j) {
    if (j == null) return TenantPreferences(town: "Any", type: "Any", minPrice: "", maxPrice: "");
    return TenantPreferences(
      town: j["town"] ?? "Any",
      type: j["type"] ?? "Any",
      minPrice: (j["minPrice"] ?? "").toString(),
      maxPrice: (j["maxPrice"] ?? "").toString(),
    );
  }

  Map<String, dynamic> toMap() => {"town": town, "type": type, "minPrice": minPrice, "maxPrice": maxPrice};
}

class WaziNotification {
  final String id;
  final String userId;
  final String? listingId;
  final bool read;
  final DateTime date;
  final String message;

  WaziNotification({
    required this.id,
    required this.userId,
    required this.listingId,
    required this.read,
    required this.date,
    required this.message,
  });

  factory WaziNotification.fromMap(String id, Map<String, dynamic> j) => WaziNotification(
        id: id,
        userId: j["userId"] ?? "",
        listingId: j["listingId"],
        read: j["read"] == true,
        date: j["date"] is Timestamp ? (j["date"] as Timestamp).toDate() : DateTime.now(),
        message: j["message"] ?? "",
      );
}
