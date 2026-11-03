import "dart:io";
import "package:flutter/material.dart";
import "package:image_picker/image_picker.dart";
import "package:provider/provider.dart";
import "../models/models.dart";
import "../state/app_state.dart";
import "../theme.dart";
import "../widgets/town_picker.dart";

class AddListingScreen extends StatefulWidget {
  const AddListingScreen({super.key});
  @override
  State<AddListingScreen> createState() => _AddListingScreenState();
}

class _AddListingScreenState extends State<AddListingScreen> {
  final formKey = GlobalKey<FormState>();
  final picker = ImagePicker();

  File? premiseImage;
  List<File> interiorImages = [];

  String type = kHouseTypes.first;
  String town = kTowns.first;
  String roadType = "Tarmac";
  String water = "Piped";
  bool electricity = true;

  final titleCtrl = TextEditingController();
  final priceCtrl = TextEditingController();
  final depositCtrl = TextEditingController();
  final descCtrl = TextEditingController();
  final schoolCtrl = TextEditingController(text: "1");
  final hospitalCtrl = TextEditingController(text: "1.5");
  final policeCtrl = TextEditingController(text: "2");
  final industryCtrl = TextEditingController(text: "3");
  final roadCtrl = TextEditingController(text: "0");

  bool submitting = false;
  String? error;

  @override
  void dispose() {
    for (final c in [titleCtrl, priceCtrl, depositCtrl, descCtrl, schoolCtrl, hospitalCtrl, policeCtrl, industryCtrl, roadCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickPremise() async {
    final choice = await _chooseSource();
    if (choice == null) return;
    final picked = await picker.pickImage(source: choice, maxWidth: 1600, imageQuality: 85);
    if (picked != null) setState(() { premiseImage = File(picked.path); error = null; });
  }

  Future<void> _pickInterior() async {
    final choice = await _chooseSource();
    if (choice == null) return;
    if (choice == ImageSource.gallery) {
      final picked = await picker.pickMultiImage(maxWidth: 1600, imageQuality: 85);
      if (picked.isNotEmpty) {
        setState(() {
          interiorImages = [...interiorImages, ...picked.map((x) => File(x.path))].take(8).toList();
        });
      }
    } else {
      final picked = await picker.pickImage(source: choice, maxWidth: 1600, imageQuality: 85);
      if (picked != null) setState(() => interiorImages = [...interiorImages, File(picked.path)].take(8).toList());
    }
  }

  Future<ImageSource?> _chooseSource() {
    return showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Wrap(children: [
          ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text("Take a photo"), onTap: () => Navigator.pop(ctx, ImageSource.camera)),
          ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text("Choose from gallery"), onTap: () => Navigator.pop(ctx, ImageSource.gallery)),
        ]),
      ),
    );
  }

  Future<void> _submit() async {
    if (!formKey.currentState!.validate()) return;
    if (premiseImage == null) {
      setState(() => error = "Please add a photo of the whole premise — it's required.");
      return;
    }
    setState(() { submitting = true; error = null; });
    final fields = {
      "title": titleCtrl.text.trim(),
      "type": type,
      "town": town,
      "price": priceCtrl.text.trim(),
      "deposit": depositCtrl.text.trim().isEmpty ? "0" : depositCtrl.text.trim(),
      "desc": descCtrl.text.trim(),
    };
    final amenities = Amenities(
      schoolKm: double.tryParse(schoolCtrl.text.trim()) ?? 0,
      hospitalKm: double.tryParse(hospitalCtrl.text.trim()) ?? 0,
      policeKm: double.tryParse(policeCtrl.text.trim()) ?? 0,
      industryKm: double.tryParse(industryCtrl.text.trim()) ?? 0,
      roadKm: double.tryParse(roadCtrl.text.trim()) ?? 0,
      roadType: roadType,
      water: water,
      electricity: electricity,
    );
    final err = await context.read<AppState>().createListing(fields, amenities, premiseImage!, interiorImages);
    if (!mounted) return;
    setState(() => submitting = false);
    if (err != null) {
      setState(() => error = err);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Listing published!")));
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Add a listing")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(18),
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (error != null) Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFF7E4DE), borderRadius: BorderRadius.circular(8)),
                    child: Text(error!, style: const TextStyle(color: Color(0xFF9C3A2B), fontSize: 13)),
                  ),
                ),
                _SectionTitle("Photos"),
                const _Label("Whole premise / compound photo — required"),
                _UploadBox(
                  required: true,
                  filled: premiseImage != null,
                  label: premiseImage != null ? "Change premise photo" : "Tap to add a photo of the whole compound",
                  hint: "Tenants see this first — show the gate, exterior, and surroundings.",
                  onTap: _pickPremise,
                ),
                if (premiseImage != null) Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: _Thumb(file: premiseImage!, onRemove: () => setState(() => premiseImage = null)),
                ),
                const SizedBox(height: 16),
                const _Label("Interior photos — optional, up to 8"),
                _UploadBox(
                  required: false,
                  filled: interiorImages.isNotEmpty,
                  label: "Tap to add interior photos",
                  hint: "Rooms, kitchen, bathroom — whatever helps a tenant picture living there.",
                  onTap: _pickInterior,
                ),
                if (interiorImages.isNotEmpty) Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Wrap(
                    spacing: 8, runSpacing: 8,
                    children: interiorImages.asMap().entries.map((e) => _Thumb(
                      file: e.value,
                      onRemove: () => setState(() => interiorImages.removeAt(e.key)),
                    )).toList(),
                  ),
                ),

                _SectionTitle("Details"),
                const _Label("Title"),
                TextFormField(controller: titleCtrl, validator: (v) => (v == null || v.trim().isEmpty) ? "Required" : null),
                const SizedBox(height: 14),
                const _Label("House type"),
                DropdownButtonFormField<String>(value: type, items: kHouseTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(), onChanged: (v) => setState(() => type = v!)),
                const SizedBox(height: 14),
                const _Label("Town / area"),
                TownPicker(value: town, onChanged: (v) => setState(() => town = v)),
                const SizedBox(height: 14),
                const _Label("Monthly rent (KSh)"),
                TextFormField(controller: priceCtrl, keyboardType: TextInputType.number, validator: (v) => (v == null || v.trim().isEmpty) ? "Required" : null),
                const SizedBox(height: 14),
                const _Label("Deposit (KSh)"),
                TextFormField(controller: depositCtrl, keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                const _Label("Description"),
                TextFormField(controller: descCtrl, maxLines: 4),

                _SectionTitle("Nearby amenities (km)"),
                Row(children: [
                  Expanded(child: _AmenityField(label: "🎓 School", controller: schoolCtrl)),
                  const SizedBox(width: 10),
                  Expanded(child: _AmenityField(label: "⚕ Hospital", controller: hospitalCtrl)),
                ]),
                const SizedBox(height: 14),
                Row(children: [
                  Expanded(child: _AmenityField(label: "🚓 Police", controller: policeCtrl)),
                  const SizedBox(width: 10),
                  Expanded(child: _AmenityField(label: "🏭 Industry/CBD", controller: industryCtrl)),
                ]),
                const SizedBox(height: 14),
                _AmenityField(label: "Distance to nearest tarmac", controller: roadCtrl),
                const SizedBox(height: 14),
                const _Label("Road type at the house"),
                DropdownButtonFormField<String>(
                  value: roadType,
                  items: const [DropdownMenuItem(value: "Tarmac", child: Text("Tarmac")), DropdownMenuItem(value: "Murram", child: Text("Murram"))],
                  onChanged: (v) => setState(() => roadType = v!),
                ),
                const SizedBox(height: 14),
                const _Label("Water supply"),
                DropdownButtonFormField<String>(
                  value: water,
                  items: const [DropdownMenuItem(value: "Piped", child: Text("Piped")), DropdownMenuItem(value: "Borehole", child: Text("Borehole")), DropdownMenuItem(value: "Tank", child: Text("Tank"))],
                  onChanged: (v) => setState(() => water = v!),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text("Electricity connected"),
                  value: electricity,
                  activeColor: WaziColors.green,
                  onChanged: (v) => setState(() => electricity = v),
                ),
                const SizedBox(height: 10),
                ElevatedButton(
                  onPressed: submitting ? null : _submit,
                  child: submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text("Publish listing"),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 18, bottom: 10),
        child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: WaziColors.greenDark, letterSpacing: 0.4)),
      );
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: WaziColors.inkSoft, letterSpacing: 0.4)),
      );
}

class _AmenityField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  const _AmenityField({required this.label, required this.controller});
  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Label(label),
          TextFormField(controller: controller, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
        ],
      );
}

class _UploadBox extends StatelessWidget {
  final bool required;
  final bool filled;
  final String label;
  final String hint;
  final VoidCallback onTap;
  const _UploadBox({required this.required, required this.filled, required this.label, required this.hint, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: WaziColors.paper,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: (required && !filled) ? WaziColors.rust : WaziColors.line, width: 1.4, style: BorderStyle.solid),
        ),
        child: Column(children: [
          Icon(Icons.add_a_photo_outlined, color: WaziColors.inkSoft),
          const SizedBox(height: 8),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
          const SizedBox(height: 4),
          Text(hint, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: WaziColors.inkSoft)),
        ]),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  final File file;
  final VoidCallback onRemove;
  const _Thumb({required this.file, required this.onRemove});
  @override
  Widget build(BuildContext context) {
    return Stack(children: [
      ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(file, width: 74, height: 60, fit: BoxFit.cover)),
      Positioned(
        top: 2, right: 2,
        child: InkWell(
          onTap: onRemove,
          child: Container(
            width: 18, height: 18,
            decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
            child: const Icon(Icons.close, size: 12, color: Colors.white),
          ),
        ),
      ),
    ]);
  }
}
